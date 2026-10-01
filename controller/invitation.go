package controller

import (
	"math"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type inviteStatusResponse struct {
	AccountQuota    int                  `json:"account_quota"`
	AffCode         string               `json:"aff_code"`
	AffCount        int                  `json:"aff_count"`
	AffHistoryQuota int                  `json:"aff_history_quota"`
	AffQuota        int                  `json:"aff_quota"`
	InviterId       int                  `json:"inviter_id"`
	Eligibility     inviteEligibility    `json:"eligibility"`
	Rewards         inviteRewardConfig   `json:"rewards"`
	Withdrawal      inviteWithdrawalConf `json:"withdrawal"`
}

type inviteEligibility struct {
	Eligible         bool `json:"eligible"`
	HasValidTopup    bool `json:"has_valid_topup"`
	MinUsedQuota     int  `json:"min_used_quota"`
	CurrentUsedQuota int  `json:"current_used_quota"`
	UsedQuotaMet     bool `json:"used_quota_met"`
	MinInvites       int  `json:"min_invites"`
}

type inviteRewardConfig struct {
	InviteeRewardQuota     int     `json:"invitee_reward_quota"`
	TopupRewardPercentage  float64 `json:"topup_reward_percentage"`
	TopupRewardTimes       int     `json:"topup_reward_times"`
	InviterRewardQuota     int     `json:"inviter_reward_quota"`
	UnlockRequiresTopup    bool    `json:"unlock_requires_topup"`
	UnlockMinConsumedQuota int     `json:"-"`
}

type inviteWithdrawalConf struct {
	Enabled  bool    `json:"enabled"`
	MinQuota int     `json:"min_quota"`
	Ratio    float64 `json:"ratio"`
}

// GetInviteStatus 返回邀请计划页所需的真实聚合数据。
func GetInviteStatus(c *gin.Context) {
	user, err := model.GetUserById(c.GetInt("id"), true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.AffCode == "" {
		user.AffCode = common.GetRandomString(4)
		if err := user.Update(false); err != nil {
			common.ApiError(c, err)
			return
		}
	}
	hasValidTopup, err := model.HasSuccessfulTopUp(user.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	usedQuotaMet := common.InvitationUnlockMinConsumedQuota <= 0 ||
		user.UsedQuota >= common.InvitationUnlockMinConsumedQuota
	eligible := model.IsInvitationUnlocked(user)
	if common.InvitationUnlockEnabled && !hasValidTopup {
		eligible = false
	}
	common.ApiSuccess(c, inviteStatusResponse{
		AccountQuota:    user.Quota,
		AffCode:         user.AffCode,
		AffCount:        user.AffCount,
		AffHistoryQuota: user.AffHistoryQuota,
		AffQuota:        user.AffQuota,
		InviterId:       user.InviterId,
		Eligibility: inviteEligibility{
			Eligible:         eligible,
			HasValidTopup:    hasValidTopup,
			MinUsedQuota:     common.InvitationUnlockMinConsumedQuota,
			CurrentUsedQuota: user.UsedQuota,
			UsedQuotaMet:     usedQuotaMet,
			MinInvites:       common.InvitationUnlockMinInvites,
		},
		Rewards: inviteRewardConfig{
			InviteeRewardQuota:     common.QuotaForInvitee,
			TopupRewardPercentage:  common.AffiliateTopupRewardPercent,
			TopupRewardTimes:       common.AffiliateTopupRewardTimes,
			InviterRewardQuota:     common.QuotaForInviter,
			UnlockRequiresTopup:    common.InvitationUnlockEnabled,
			UnlockMinConsumedQuota: common.InvitationUnlockMinConsumedQuota,
		},
		Withdrawal: inviteWithdrawalConf{
			Enabled:  common.WithdrawalEnabled,
			MinQuota: common.WithdrawalMinQuota,
			Ratio:    common.WithdrawalRatio,
		},
	})
}

type affiliateLogItem struct {
	Id           int     `json:"id"`
	CreateTime   int64   `json:"create_time"`
	UserId       int     `json:"user_id"`
	UserName     string  `json:"user_name"`
	InviteeId    int     `json:"invitee_id"`
	InviteeName  string  `json:"invitee_name"`
	InviteeQuota float64 `json:"invitee_quota"`
	RewardQuota  float64 `json:"reward_quota"`
	Status       int     `json:"status"`
	Source       string  `json:"source"`
	Content      string  `json:"content"`
}

func quotaToUsd(quota int) float64 {
	if common.QuotaPerUnit <= 0 {
		return 0
	}
	return math.Round(float64(quota)/common.QuotaPerUnit*100) / 100
}

func buildAffiliateLogItems(rewards []model.AffiliateReward) []affiliateLogItem {
	inviterIds := make([]int, 0, len(rewards))
	for _, reward := range rewards {
		inviterIds = append(inviterIds, reward.InviterId)
	}
	inviterNames, _ := model.GetUserNamesByIds(inviterIds)
	items := make([]affiliateLogItem, 0, len(rewards))
	for _, reward := range rewards {
		status := 0
		if reward.RewardQuota > 0 {
			status = 1
		}
		items = append(items, affiliateLogItem{
			Id:           reward.Id,
			CreateTime:   reward.CreatedAt,
			UserId:       reward.InviterId,
			UserName:     inviterNames[reward.InviterId],
			InviteeId:    reward.InviteeId,
			InviteeName:  reward.InviteeUsername,
			InviteeQuota: math.Round(reward.TopupAmount*100) / 100,
			RewardQuota:  quotaToUsd(reward.RewardQuota),
			Status:       status,
			Source:       reward.Source,
		})
	}
	return items
}

// GetAffiliateLogsSelf 返回当前用户的邀请奖励记录。
func GetAffiliateLogsSelf(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	rewards, total, err := model.GetAffiliateRewards(c.GetInt("id"), pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildAffiliateLogItems(rewards))
	common.ApiSuccess(c, pageInfo)
}

// GetAffiliateLogs 管理员查看全部邀请奖励记录。
func GetAffiliateLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	rewards, total, err := model.GetAffiliateRewardsForAdmin(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildAffiliateLogItems(rewards))
	common.ApiSuccess(c, pageInfo)
}

type applyWithdrawalRequest struct {
	Amount   float64 `json:"amount" binding:"required"`
	RealName string  `json:"real_name" binding:"required"`
	Account  string  `json:"account" binding:"required"`
}

// ApplyWithdrawal 申请提现邀请收益到支付宝。
func ApplyWithdrawal(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}
	if !common.WithdrawalEnabled {
		common.ApiErrorMsg(c, "Withdrawal is not enabled.")
		return
	}
	var req applyWithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid withdrawal request.")
		return
	}
	withdrawal, err := model.ApplyWithdrawal(c.GetInt("id"), req.Amount, req.RealName, req.Account)
	if err != nil {
		switch err {
		case model.ErrWithdrawalInsufficient:
			common.ApiErrorMsg(c, "Insufficient affiliate quota.")
		case model.ErrWithdrawalAmountInvalid:
			common.ApiErrorMsg(c, "Withdrawal amount is out of the allowed range.")
		default:
			common.ApiError(c, err)
		}
		return
	}
	common.ApiSuccess(c, withdrawal)
}

