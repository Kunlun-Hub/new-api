package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// 邀请收益提现审核状态
const (
	WithdrawalStatusPending    = 0
	WithdrawalStatusPaid       = 1
	WithdrawalStatusProcessing = 2
	WithdrawalStatusRejected   = 3
)

var (
	ErrWithdrawalDisabled       = errors.New("withdrawal is disabled")
	ErrWithdrawalAmountInvalid  = errors.New("invalid withdrawal amount")
	ErrWithdrawalInsufficient   = errors.New("insufficient affiliate quota")
	ErrWithdrawalNotFound       = errors.New("withdrawal not found")
	ErrWithdrawalStatusInvalid  = errors.New("invalid withdrawal status")
	ErrWithdrawalAlreadyHandled = errors.New("withdrawal already handled")
)

// Withdrawal 记录一笔邀请收益提现申请。额度在申请时从 aff_quota 预扣，
// 审核拒绝时按 QuotaHeld 原样返还。
type Withdrawal struct {
	Id         int     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId     int     `json:"user_id" gorm:"not null;index:idx_withdrawal_user"`
	Amount     float64 `json:"amount"`
	AmountCny  float64 `json:"amount_cny"`
	QuotaHeld  int     `json:"quota"`
	RealName   string  `json:"real_name" gorm:"type:varchar(64);not null;default:''"`
	Account    string  `json:"account" gorm:"type:varchar(128);not null;default:''"`
	Status     int     `json:"status" gorm:"not null;default:0"`
	CreateTime int64   `json:"create_time" gorm:"bigint"`
	UpdateTime int64   `json:"update_time" gorm:"bigint"`
}

func (Withdrawal) TableName() string {
	return "withdrawals"
}

// WithdrawalQuotaFromAmount 将美元提现额度换算为内部额度，并做 JS 安全边界校验。
func WithdrawalQuotaFromAmount(amount float64) (int, error) {
	if amount <= 0 {
		return 0, ErrWithdrawalAmountInvalid
	}
	quota, err := common.WalletQuotaFromDecimalStrict(
		decimal.NewFromFloat(amount).Mul(decimal.NewFromFloat(common.QuotaPerUnit)),
	)
	if err != nil || quota <= 0 {
		return 0, ErrWithdrawalAmountInvalid
	}
	return quota, nil
}

// ApplyWithdrawal 预扣邀请收益并创建提现申请。
func ApplyWithdrawal(userId int, amount float64, realName string, account string) (*Withdrawal, error) {
	if !common.WithdrawalEnabled {
		return nil, ErrWithdrawalDisabled
	}
	if realName == "" || account == "" {
		return nil, ErrWithdrawalAmountInvalid
	}
	quotaHeld, err := WithdrawalQuotaFromAmount(amount)
	if err != nil {
		return nil, err
	}
	if common.WithdrawalMinQuota > 0 && quotaHeld < common.WithdrawalMinQuota {
		return nil, ErrWithdrawalAmountInvalid
	}

	withdrawal := &Withdrawal{
		UserId:    userId,
		Amount:    amount,
		AmountCny: amount * common.WithdrawalRatio,
		QuotaHeld: quotaHeld,
		RealName:  realName,
		Account:   account,
		Status:    WithdrawalStatusPending,
	}
	err = DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := lockForUpdate(tx).Where("id = ?", userId).First(&user).Error; err != nil {
			return err
		}
		if user.AffQuota < quotaHeld {
			return ErrWithdrawalInsufficient
		}
		result := tx.Model(&User{}).
			Where("id = ? AND aff_quota >= ?", userId, quotaHeld).
			Update("aff_quota", gorm.Expr("aff_quota - ?", quotaHeld))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrWithdrawalInsufficient
		}
		now := common.GetTimestamp()
		withdrawal.CreateTime = now
		withdrawal.UpdateTime = now
		return tx.Create(withdrawal).Error
	})
	if err != nil {
		return nil, err
	}
	return withdrawal, nil
}

// GetWithdrawals 分页返回提现申请；userId 为 0 时返回全部（管理员）。
func GetWithdrawals(userId int, pageInfo *common.PageInfo) ([]Withdrawal, int64, error) {
	var withdrawals []Withdrawal
	var total int64
	query := DB.Model(&Withdrawal{})
	if userId > 0 {
		query = query.Where("user_id = ?", userId)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("id DESC").
		Offset(pageInfo.GetStartIdx()).
		Limit(pageInfo.GetPageSize()).
		Find(&withdrawals).Error
	return withdrawals, total, err
}

// UpdateWithdrawalStatus 更新提现状态；拒绝时返还预扣额度。
func UpdateWithdrawalStatus(id int, status int) error {
	if status != WithdrawalStatusPending && status != WithdrawalStatusPaid &&
		status != WithdrawalStatusProcessing && status != WithdrawalStatusRejected {
		return ErrWithdrawalStatusInvalid
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var withdrawal Withdrawal
		if err := lockForUpdate(tx).Where("id = ?", id).First(&withdrawal).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrWithdrawalNotFound
			}
			return err
		}
		if withdrawal.Status == status {
			return nil
		}
		if withdrawal.Status == WithdrawalStatusRejected {
			return ErrWithdrawalAlreadyHandled
		}
		if status == WithdrawalStatusRejected {
			// 仅未打款的申请可拒绝并返还预扣额度。
			if withdrawal.Status != WithdrawalStatusPending &&
				withdrawal.Status != WithdrawalStatusProcessing {
				return ErrWithdrawalStatusInvalid
			}
			if err := tx.Model(&User{}).
				Where("id = ?", withdrawal.UserId).
				Update("aff_quota", gorm.Expr("aff_quota + ?", withdrawal.QuotaHeld)).Error; err != nil {
				return err
			}
		}
		return tx.Model(&Withdrawal{}).
			Where("id = ?", id).
			Updates(map[string]any{
				"status":      status,
				"update_time": common.GetTimestamp(),
			}).Error
	})
}
