package service

import (
	"context"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedGiftQuotaUser(t *testing.T, id int, quota int, giftQuota int, expiredAt int64) {
	t.Helper()
	user := &model.User{
		Id:                 id,
		Username:           "gift_user",
		Quota:              quota,
		GiftQuota:          giftQuota,
		GiftQuotaExpiredAt: expiredAt,
		Status:             common.UserStatusEnabled,
	}
	require.NoError(t, model.DB.Create(user).Error)
}

func walletBalances(t *testing.T, userId int) (int, int) {
	t.Helper()
	quota, err := model.GetUserQuota(userId, false)
	require.NoError(t, err)
	giftQuota, err := model.GetUserGiftQuota(userId)
	require.NoError(t, err)
	return quota, giftQuota
}

func TestWalletFundingConsumesGiftQuotaFirst(t *testing.T) {
	truncate(t)

	const userID = 901
	seedGiftQuotaUser(t, userID, 1_000, 400, common.GetTimestamp()+3600)

	funding := &WalletFunding{userId: userID, giftEligible: true}
	require.NoError(t, funding.PreConsume(300))
	quota, giftQuota := walletBalances(t, userID)
	assert.Equal(t, 1_000, quota, "pre-consume within gift credit must not touch the wallet")
	assert.Equal(t, 100, giftQuota)

	// Settlement under the reservation (delta = actual - pre-consumed) refunds
	// the unused gift credit.
	require.NoError(t, funding.Settle(-180))
	quota, giftQuota = walletBalances(t, userID)
	assert.Equal(t, 1_000, quota)
	assert.Equal(t, 280, giftQuota)

	// A failed request (no settlement) refunds the reservation to the gift pool
	// without touching the wallet.
	refunded := &WalletFunding{userId: userID, giftEligible: true}
	require.NoError(t, refunded.PreConsume(200))
	require.NoError(t, refunded.Refund())
	quota, giftQuota = walletBalances(t, userID)
	assert.Equal(t, 1_000, quota)
	assert.Equal(t, 280, giftQuota)
}

func TestWalletFundingOverflowsIntoWalletBalance(t *testing.T) {
	truncate(t)

	const userID = 902
	seedGiftQuotaUser(t, userID, 5_000, 300, 0)

	funding := &WalletFunding{userId: userID, giftEligible: true}
	require.NoError(t, funding.PreConsume(800))
	quota, giftQuota := walletBalances(t, userID)
	assert.Equal(t, 4_500, quota)
	assert.Zero(t, giftQuota)

	// Extra settlement charges hit the wallet balance because the gift pool is
	// already empty.
	require.NoError(t, funding.Settle(1_000))
	quota, giftQuota = walletBalances(t, userID)
	assert.Equal(t, 3_500, quota)
	assert.Zero(t, giftQuota)

	// A later refund restores the gift share first, then the wallet share.
	require.NoError(t, funding.Settle(-800))
	quota, giftQuota = walletBalances(t, userID)
	assert.Equal(t, 4_000, quota)
	assert.Equal(t, 300, giftQuota)
}

func TestWalletFundingFailsWhenNoBalanceAndKeepsGiftQuota(t *testing.T) {
	truncate(t)

	const userID = 903
	seedGiftQuotaUser(t, userID, 0, 500, 0)

	funding := &WalletFunding{userId: userID, giftEligible: true}
	err := funding.PreConsume(800)
	assert.ErrorIs(t, err, ErrInsufficientWalletQuota)
	quota, giftQuota := walletBalances(t, userID)
	assert.Zero(t, quota)
	assert.Equal(t, 500, giftQuota, "failed pre-consume must not consume gift credit")

	// A model without gift credit cannot spend the pool at all.
	plain := &WalletFunding{userId: userID}
	assert.ErrorIs(t, plain.PreConsume(1), ErrInsufficientWalletQuota)
	_, giftQuota = walletBalances(t, userID)
	assert.Equal(t, 500, giftQuota)
}

func TestBillingSessionRecordsGiftQuotaConsumed(t *testing.T) {
	truncate(t)

	const userID = 904
	seedGiftQuotaUser(t, userID, 10_000, 2_000, 0)

	relayInfo := &relaycommon.RelayInfo{UserId: userID, IsPlayground: true}
	session := &BillingSession{
		relayInfo: relayInfo,
		funding:   &WalletFunding{userId: userID, giftEligible: true},
	}
	require.NoError(t, session.funding.PreConsume(1_500))
	session.preConsumedQuota = 1_500
	session.syncRelayInfo()
	assert.Equal(t, 1_500, relayInfo.GiftQuotaConsumed)

	require.NoError(t, session.Settle(1_200))
	assert.Equal(t, 1_200, relayInfo.GiftQuotaConsumed)
	quota, giftQuota := walletBalances(t, userID)
	assert.Equal(t, 10_000, quota)
	assert.Equal(t, 800, giftQuota)
}

func TestRecalculateTaskQuotaCapsGiftShareAtFinalQuota(t *testing.T) {
	truncate(t)

	const userID, preConsumed, actualQuota = 905, 5_000, 2_000
	seedUser(t, userID, 10_000)
	task := makeTask(userID, 0, preConsumed, 0, BillingSourceWallet, 0)
	task.GiftQuota = 3_000
	require.NoError(t, model.DB.Create(task).Error)

	RecalculateTaskQuota(context.Background(), task, actualQuota, common.NewMessage("adaptor adjustment"))

	var stored model.Task
	require.NoError(t, model.DB.First(&stored, task.ID).Error)
	assert.Equal(t, actualQuota, stored.Quota)
	assert.Equal(t, actualQuota, stored.GiftQuota, "gift share must not exceed the settled charge")
}

func TestRefundTaskQuotaClearsGiftShare(t *testing.T) {
	truncate(t)

	const userID, quota = 906, 4_000
	seedUser(t, userID, 10_000)
	task := makeTask(userID, 0, quota, 0, BillingSourceWallet, 0)
	task.GiftQuota = 1_500
	require.NoError(t, model.DB.Create(task).Error)

	require.True(t, RefundTaskQuota(context.Background(), task, "upstream failed"))

	var stored model.Task
	require.NoError(t, model.DB.First(&stored, task.ID).Error)
	assert.Zero(t, stored.Quota)
	assert.Zero(t, stored.GiftQuota, "a wallet refund leaves no gift share on the task")
	assert.Equal(t, 10_000+quota, getUserQuota(t, userID))
}