// GetSelfWithdrawals 返回当前用户的提现记录。
func GetSelfWithdrawals(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	withdrawals, total, err := model.GetWithdrawals(c.GetInt("id"), pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(withdrawals)
	common.ApiSuccess(c, pageInfo)
}

// GetAllWithdrawals 管理员查看全部提现记录。
func GetAllWithdrawals(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	withdrawals, total, err := model.GetWithdrawals(0, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(withdrawals)
	common.ApiSuccess(c, pageInfo)
}

type updateWithdrawalRequest struct {
	Id     int `json:"id" binding:"required"`
	Status int `json:"status"`
}

// UpdateWithdrawal 管理员更新提现审核状态。
func UpdateWithdrawal(c *gin.Context) {
	var req updateWithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid withdrawal request.")
		return
	}
	if err := model.UpdateWithdrawalStatus(req.Id, req.Status); err != nil {
		switch err {
		case model.ErrWithdrawalNotFound:
			common.ApiErrorMsg(c, "Withdrawal not found.")
		case model.ErrWithdrawalStatusInvalid, model.ErrWithdrawalAlreadyHandled:
			common.ApiErrorMsg(c, "Invalid withdrawal status.")
		default:
			common.ApiError(c, err)
		}
		return
	}
	common.ApiSuccess(c, nil)
}
