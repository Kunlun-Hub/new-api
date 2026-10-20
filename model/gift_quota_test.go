package model

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createGiftQuotaTestUser(t *testing.T, quota int, expiredAt int64) User {
	t.Helper()
	user := User{
		Username:           "gift-user-" + common.GetRandomString(6),
		Password:           "unused-password-hash",
		Role:               common.RoleCommonUser,
		Status:             common.UserStatusEnabled,
		Group:              "default",
		AuthVersion:        1,
		GiftQuota:          quota,
		GiftQuotaExpiredAt: expiredAt,
		AffCode:            "gift-aff-" + common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(&user).Error)
	return user
}

func getGiftQuotaFromDB(t *testing.T, id int) (int, int64) {
	t.Helper()
	var user User
	require.NoError(t, DB.Select("gift_quota", "gift_quota_expired_at").First(&user, id).Error)
	return user.GiftQuota, user.GiftQuotaExpiredAt
}

func TestAdjustUserGiftQuotaModes(t *testing.T) {
	user := createGiftQuotaTestUser(t, 100, 0)

	adjustment, err := AdjustUserGiftQuota(user.Id, common.RoleRootUser, "add", 50, 0)
	require.NoError(t, err)
	assert.Equal(t, 100, adjustment.Before)
	assert.Equal(t, 150, adjustment.After)
	assert.Zero(t, adjustment.ExpiredAt)

	adjustment, err = AdjustUserGiftQuota(user.Id, common.RoleRootUser, "subtract", 200, 0)
	require.NoError(t, err)
	assert.Equal(t, 0, adjustment.After, "subtract must floor at zero")

	expiredAt := common.GetTimestamp() + 3600
	adjustment, err = AdjustUserGiftQuota(user.Id, common.RoleRootUser, "override", 88, expiredAt)
	require.NoError(t, err)
	assert.Equal(t, 88, adjustment.After)
	assert.Equal(t, expiredAt, adjustment.ExpiredAt)

	// Adding never shortens the existing validity window.
	later := expiredAt + 3600
	_, err = AdjustUserGiftQuota(user.Id, common.RoleRootUser, "add", 12, later)
	require.NoError(t, err)
	quota, storedExpiry := getGiftQuotaFromDB(t, user.Id)
	assert.Equal(t, 100, quota)
	assert.Equal(t, later, storedExpiry)

	_, err = AdjustUserGiftQuota(user.Id, common.RoleRootUser, "add", 1, common.GetTimestamp()-10)
	assert.ErrorIs(t, err, ErrUserGiftQuotaExpireInvalid)

	require.NoError(t, DB.Model(&User{}).Where("id = ?", user.Id).Update("role", common.RoleAdminUser).Error)
	_, err = AdjustUserGiftQuota(user.Id, common.RoleAdminUser, "add", 1, 0)
	assert.ErrorIs(t, err, ErrUserGiftQuotaPermission)
}

func TestExpiredGiftQuotaIsNotSpendable(t *testing.T) {
	expired := createGiftQuotaTestUser(t, 500, common.GetTimestamp()-60)
	quota, err := GetUserGiftQuota(expired.Id)
	require.NoError(t, err)
	assert.Zero(t, quota)
	reserved, err := TryReserveUserGiftQuota(expired.Id, 100)
	require.NoError(t, err)
	assert.Zero(t, reserved)
	stored, _ := getGiftQuotaFromDB(t, expired.Id)
	assert.Equal(t, 500, stored, "reservation must not mutate an expired pool")

	active := createGiftQuotaTestUser(t, 500, common.GetTimestamp()+3600)
	reserved, err = TryReserveUserGiftQuota(active.Id, 700)
	require.NoError(t, err)
	assert.Equal(t, 500, reserved, "reservation is capped by the available balance")
	stored, _ = getGiftQuotaFromDB(t, active.Id)
	assert.Zero(t, stored)
}

func TestAddUserGiftQuotaExpiringKeepsLaterExpiry(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&RedPacket{}, &RedPacketShare{}, &RedPacketClaim{}))

	user := createGiftQuotaTestUser(t, 10, 0)
	require.NoError(t, AddUserGiftQuotaExpiring(user.Id, 20, common.GetTimestamp()+3600))
	quota, _ := getGiftQuotaFromDB(t, user.Id)
	assert.Equal(t, 30, quota)

	// A never-expiring pool stays never-expiring.
	require.NoError(t, AddUserGiftQuotaExpiring(user.Id, 5, common.GetTimestamp()+7200))
	quota, expiredAt := getGiftQuotaFromDB(t, user.Id)
	assert.Equal(t, 35, quota)
	assert.Zero(t, expiredAt)
}

