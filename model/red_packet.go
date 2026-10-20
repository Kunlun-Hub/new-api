package model

import (
	crand "crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// 红包额度类别
const (
	RedPacketTypeGift    = "gift"    // 礼赠金红包
	RedPacketTypeBalance = "balance" // 余额红包
)

// 红包分配方式
const (
	RedPacketDistributionRandom  = "random"
	RedPacketDistributionAverage = "average"
)

// 红包领取方式（决定落地页形态）
const (
	RedPacketClaimDirect = "direct" // 落地页可以直接领取
	RedPacketClaimCode   = "code"   // 落地页需要输入口令才能领取
)

// 红包状态（面向前端展示与筛选）
const (
	RedPacketStatusActive  = "active"
	RedPacketStatusSoldOut = "sold_out"
	RedPacketStatusExpired = "expired"
)

const (
	MaxRedPacketShares    = 1000
	MaxRedPacketDays      = 3650
	MaxRedPacketRemarkLen = 255
)

// redPacketCodeAlphabet 去掉了容易混淆的 0/O/1/I/L，便于用户手动输入口令。
const redPacketCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

const redPacketClaimCodeLength = 8

const redPacketLandingTokenBytes = 16

var (
	ErrRedPacketInvalidParams  = errors.New("invalid red packet parameters")
	ErrRedPacketNotClaimable   = errors.New("red packet is not claimable")
	ErrRedPacketAlreadyClaimed = errors.New("red packet already claimed")
	ErrRedPacketEmpty          = errors.New("red packet is empty")
	ErrRedPacketNotFound       = errors.New("red packet not found")
	ErrRedPacketInvalidCode    = errors.New("invalid red packet claim code")
)

// RedPacket 是一次可被多人领取的红包活动。
// ExpireDays 控制领取截止时间（0 表示领取活动与过期时间都不设限）；
// GiftExpireDays 控制礼赠金红包领取到的额度在领取后多少天过期
// （0 表示永不过期），对余额红包无效。
type RedPacket struct {
	Id   int    `json:"id"`
	Type string `json:"type" gorm:"type:varchar(16);index"`
	// ClaimMode 决定落地页形态：direct 直接领取，code 需要输入口令。
	ClaimMode string `json:"claim_mode" gorm:"type:varchar(16);default:'direct'"`
	// ClaimCode 是口令红包的领取口令，direct 模式为空；仅管理员接口会返回。
	ClaimCode string `json:"claim_code" gorm:"type:varchar(16);default:''"`
	// LandingToken 是红包落地页地址中的随机令牌（128 位随机，不可枚举）。
	LandingToken   string `json:"landing_token" gorm:"type:varchar(32);index;default:''"`
	TotalQuota     int    `json:"total_quota" gorm:"default:0"`
	ShareCount     int    `json:"share_count" gorm:"default:0"`
	ClaimedCount   int    `json:"claimed_count" gorm:"default:0"`
	Distribution   string `json:"distribution" gorm:"type:varchar(16);default:'random'"`
	ExpireDays     int    `json:"expire_days" gorm:"default:0"`
	GiftExpireDays int    `json:"gift_expire_days" gorm:"default:0"`
	Remark         string `json:"remark" gorm:"type:varchar(255);default:''"`
	CreatorId      int    `json:"creator_id" gorm:"index;default:0"`
	CreatorName    string `json:"creator_name" gorm:"type:varchar(64);default:''"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint;index"`
	ExpiresAt      int64  `json:"expires_at" gorm:"bigint;index;default:0"`
}

// RedPacketShare 是预先生成的单份红包金额，拼手气按随机权重拆分，
// 平均分配时余数依次补给前几份，保证每份金额之和等于总额。
type RedPacketShare struct {
	Id          int   `json:"id"`
	PacketId    int   `json:"packet_id" gorm:"index:idx_red_packet_share,priority:1"`
	ShareIndex  int   `json:"share_index" gorm:"index:idx_red_packet_share,priority:2"`
	Quota       int   `json:"quota" gorm:"default:0"`
	ClaimUserId int   `json:"claim_user_id" gorm:"index;default:0"`
	ClaimedAt   int64 `json:"claimed_at" gorm:"bigint;default:0"`
}

// RedPacketClaim 记录用户领取结果，唯一索引保证每个用户每个红包只能领取一次。
type RedPacketClaim struct {
	Id        int    `json:"id"`
	PacketId  int    `json:"packet_id" gorm:"uniqueIndex:uk_red_packet_claim,priority:1"`
	UserId    int    `json:"user_id" gorm:"uniqueIndex:uk_red_packet_claim,priority:2"`
	Username  string `json:"username" gorm:"type:varchar(64);default:''"`
	Quota     int    `json:"quota" gorm:"default:0"`
	ExpiresAt int64  `json:"expires_at" gorm:"bigint;default:0"`
	CreatedAt int64  `json:"created_at" gorm:"bigint"`
}

// ValidateRedPacketParams normalizes and validates admin supplied parameters.
func ValidateRedPacketParams(packet *RedPacket) error {
	if packet == nil {
		return ErrRedPacketInvalidParams
	}
	if packet.Type != RedPacketTypeGift && packet.Type != RedPacketTypeBalance {
		return ErrRedPacketInvalidParams
	}
	if packet.Distribution != RedPacketDistributionRandom && packet.Distribution != RedPacketDistributionAverage {
		return ErrRedPacketInvalidParams
	}
	if packet.ClaimMode == "" {
		// Requests from older clients carry no claim mode; keep the landing page
		// usable by defaulting them to the direct claim flow.
		packet.ClaimMode = RedPacketClaimDirect
	}
	if packet.ClaimMode != RedPacketClaimDirect && packet.ClaimMode != RedPacketClaimCode {
		return ErrRedPacketInvalidParams
	}
	if packet.ClaimMode == RedPacketClaimDirect {
		packet.ClaimCode = ""
	}
	if packet.ShareCount < 1 || packet.ShareCount > MaxRedPacketShares {
		return ErrRedPacketInvalidParams
	}
	if packet.TotalQuota < packet.ShareCount || packet.TotalQuota > common.MaxWalletQuota {
		return ErrRedPacketInvalidParams
	}
	if packet.ExpireDays < 0 || packet.ExpireDays > MaxRedPacketDays {
		return ErrRedPacketInvalidParams
	}
	if packet.Type == RedPacketTypeBalance {
		packet.GiftExpireDays = 0
	}
	if packet.GiftExpireDays < 0 || packet.GiftExpireDays > MaxRedPacketDays {
		return ErrRedPacketInvalidParams
	}
	packet.Remark = strings.TrimSpace(packet.Remark)
	if len([]rune(packet.Remark)) > MaxRedPacketRemarkLen {
		return ErrRedPacketInvalidParams
	}
	return nil
}

// splitRedPacketQuota splits total into count positive integer shares.
func splitRedPacketQuota(total int, count int, random bool) []int {
	shares := make([]int, count)
	if random {
		weights := make([]float64, count)
		sum := 0.0
		for i := range weights {
			weights[i] = rand.Float64() + 0.2
			sum += weights[i]
		}
		remaining := total
		for i := range shares {
			if i == count-1 {
				shares[i] = remaining
				break
			}
			share := int(float64(total) * weights[i] / sum)
			share = min(max(share, 1), remaining-(count-i-1))
			shares[i] = share
			remaining -= share
		}
		return shares
	}
	base := total / count
	remainder := total - base*count
	for i := range shares {
		shares[i] = base
		if i < remainder {
			shares[i]++
		}
	}
	return shares
}

// randomRedPacketSecret returns cryptographically random bytes; the math/rand
// fallback only exists so issuing a packet never fails outright.
func randomRedPacketSecret(size int) []byte {
	buf := make([]byte, size)
	if _, err := crand.Read(buf); err == nil {
		return buf
	} else {
		common.SysError("crypto/rand failed while issuing a red packet: " + err.Error())
	}
	fallback := rand.New(rand.NewSource(time.Now().UnixNano()))
	_, _ = fallback.Read(buf)
	return buf
}

// newRedPacketLandingToken returns the unguessable token used by the landing URL.
func newRedPacketLandingToken() string {
	return base64.RawURLEncoding.EncodeToString(randomRedPacketSecret(redPacketLandingTokenBytes))
}

// newRedPacketClaimCode returns a human friendly claim code; 256 is divisible
// by the alphabet length so the modulo mapping stays uniform.
func newRedPacketClaimCode() string {
	secret := randomRedPacketSecret(redPacketClaimCodeLength)
	var builder strings.Builder
	builder.Grow(redPacketClaimCodeLength)
	for _, value := range secret {
		builder.WriteByte(redPacketCodeAlphabet[int(value)%len(redPacketCodeAlphabet)])
	}
	return builder.String()
}

// verifyRedPacketClaimCode compares codes case-insensitively in constant time.
func verifyRedPacketClaimCode(expected string, provided string) bool {
	expected = strings.ToUpper(strings.TrimSpace(expected))
	provided = strings.ToUpper(strings.TrimSpace(provided))
	if expected == "" || provided == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(expected), []byte(provided)) == 1
}

