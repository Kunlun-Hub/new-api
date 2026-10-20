package model

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

var (
	ErrInvalidUserGiftQuotaAdjustment = errors.New("invalid user gift quota adjustment")
	ErrUserGiftQuotaPermission        = errors.New("cannot adjust gift quota for this user role")
	ErrUserGiftQuotaExpireInvalid     = errors.New("gift quota expire time must be in the future")
)

// UserGiftQuotaAdjustment is the immutable database snapshot of a committed
// manual gift quota adjustment.
type UserGiftQuotaAdjustment struct {
	UserID    int
	Username  string
	Before    int
	After     int
	ExpiredAt int64
}

// NormalizeUserGiftQuota treats an expired pool as empty in memory so every
// reader (API responses, admin previews) sees one consistent balance.
func NormalizeUserGiftQuota(user *User) {
	if user == nil {
		return
	}
	if UserGiftQuotaExpired(user.GiftQuotaExpiredAt, common.GetTimestamp()) {
		user.GiftQuota = 0
		user.GiftQuotaExpiredAt = 0
	}
}

// UserGiftQuotaExpired reports whether a gift quota pool is no longer valid.
// A zero expire time means the pool never expires.
func UserGiftQuotaExpired(expiredAt int64, now int64) bool {
	return expiredAt != 0 && expiredAt <= now
}

// mergeGiftQuotaExpiry keeps the later validity window when credit is added to
// an existing pool. A zero expire time means "never expires" and wins over any
// dated grant; an empty pool takes the incoming window as-is.
func mergeGiftQuotaExpiry(currentQuota int, currentExpiry, next int64) int64 {
	if currentQuota <= 0 {
		return next
	}
	if currentExpiry == 0 || next == 0 {
		return 0
	}
	if next > currentExpiry {
		return next
	}
	return currentExpiry
}

func clampGiftQuotaExpiry(quota int, expiredAt int64) int64 {
	if quota <= 0 {
		return 0
	}
	return expiredAt
}

// GetUserGiftQuota returns the effective gift quota balance (expired pools read
// as zero) straight from the database. Gift quota is intentionally not cached
// in Redis so every instance observes one authoritative conditional update.
func GetUserGiftQuota(id int) (int, error) {
	quota, _, err := GetUserGiftQuotaDetail(id)
	return quota, err
}

// GetUserGiftQuotaDetail returns the effective balance and its expire time.
func GetUserGiftQuotaDetail(id int) (int, int64, error) {
	var user User
	err := DB.Select("gift_quota", "gift_quota_expired_at").First(&user, id).Error
	if err != nil {
		return 0, 0, err
	}
	if UserGiftQuotaExpired(user.GiftQuotaExpiredAt, common.GetTimestamp()) {
		return 0, 0, nil
	}
	if err := common.ValidateWalletQuota(user.GiftQuota); err != nil {
		common.SysError(fmt.Sprintf("user %d gift quota exceeds wallet limit: %s", id, err.Error()))
	}
	return user.GiftQuota, user.GiftQuotaExpiredAt, nil
}

// TryReserveUserGiftQuota atomically deducts up to amount from the gift quota
// pool and returns how much was actually taken. The read-then-conditional-update
// pair is a compare-and-swap that stays portable across SQLite, MySQL and
// PostgreSQL; a lost race simply retries, and a persistent one takes nothing so
// the caller falls back to the regular wallet balance.
func TryReserveUserGiftQuota(id int, amount int) (int, error) {
	if amount <= 0 {
		return 0, nil
	}
	now := common.GetTimestamp()
	for range 3 {
		var user User
		if err := DB.Select("gift_quota", "gift_quota_expired_at").First(&user, id).Error; err != nil {
			return 0, err
		}
		if user.GiftQuota <= 0 || UserGiftQuotaExpired(user.GiftQuotaExpiredAt, now) {
			return 0, nil
		}
		reserve := min(amount, user.GiftQuota)
		result := DB.Model(&User{}).
			Where("id = ? AND gift_quota = ? AND (gift_quota_expired_at = 0 OR gift_quota_expired_at > ?)", id, user.GiftQuota, now).
			Update("gift_quota", gorm.Expr("gift_quota - ?", reserve))
		if result.Error != nil {
			return 0, result.Error
		}
		if result.RowsAffected == 1 {
			return reserve, nil
		}
	}
	return 0, nil
}

