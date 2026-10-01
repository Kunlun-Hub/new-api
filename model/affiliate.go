package model

import (
	"github.com/QuantumNous/new-api/common"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// 邀请奖励来源
const (
	AffiliateSourceRegister = "register"
	AffiliateSourceTopup    = "topup"
)

// AffiliateReward 记录一次邀请奖励的发放明细。
type AffiliateReward struct {
	Id              int     `json:"id" gorm:"primaryKey;autoIncrement"`
	InviterId       int     `json:"inviter_id" gorm:"not null;index:idx_affiliate_reward_inviter"`
	InviteeId       int     `json:"invitee_id" gorm:"not null;default:0;index:idx_affiliate_reward_invitee"`
	InviteeUsername string  `json:"invitee_username" gorm:"type:varchar(64);not null;default:''"`
	Source          string  `json:"source" gorm:"type:varchar(16);not null;default:'register'"`
	TopupAmount     float64 `json:"topup_amount"`
	RewardQuota     int     `json:"reward_quota"`
	CreatedAt       int64   `json:"created_at" gorm:"bigint"`
}

func (AffiliateReward) TableName() string {
	return "affiliate_rewards"
}

// AffiliateTransfer 记录邀请额度转入余额的提现明细。
type AffiliateTransfer struct {
	Id        int   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int   `json:"user_id" gorm:"not null;index:idx_affiliate_transfer_user"`
	Quota     int   `json:"quota"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
}

func (AffiliateTransfer) TableName() string {
	return "affiliate_transfers"
}

// CreateAffiliateReward 记录一次邀请奖励发放，失败不影响主流程。
func CreateAffiliateReward(tx *gorm.DB, reward *AffiliateReward) error {
	if reward.CreatedAt == 0 {
		reward.CreatedAt = nowUnix()
	}
	return tx.Create(reward).Error
}

// GetAffiliateRewards 分页返回用户的邀请奖励明细。
func GetAffiliateRewards(userId int, pageInfo *common.PageInfo) ([]AffiliateReward, int64, error) {
	var rewards []AffiliateReward
	var total int64
	query := DB.Model(&AffiliateReward{}).Where("inviter_id = ?", userId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("id DESC").Offset(pageInfo.GetStartIdx()).Limit(pageInfo.GetPageSize()).Find(&rewards).Error
	return rewards, total, err
}

// GetAffiliateTransfers 分页返回用户的邀请额度提现明细。
func GetAffiliateTransfers(userId int, pageInfo *common.PageInfo) ([]AffiliateTransfer, int64, error) {
	var transfers []AffiliateTransfer
	var total int64
	query := DB.Model(&AffiliateTransfer{}).Where("user_id = ?", userId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("id DESC").Offset(pageInfo.GetStartIdx()).Limit(pageInfo.GetPageSize()).Find(&transfers).Error
	return transfers, total, err
}

// AffiliateTopupRewardEnabled 报告充值返佣是否已配置。
func AffiliateTopupRewardEnabled() bool {
	return common.AffiliateTopupRewardPercent > 0 && common.AffiliateTopupRewardTimes > 0
}

// ApplyAffiliateTopupReward 在被邀请人充值成功后，按配置比例向前 N 次充值发放邀请奖励。
// 调用方需保证本次充值已计入成功订单，函数按实际成功订单数判断次数上限。
func ApplyAffiliateTopupReward(tx *gorm.DB, inviteeId int, creditedQuota int) error {
	if !AffiliateTopupRewardEnabled() || creditedQuota <= 0 {
		return nil
	}
	var invitee User
	if err := tx.Select("id", "inviter_id", "username").
		Where("id = ?", inviteeId).
		First(&invitee).Error; err != nil {
		return err
	}
	if invitee.InviterId == 0 {
		return nil
	}
	var successCount int64
	if err := tx.Model(&TopUp{}).
		Where("user_id = ? AND status = ?", inviteeId, common.TopUpStatusSuccess).
		Count(&successCount).Error; err != nil {
		return err
	}
	if successCount > int64(common.AffiliateTopupRewardTimes) {
		return nil
	}
	rewardQuota := common.QuotaFromDecimal(
		decimal.NewFromInt(int64(creditedQuota)).
			Mul(decimal.NewFromFloat(common.AffiliateTopupRewardPercent)),
	)
	if rewardQuota <= 0 {
		return nil
	}
	if err := tx.Model(&User{}).
		Where("id = ?", invitee.InviterId).
		Updates(map[string]any{
			"aff_quota":   gorm.Expr("aff_quota + ?", rewardQuota),
			"aff_history": gorm.Expr("aff_history + ?", rewardQuota),
		}).Error; err != nil {
		return err
	}
	return CreateAffiliateReward(tx, &AffiliateReward{
		InviterId:       invitee.InviterId,
		InviteeId:       inviteeId,
		InviteeUsername: invitee.Username,
		Source:          AffiliateSourceTopup,
		TopupAmount:     float64(creditedQuota) / common.QuotaPerUnit,
		RewardQuota:     rewardQuota,
	})
}

// GetAffiliateRewardsForAdmin 分页返回全部邀请奖励明细（管理员）。
func GetAffiliateRewardsForAdmin(pageInfo *common.PageInfo) ([]AffiliateReward, int64, error) {
	var rewards []AffiliateReward
	var total int64
	if err := DB.Model(&AffiliateReward{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := DB.Model(&AffiliateReward{}).
		Order("id DESC").
		Offset(pageInfo.GetStartIdx()).
		Limit(pageInfo.GetPageSize()).
		Find(&rewards).Error
	return rewards, total, err
}

// GetUserNamesByIds 批量查询用户名，用于管理端列表展示。
func GetUserNamesByIds(ids []int) (map[int]string, error) {
	names := make(map[int]string, len(ids))
	if len(ids) == 0 {
		return names, nil
	}
	var users []User
	if err := DB.Model(&User{}).
		Select("id", "username").
		Where("id IN ?", ids).
		Find(&users).Error; err != nil {
		return nil, err
	}
	for _, user := range users {
		names[user.Id] = user.Username
	}
	return names, nil
}