// RedPacketCurrentStatus reports the packet state independent of any viewer.
func RedPacketCurrentStatus(packet *RedPacket, now int64) string {
	if packet == nil {
		return RedPacketStatusExpired
	}
	if packet.ClaimedCount >= packet.ShareCount {
		return RedPacketStatusSoldOut
	}
	if packet.ExpiresAt != 0 && packet.ExpiresAt <= now {
		return RedPacketStatusExpired
	}
	return RedPacketStatusActive
}

// CreateRedPacket persists the packet together with its pre-generated shares.
func CreateRedPacket(packet *RedPacket) error {
	if err := ValidateRedPacketParams(packet); err != nil {
		return err
	}
	now := common.GetTimestamp()
	packet.CreatedAt = now
	packet.LandingToken = newRedPacketLandingToken()
	if packet.ClaimMode == RedPacketClaimCode {
		packet.ClaimCode = newRedPacketClaimCode()
	}
	if packet.ExpireDays > 0 {
		packet.ExpiresAt = now + int64(packet.ExpireDays)*86400
	} else {
		packet.ExpiresAt = 0
	}
	shares := splitRedPacketQuota(packet.TotalQuota, packet.ShareCount, packet.Distribution == RedPacketDistributionRandom)
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(packet).Error; err != nil {
			return err
		}
		records := make([]RedPacketShare, 0, len(shares))
		for index, quota := range shares {
			records = append(records, RedPacketShare{PacketId: packet.Id, ShareIndex: index, Quota: quota})
		}
		return tx.Create(&records).Error
	})
}

