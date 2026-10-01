package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createAffiliateTestUser(t *testing.T, username string, inviterId int, affQuota int) User {
	t.Helper()
	user := User{
		Username:    username,
		DisplayName: username,
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
		AuthVersion: 1,
		InviterId:   inviterId,
		AffQuota:    affQuota,
		AffCode:     username + "-aff",
	}
	require.NoError(t, DB.Create(&user).Error)
	return user
}

func TestApplyAffiliateTopupRewardHonorsTimesLimit(t *testing.T) {
	truncateTables(t)
	oldPercent, oldTimes := common.AffiliateTopupRewardPercent, common.AffiliateTopupRewardTimes
	t.Cleanup(func() {
		common.AffiliateTopupRewardPercent = oldPercent
		common.AffiliateTopupRewardTimes = oldTimes
	})
	common.AffiliateTopupRewardPercent = 0.1
	common.AffiliateTopupRewardTimes = 2

	inviter := createAffiliateTestUser(t, "affiliate-inviter", 0, 0)
	invitee := createAffiliateTestUser(t, "affiliate-invitee", inviter.Id, 0)

	for attempt := 1; attempt <= 3; attempt++ {
		require.NoError(t, DB.Create(&TopUp{
			UserId:  invitee.Id,
			Amount:  10,
			TradeNo: "affiliate-topup-" + string(rune('0'+attempt)),
			Status:  common.TopUpStatusSuccess,
			Money:   10,
		}).Error)
		require.NoError(t, ApplyAffiliateTopupReward(DB, invitee.Id, 1_000_000))
	}

	var stored User
	require.NoError(t, DB.Where("id = ?", inviter.Id).First(&stored).Error)
	assert.Equal(t, 200_000, stored.AffQuota)
	assert.Equal(t, 200_000, stored.AffHistoryQuota)

	var rewards []AffiliateReward
	require.NoError(t, DB.Where("inviter_id = ?", inviter.Id).Order("id").Find(&rewards).Error)
	require.Len(t, rewards, 2)
	for _, reward := range rewards {
		assert.Equal(t, AffiliateSourceTopup, reward.Source)
		assert.Equal(t, invitee.Id, reward.InviteeId)
		assert.Equal(t, 100_000, reward.RewardQuota)
		assert.InDelta(t, 2.0, reward.TopupAmount, 1e-9)
	}
}

func TestWithdrawalHoldAndRefund(t *testing.T) {
	truncateTables(t)
	oldEnabled, oldMin, oldRatio := common.WithdrawalEnabled, common.WithdrawalMinQuota, common.WithdrawalRatio
	t.Cleanup(func() {
		common.WithdrawalEnabled = oldEnabled
		common.WithdrawalMinQuota = oldMin
		common.WithdrawalRatio = oldRatio
	})
	common.WithdrawalEnabled = true
	common.WithdrawalMinQuota = 0
	common.WithdrawalRatio = 7.2

	user := createAffiliateTestUser(t, "withdrawal-user", 0, 1_000_000)

	withdrawal, err := ApplyWithdrawal(user.Id, 1, "张三", "zhangsan@example.com")
	require.NoError(t, err)
	assert.Equal(t, WithdrawalStatusPending, withdrawal.Status)
	assert.InDelta(t, 7.2, withdrawal.AmountCny, 1e-9)
	assert.Equal(t, 500_000, withdrawal.QuotaHeld)

	var afterApply User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&afterApply).Error)
	assert.Equal(t, 500_000, afterApply.AffQuota)
	assert.Equal(t, 0, afterApply.AffHistoryQuota)

	_, err = ApplyWithdrawal(user.Id, 5, "张三", "zhangsan@example.com")
	assert.ErrorIs(t, err, ErrWithdrawalInsufficient)

	require.NoError(t, UpdateWithdrawalStatus(withdrawal.Id, WithdrawalStatusRejected))

	var afterReject User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&afterReject).Error)
	assert.Equal(t, 1_000_000, afterReject.AffQuota)

	var storedWithdrawal Withdrawal
	require.NoError(t, DB.Where("id = ?", withdrawal.Id).First(&storedWithdrawal).Error)
	assert.Equal(t, WithdrawalStatusRejected, storedWithdrawal.Status)

	// 已拒绝的申请不可再次变更状态，避免重复返还额度。
	assert.ErrorIs(t, UpdateWithdrawalStatus(withdrawal.Id, WithdrawalStatusPaid), ErrWithdrawalAlreadyHandled)
}

func TestWithdrawalRequiresEnabledAndMinimum(t *testing.T) {
	truncateTables(t)
	oldEnabled, oldMin := common.WithdrawalEnabled, common.WithdrawalMinQuota
	t.Cleanup(func() {
		common.WithdrawalEnabled = oldEnabled
		common.WithdrawalMinQuota = oldMin
	})
	common.WithdrawalEnabled = false
	common.WithdrawalMinQuota = 0

	user := createAffiliateTestUser(t, "withdrawal-disabled-user", 0, 1_000_000)
	_, err := ApplyWithdrawal(user.Id, 1, "张三", "zhangsan@example.com")
	assert.ErrorIs(t, err, ErrWithdrawalDisabled)

	common.WithdrawalEnabled = true
	common.WithdrawalMinQuota = 1_000_000
	_, err = ApplyWithdrawal(user.Id, 1, "张三", "zhangsan@example.com")
	assert.ErrorIs(t, err, ErrWithdrawalAmountInvalid)
}