func TestClaimRedPacketOncePerUserAndRespectsCapacity(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&RedPacket{}, &RedPacketShare{}, &RedPacketClaim{}))

	packet := RedPacket{
		Type:           RedPacketTypeGift,
		Distribution:   RedPacketDistributionRandom,
		TotalQuota:     90,
		ShareCount:     3,
		ExpireDays:     1,
		GiftExpireDays: 2,
		Remark:         "test",
	}
	require.NoError(t, CreateRedPacket(&packet))
	assert.Positive(t, packet.ExpiresAt, "claim deadline comes from expire_days")

	var shares []RedPacketShare
	require.NoError(t, DB.Where("packet_id = ?", packet.Id).Order("share_index ASC").Find(&shares).Error)
	require.Len(t, shares, 3)
	sum := 0
	for _, share := range shares {
		require.GreaterOrEqual(t, share.Quota, 1)
		sum += share.Quota
	}
	assert.Equal(t, 90, sum, "split must preserve the total exactly")

	first := createGiftQuotaTestUser(t, 0, 0)
	claim, err := ClaimRedPacket(packet.Id, first.Id, first.Username)
	require.NoError(t, err)
	assert.Positive(t, claim.Quota)
	var claimedShare RedPacketShare
	require.NoError(t, DB.Where("packet_id = ? AND claim_user_id = ?", packet.Id, first.Id).First(&claimedShare).Error)
	assert.Equal(t, claim.Quota, claimedShare.Quota)
	quota, expiredAt := getGiftQuotaFromDB(t, first.Id)
	assert.Equal(t, claim.Quota, quota)
	assert.Equal(t, claim.ExpiresAt, expiredAt)
	assert.InDelta(t, common.GetTimestamp()+2*86400, expiredAt, 60, "gift credit expires gift_expire_days after the claim")

	_, err = ClaimRedPacket(packet.Id, first.Id, first.Username)
	assert.ErrorIs(t, err, ErrRedPacketAlreadyClaimed)

	second := createGiftQuotaTestUser(t, 0, 0)
	third := createGiftQuotaTestUser(t, 0, 0)
	fourth := createGiftQuotaTestUser(t, 0, 0)
	_, err = ClaimRedPacket(packet.Id, second.Id, second.Username)
	require.NoError(t, err)
	_, err = ClaimRedPacket(packet.Id, third.Id, third.Username)
	require.NoError(t, err)
	_, err = ClaimRedPacket(packet.Id, fourth.Id, fourth.Username)
	assert.ErrorIs(t, err, ErrRedPacketEmpty)

	var stored RedPacket
	require.NoError(t, DB.First(&stored, packet.Id).Error)
	assert.Equal(t, 3, stored.ClaimedCount)
}

func TestRedPacketBalanceClaimCreditsWallet(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&RedPacket{}, &RedPacketShare{}, &RedPacketClaim{}))

	packet := RedPacket{
		Type:           RedPacketTypeBalance,
		Distribution:   RedPacketDistributionAverage,
		TotalQuota:     100,
		ShareCount:     2,
		GiftExpireDays: 30,
	}
	require.NoError(t, CreateRedPacket(&packet))
	assert.Zero(t, packet.GiftExpireDays, "balance packets must not carry a gift credit window")

	user := createGiftQuotaTestUser(t, 0, 0)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", user.Id).Update("quota", 10).Error)
	claim, err := ClaimRedPacket(packet.Id, user.Id, user.Username)
	require.NoError(t, err)
	assert.Equal(t, 50, claim.Quota)
	var stored User
	require.NoError(t, DB.Select("quota").First(&stored, user.Id).Error)
	assert.Equal(t, 60, stored.Quota)
}