// GetRedPackets returns packets ordered by creation time, newest first.
func GetRedPackets(limit int) ([]*RedPacket, error) {
	var packets []*RedPacket
	query := DB.Model(&RedPacket{}).Order("id DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&packets).Error
	return packets, err
}

// GetRedPacketById returns a single packet.
func GetRedPacketById(id int) (*RedPacket, error) {
	if id <= 0 {
		return nil, ErrRedPacketNotFound
	}
	var packet RedPacket
	if err := DB.First(&packet, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRedPacketNotFound
		}
		return nil, err
	}
	return &packet, nil
}

// GetRedPacketClaims returns the claims of one packet for admin inspection.
func GetRedPacketClaims(packetId int) ([]*RedPacketClaim, error) {
	var claims []*RedPacketClaim
	err := DB.Model(&RedPacketClaim{}).Where("packet_id = ?", packetId).Order("id ASC").Find(&claims).Error
	return claims, err
}

// GetRedPacketByLandingToken resolves the public landing URL token.
func GetRedPacketByLandingToken(token string) (*RedPacket, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, ErrRedPacketNotFound
	}
	var packet RedPacket
	if err := DB.Where("landing_token = ?", token).First(&packet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRedPacketNotFound
		}
		return nil, err
	}
	return &packet, nil
}

// GetRedPacketClaimedAmounts returns the total claimed quota per packet, used by
// the admin list and detail views.
func GetRedPacketClaimedAmounts(packetIds []int) (map[int]int, error) {
	result := make(map[int]int)
	if len(packetIds) == 0 {
		return result, nil
	}
	type packetAmount struct {
		PacketId      int
		ClaimedAmount int
	}
	var rows []packetAmount
	err := DB.Model(&RedPacketClaim{}).
		Select("packet_id, SUM(quota) AS claimed_amount").
		Where("packet_id IN ?", packetIds).
		Group("packet_id").
		Scan(&rows).Error
	if err != nil {
		return result, err
	}
	for _, row := range rows {
		result[row.PacketId] = row.ClaimedAmount
	}
	return result, nil
}

// GetUserRedPacketClaim returns the caller's claim of one packet, or (nil, nil)
// when the packet has not been claimed yet.
func GetUserRedPacketClaim(packetId int, userId int) (*RedPacketClaim, error) {
	if packetId <= 0 || userId <= 0 {
		return nil, nil
	}
	var claim RedPacketClaim
	err := DB.Where("packet_id = ? AND user_id = ?", packetId, userId).First(&claim).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &claim, nil
}