// IncreaseUserGiftQuota adds credit back to the pool without touching the
// expire time. Used for reservation refunds and settlement rollbacks.
func IncreaseUserGiftQuota(id int, amount int) error {
	if amount <= 0 {
		return nil
	}
	if amount > common.MaxWalletQuota {
		return ErrWalletQuotaLimitExceeded
	}
	result := DB.Model(&User{}).
		Where("id = ? AND gift_quota <= ?", id, common.MaxWalletQuota-amount).
		Update("gift_quota", gorm.Expr("gift_quota + ?", amount))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// AddUserGiftQuotaExpiring grants credit that carries an expire time; the
// resulting pool keeps the later of the two validity windows.
func AddUserGiftQuotaExpiring(id int, amount int, expiredAt int64) error {
	if id <= 0 || amount <= 0 || amount > common.MaxWalletQuota || expiredAt < 0 {
		return ErrInvalidUserGiftQuotaAdjustment
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := lockForUpdate(tx).Select("id", "gift_quota", "gift_quota_expired_at").First(&user, id).Error; err != nil {
			return err
		}
		now := common.GetTimestamp()
		current := user.GiftQuota
		currentExpiry := user.GiftQuotaExpiredAt
		if UserGiftQuotaExpired(currentExpiry, now) {
			current, currentExpiry = 0, 0
		}
		if current > common.MaxWalletQuota-amount {
			return ErrWalletQuotaLimitExceeded
		}
		after := current + amount
		return tx.Model(&User{}).Where("id = ?", id).Updates(map[string]any{
			"gift_quota":            after,
			"gift_quota_expired_at": clampGiftQuotaExpiry(after, mergeGiftQuotaExpiry(current, currentExpiry, expiredAt)),
		}).Error
	})
}

// AdjustUserGiftQuota performs an admin add / subtract / override on the gift
// quota pool, optionally updating the expire time.
func AdjustUserGiftQuota(userID, operatorRole int, mode string, value int, expiredAt int64) (*UserGiftQuotaAdjustment, error) {
	if userID <= 0 || (mode != "add" && mode != "subtract" && mode != "override") {
		return nil, ErrInvalidUserGiftQuotaAdjustment
	}
	if mode != "override" && value <= 0 {
		return nil, ErrInvalidUserGiftQuotaAdjustment
	}
	if value > common.MaxWalletQuota || value < -common.MaxWalletQuota {
		return nil, ErrWalletQuotaLimitExceeded
	}
	if expiredAt < 0 {
		return nil, ErrInvalidUserGiftQuotaAdjustment
	}
	if expiredAt != 0 && expiredAt <= common.GetTimestamp() {
		return nil, ErrUserGiftQuotaExpireInvalid
	}

	var adjustment UserGiftQuotaAdjustment
	err := DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := lockForUpdate(tx).Select("id", "username", "role", "gift_quota", "gift_quota_expired_at").First(&user, userID).Error; err != nil {
			return err
		}
		if operatorRole != common.RoleRootUser && operatorRole <= user.Role {
			return ErrUserGiftQuotaPermission
		}
		now := common.GetTimestamp()
		current := user.GiftQuota
		currentExpiry := user.GiftQuotaExpiredAt
		if UserGiftQuotaExpired(currentExpiry, now) {
			current, currentExpiry = 0, 0
		}
		after := current
		nextExpiry := currentExpiry
		switch mode {
		case "add":
			if current > common.MaxWalletQuota-value {
				return ErrWalletQuotaLimitExceeded
			}
			after = current + value
			nextExpiry = mergeGiftQuotaExpiry(current, currentExpiry, expiredAt)
		case "subtract":
			after = max(0, current-value)
		case "override":
			after = value
			nextExpiry = expiredAt
		}
		if err := common.ValidateWalletQuota(after); err != nil {
			return ErrWalletQuotaLimitExceeded
		}
		nextExpiry = clampGiftQuotaExpiry(after, nextExpiry)
		if after != user.GiftQuota || nextExpiry != user.GiftQuotaExpiredAt {
			result := tx.Model(&User{}).Where("id = ?", userID).Updates(map[string]any{
				"gift_quota":            after,
				"gift_quota_expired_at": nextExpiry,
			})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return gorm.ErrRecordNotFound
			}
		}
		adjustment = UserGiftQuotaAdjustment{UserID: user.Id, Username: user.Username, Before: current, After: after, ExpiredAt: nextExpiry}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &adjustment, nil
}

// UpdateUserGiftUsedQuota accumulates lifetime gift quota consumption.
func UpdateUserGiftUsedQuota(id int, quota int) {
	if id <= 0 || quota == 0 {
		return
	}
	err := DB.Model(&User{}).Where("id = ?", id).
		Update("gift_used_quota", gorm.Expr("gift_used_quota + ?", quota)).Error
	if err != nil {
		common.SysError(fmt.Sprintf("failed to update user gift used quota: %v", err))
	}
}