func TestRedPacketLandingTokenAndClaimCode(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&RedPacket{}, &RedPacketShare{}, &RedPacketClaim{}))

	packet := RedPacket{
		Type:         RedPacketTypeGift,
		ClaimMode:    RedPacketClaimCode,
		Distribution: RedPacketDistributionAverage,
		TotalQuota:   20,
		ShareCount:   2,
	}
	require.NoError(t, CreateRedPacket(&packet))
	require.NotEmpty(t, packet.LandingToken)
	require.Len(t, packet.ClaimCode, redPacketClaimCodeLength)

	first := createGiftQuotaTestUser(t, 0, 0)
	second := createGiftQuotaTestUser(t, 0, 0)

	_, err := ClaimRedPacketByToken(packet.LandingToken, first.Id, first.Username, "")
	assert.ErrorIs(t, err, ErrRedPacketInvalidCode, "code packets reject empty codes")

	_, err = ClaimRedPacketByToken(packet.LandingToken, first.Id, first.Username, "AAAABBBB")
	assert.ErrorIs(t, err, ErrRedPacketInvalidCode, "code packets reject wrong codes")

	_, err = ClaimRedPacket(packet.Id, first.Id, first.Username)
	assert.ErrorIs(t, err, ErrRedPacketInvalidCode, "the id path must not bypass the claim code")

	claim, err := ClaimRedPacketByToken(packet.LandingToken, first.Id, first.Username, strings.ToLower(packet.ClaimCode))
	require.NoError(t, err)
	assert.Equal(t, 10, claim.Quota, "codes compare case-insensitively and average splits stay exact")

	_, err = ClaimRedPacketByToken(packet.LandingToken, first.Id, first.Username, packet.ClaimCode)
	assert.ErrorIs(t, err, ErrRedPacketAlreadyClaimed)

	_, err = ClaimRedPacketByToken(packet.LandingToken, second.Id, second.Username, packet.ClaimCode)
	require.NoError(t, err)
}

func TestRedPacketLandingQueriesAndAdminStats(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&RedPacket{}, &RedPacketShare{}, &RedPacketClaim{}))

	packet := RedPacket{
		Type:         RedPacketTypeBalance,
		ClaimMode:    RedPacketClaimDirect,
		Distribution: RedPacketDistributionAverage,
		TotalQuota:   40,
		ShareCount:   4,
		Remark:       "landing-query-test",
	}
	require.NoError(t, CreateRedPacket(&packet))
	assert.Empty(t, packet.ClaimCode, "direct packets carry no claim code")

	loaded, err := GetRedPacketByLandingToken(packet.LandingToken)
	require.NoError(t, err)
	assert.Equal(t, packet.Id, loaded.Id)

	unclaimed, err := GetUserRedPacketClaim(packet.Id, 987654321)
	require.NoError(t, err)
	assert.Nil(t, unclaimed)

	user := createGiftQuotaTestUser(t, 0, 0)
	claim, err := ClaimRedPacketByToken(packet.LandingToken, user.Id, user.Username, "")
	require.NoError(t, err)

	own, err := GetUserRedPacketClaim(packet.Id, user.Id)
	require.NoError(t, err)
	require.NotNil(t, own)
	assert.Equal(t, claim.Quota, own.Quota)

	records, err := GetUserRedPacketClaimsDetailed(user.Id)
	require.NoError(t, err)
	require.Len(t, records, 1)
	assert.Equal(t, "landing-query-test", records[0].Remark)
	assert.Equal(t, RedPacketTypeBalance, records[0].Type)
	assert.Equal(t, claim.Quota, records[0].Quota)

	amounts, err := GetRedPacketClaimedAmounts([]int{packet.Id})
	require.NoError(t, err)
	assert.Equal(t, claim.Quota, amounts[packet.Id])

	now := common.GetTimestamp()
	assert.Equal(t, RedPacketStatusActive, RedPacketCurrentStatus(&RedPacket{ShareCount: 2, ClaimedCount: 1}, now))
	assert.Equal(t, RedPacketStatusSoldOut, RedPacketCurrentStatus(&RedPacket{ShareCount: 1, ClaimedCount: 1}, now))
	assert.Equal(t, RedPacketStatusExpired, RedPacketCurrentStatus(&RedPacket{ShareCount: 1, ExpiresAt: now - 1}, now))
}

func TestBackfillRedPacketLandingTokensIsIdempotent(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&RedPacket{}, &RedPacketShare{}, &RedPacketClaim{}))

	legacy := RedPacket{
		Type:         RedPacketTypeBalance,
		Distribution: RedPacketDistributionAverage,
		TotalQuota:   10,
		ShareCount:   1,
		CreatedAt:    common.GetTimestamp(),
	}
	// Bypass CreateRedPacket so the row looks like one issued before landing pages.
	require.NoError(t, DB.Create(&legacy).Error)

	BackfillRedPacketLandingTokens()
	var stored RedPacket
	require.NoError(t, DB.First(&stored, legacy.Id).Error)
	assert.NotEmpty(t, stored.LandingToken)
	assert.Equal(t, RedPacketClaimDirect, stored.ClaimMode)

	BackfillRedPacketLandingTokens()
	var second RedPacket
	require.NoError(t, DB.First(&second, legacy.Id).Error)
	assert.Equal(t, stored.LandingToken, second.LandingToken, "backfill must not rotate existing tokens")
}