// RedPacketUserClaim is one claim row joined with its packet summary, used by
// the user-facing claim records page.
type RedPacketUserClaim struct {
	Id              int    `json:"id"`
	PacketId        int    `json:"packet_id"`
	Quota           int    `json:"quota"`
	ExpiresAt       int64  `json:"expires_at"`
	CreatedAt       int64  `json:"created_at"`
	Remark          string `json:"remark"`
	Type            string `json:"type"`
	ClaimMode       string `json:"claim_mode"`
	CreatorName     string `json:"creator_name"`
	ShareCount      int    `json:"share_count"`
	ClaimedCount    int    `json:"claimed_count"`
	PacketExpiresAt int64  `json:"packet_expires_at"`
}

// GetUserRedPacketClaimsDetailed lists the caller's claim records newest first.
func GetUserRedPacketClaimsDetailed(userId int) ([]*RedPacketUserClaim, error) {
	claims := make([]*RedPacketUserClaim, 0)
	if userId <= 0 {
		return claims, nil
	}
	err := DB.Table("red_packet_claims").
		Select("red_packet_claims.id, red_packet_claims.packet_id, red_packet_claims.quota, "+
			"red_packet_claims.expires_at, red_packet_claims.created_at, red_packets.remark, "+
			"red_packets.type, red_packets.claim_mode, red_packets.creator_name, red_packets.share_count, "+
			"red_packets.claimed_count, red_packets.expires_at AS packet_expires_at").
		Joins("LEFT JOIN red_packets ON red_packets.id = red_packet_claims.packet_id").
		Where("red_packet_claims.user_id = ?", userId).
		Order("red_packet_claims.id DESC").
		Limit(200).
		Scan(&claims).Error
	return claims, err
}

// BackfillRedPacketLandingTokens upgrades packets issued before landing pages
// existed: they receive a token and the direct claim mode so their landing URL
// keeps working after the console list stops exposing claimable packets.
func BackfillRedPacketLandingTokens() {
	var packets []*RedPacket
	err := DB.Select("id", "landing_token", "claim_mode").
		Where("landing_token = ? OR claim_mode = ?", "", "").
		Find(&packets).Error
	if err != nil {
		common.SysError("failed to load red packets for landing token backfill: " + err.Error())
		return
	}
	for _, packet := range packets {
		updates := make(map[string]any, 2)
		if packet.LandingToken == "" {
			updates["landing_token"] = newRedPacketLandingToken()
		}
		if packet.ClaimMode == "" {
			updates["claim_mode"] = RedPacketClaimDirect
		}
		if len(updates) == 0 {
			continue
		}
		if err := DB.Model(&RedPacket{}).Where("id = ?", packet.Id).Updates(updates).Error; err != nil {
			common.SysError(fmt.Sprintf("failed to backfill red packet %d: %s", packet.Id, err.Error()))
		}
	}
}

// DeleteRedPacket removes a packet and everything it generated.
func DeleteRedPacket(id int) error {
	if id <= 0 {
		return ErrRedPacketNotFound
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Where("id = ?", id).Delete(&RedPacket{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrRedPacketNotFound
		}
		if err := tx.Where("packet_id = ?", id).Delete(&RedPacketShare{}).Error; err != nil {
			return err
		}
		return tx.Where("packet_id = ?", id).Delete(&RedPacketClaim{}).Error
	})
}

// ClaimRedPacket grants one share of a packet to the user.
func ClaimRedPacket(packetId, userId int, username string) (*RedPacketClaim, error) {
	return claimRedPacket(packetId, userId, username, "")
}

// ClaimRedPacketByToken resolves the landing token and claims through the
// landing page. Code packets only accept the matching claim code.
func ClaimRedPacketByToken(token string, userId int, username string, code string) (*RedPacketClaim, error) {
	token = strings.TrimSpace(token)
	if token == "" || userId <= 0 {
		return nil, ErrRedPacketNotFound
	}
	var packet RedPacket
	if err := DB.Where("landing_token = ?", token).First(&packet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRedPacketNotFound
		}
		return nil, err
	}
	return claimRedPacket(packet.Id, userId, username, code)
}

// claimRedPacket is the shared claim path. The unique claim index, the per-share
// conditional update and the packet capacity check all run in one transaction so
// a packet can never be over-claimed, and code packets are validated before any
// claim state is exposed.
func claimRedPacket(packetId, userId int, username string, code string) (*RedPacketClaim, error) {
	if packetId <= 0 || userId <= 0 {
		return nil, ErrRedPacketInvalidParams
	}
	now := common.GetTimestamp()
	var claim RedPacketClaim
	packetType := ""
	err := DB.Transaction(func(tx *gorm.DB) error {
		var packet RedPacket
		if err := lockForUpdate(tx).First(&packet, packetId).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRedPacketNotFound
			}
			return err
		}
		if packet.ClaimMode == RedPacketClaimCode && !verifyRedPacketClaimCode(packet.ClaimCode, code) {
			return ErrRedPacketInvalidCode
		}
		if packet.ExpiresAt != 0 && packet.ExpiresAt <= now {
			return ErrRedPacketNotClaimable
		}
		if packet.ClaimedCount >= packet.ShareCount {
			return ErrRedPacketEmpty
		}
		packetType = packet.Type
		var existing RedPacketClaim
		err := tx.Where("packet_id = ? AND user_id = ?", packetId, userId).First(&existing).Error
		if err == nil {
			return ErrRedPacketAlreadyClaimed
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		var share RedPacketShare
		if err := lockForUpdate(tx).Where("packet_id = ? AND claimed_at = 0", packetId).Order("share_index ASC").First(&share).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRedPacketEmpty
			}
			return err
		}
		result := tx.Model(&RedPacketShare{}).
			Where("id = ? AND claimed_at = 0", share.Id).
			Updates(map[string]any{"claim_user_id": userId, "claimed_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrRedPacketEmpty
		}
		if err := grantRedPacketCreditInTx(tx, &packet, userId, share.Quota, now); err != nil {
			return err
		}
		claim = RedPacketClaim{
			PacketId:  packetId,
			UserId:    userId,
			Username:  username,
			Quota:     share.Quota,
			ExpiresAt: redPacketGrantExpiry(&packet, now),
			CreatedAt: now,
		}
		if err := tx.Create(&claim).Error; err != nil {
			if isDuplicateKeyError(err) {
				return ErrRedPacketAlreadyClaimed
			}
			return err
		}
		return tx.Model(&RedPacket{}).Where("id = ?", packetId).
			Update("claimed_count", gorm.Expr("claimed_count + 1")).Error
	})
	if err != nil {
		return nil, err
	}
	if claim.Quota > 0 && packetType == RedPacketTypeBalance {
		if err := cacheIncrUserQuota(userId, int64(claim.Quota)); err != nil {
			common.SysError(fmt.Sprintf("failed to sync red packet quota for user %d: %s", userId, err.Error()))
		}
	}
	return &claim, nil
}

// redPacketGrantExpiry returns the expire time of credit granted by this packet.
func redPacketGrantExpiry(packet *RedPacket, now int64) int64 {
	if packet.Type != RedPacketTypeGift || packet.GiftExpireDays <= 0 {
		return 0
	}
	return now + int64(packet.GiftExpireDays)*86400
}

// grantRedPacketCreditInTx credits the claimed share inside the claim transaction.
func grantRedPacketCreditInTx(tx *gorm.DB, packet *RedPacket, userId int, quota int, now int64) error {
	if quota <= 0 {
		return ErrRedPacketInvalidParams
	}
	switch packet.Type {
	case RedPacketTypeBalance:
		return tx.Model(&User{}).Where("id = ?", userId).
			Update("quota", gorm.Expr("quota + ?", quota)).Error
	case RedPacketTypeGift:
		var user User
		if err := lockForUpdate(tx).Select("id", "gift_quota", "gift_quota_expired_at").First(&user, userId).Error; err != nil {
			return err
		}
		current, currentExpiry := user.GiftQuota, user.GiftQuotaExpiredAt
		if UserGiftQuotaExpired(currentExpiry, now) {
			current, currentExpiry = 0, 0
		}
		if current > common.MaxWalletQuota-quota {
			return ErrWalletQuotaLimitExceeded
		}
		after := current + quota
		return tx.Model(&User{}).Where("id = ?", userId).Updates(map[string]any{
			"gift_quota":            after,
			"gift_quota_expired_at": clampGiftQuotaExpiry(after, mergeGiftQuotaExpiry(current, currentExpiry, redPacketGrantExpiry(packet, now))),
		}).Error
	default:
		return ErrRedPacketInvalidParams
	}
}

// isDuplicateKeyError reports whether err is a unique constraint violation on
// any supported database.
func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "unique constraint") ||
		strings.Contains(message, "duplicate entry") ||
		strings.Contains(message, "unique failed")
}
