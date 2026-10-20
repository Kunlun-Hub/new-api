package controller

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

type createRedPacketRequest struct {
	Type           string `json:"type"`
	ClaimMode      string `json:"claim_mode"`
	Distribution   string `json:"distribution"`
	TotalQuota     int    `json:"total_quota"`
	ShareCount     int    `json:"share_count"`
	ExpireDays     int    `json:"expire_days"`
	GiftExpireDays int    `json:"gift_expire_days"`
	Remark         string `json:"remark"`
}

type claimRedPacketRequest struct {
	Code string `json:"code"`
}

// adminRedPacketItem is the administrator view of a packet: distribution
// statistics plus the landing token, claim mode and code needed to share it.
type adminRedPacketItem struct {
	*model.RedPacket
	Status        string `json:"status"`
	ClaimedAmount int    `json:"claimed_amount"`
	Remaining     int    `json:"remaining_count"`
}

// landingRedPacketInfo is the public landing page payload. It deliberately
// omits the claim code and every other viewer's claim data.
type landingRedPacketInfo struct {
	Remark         string `json:"remark"`
	Type           string `json:"type"`
	ClaimMode      string `json:"claim_mode"`
	TotalQuota     int    `json:"total_quota"`
	ShareCount     int    `json:"share_count"`
	ClaimedCount   int    `json:"claimed_count"`
	RemainingCount int    `json:"remaining_count"`
	GiftExpireDays int    `json:"gift_expire_days"`
	CreatedAt      int64  `json:"created_at"`
	ExpiresAt      int64  `json:"expires_at"`
	Status         string `json:"status"`
}

// CreateRedPacket lets an administrator issue a gift-credit or balance red packet.
func CreateRedPacket(c *gin.Context) {
	var req createRedPacketRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	packet := model.RedPacket{
		Type:           req.Type,
		ClaimMode:      req.ClaimMode,
		Distribution:   req.Distribution,
		TotalQuota:     req.TotalQuota,
		ShareCount:     req.ShareCount,
		ExpireDays:     req.ExpireDays,
		GiftExpireDays: req.GiftExpireDays,
		Remark:         req.Remark,
		CreatorId:      c.GetInt("id"),
		CreatorName:    c.GetString("username"),
	}
	if err := model.CreateRedPacket(&packet); err != nil {
		if errors.Is(err, model.ErrRedPacketInvalidParams) {
			common.ApiErrorI18n(c, i18n.MsgInvalidParams)
			return
		}
		common.ApiError(c, err)
		return
	}
	model.RecordOperationAuditLog(c.GetInt("id"), c.GetInt("role"), "Create red packet", c.ClientIP(), "red_packet.create", model.AuditFields{
		"packet_id":        packet.Id,
		"type":             packet.Type,
		"claim_mode":       packet.ClaimMode,
		"total_quota":      packet.TotalQuota,
		"share_count":      packet.ShareCount,
		"expire_days":      packet.ExpireDays,
		"gift_expire_days": packet.GiftExpireDays,
	}, auditOperatorInfo(c), nil, c)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": packet})
}

// GetRedPackets lists every packet with distribution statistics for administrators.
func GetRedPackets(c *gin.Context) {
	packets, err := model.GetRedPackets(200)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	ids := make([]int, 0, len(packets))
	for _, packet := range packets {
		ids = append(ids, packet.Id)
	}
	amounts, err := model.GetRedPacketClaimedAmounts(ids)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	now := common.GetTimestamp()
	items := make([]adminRedPacketItem, 0, len(packets))
	for _, packet := range packets {
		items = append(items, adminRedPacketItem{
			RedPacket:     packet,
			Status:        model.RedPacketCurrentStatus(packet, now),
			ClaimedAmount: amounts[packet.Id],
			Remaining:     max(0, packet.ShareCount-packet.ClaimedCount),
		})
	}
	common.ApiSuccess(c, items)
}

// GetRedPacketLanding serves the public landing page payload addressed by token.
func GetRedPacketLanding(c *gin.Context) {
	packet, ok := loadRedPacketByLandingToken(c)
	if !ok {
		return
	}
	common.ApiSuccess(c, landingRedPacketInfo{
		Remark:         packet.Remark,
		Type:           packet.Type,
		ClaimMode:      packet.ClaimMode,
		TotalQuota:     packet.TotalQuota,
		ShareCount:     packet.ShareCount,
		ClaimedCount:   packet.ClaimedCount,
		RemainingCount: max(0, packet.ShareCount-packet.ClaimedCount),
		GiftExpireDays: packet.GiftExpireDays,
		CreatedAt:      packet.CreatedAt,
		ExpiresAt:      packet.ExpiresAt,
		Status:         model.RedPacketCurrentStatus(packet, common.GetTimestamp()),
	})
}

// GetMyRedPacketClaim reports whether the signed-in user already claimed the
// packet behind a landing token, so the landing page can show the result state.
func GetMyRedPacketClaim(c *gin.Context) {
	packet, ok := loadRedPacketByLandingToken(c)
	if !ok {
		return
	}
	claim, err := model.GetUserRedPacketClaim(packet.Id, c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if claim == nil {
		common.ApiSuccess(c, gin.H{"claimed": false, "quota": 0, "expires_at": 0})
		return
	}
	common.ApiSuccess(c, gin.H{"claimed": true, "quota": claim.Quota, "expires_at": claim.ExpiresAt})
}

// ClaimRedPacketByLanding grants the caller one share through the landing page.
// Code packets must present the matching claim code.
func ClaimRedPacketByLanding(c *gin.Context) {
	var req claimRedPacketRequest
	if c.Request.ContentLength > 0 {
		if err := common.DecodeJson(c.Request.Body, &req); err != nil {
			common.ApiErrorI18n(c, i18n.MsgInvalidParams)
			return
		}
	}
	claim, err := model.ClaimRedPacketByToken(strings.TrimSpace(c.Param("token")), c.GetInt("id"), c.GetString("username"), req.Code)
	if err != nil {
		switch {
		case errors.Is(err, model.ErrRedPacketInvalidCode):
			common.ApiErrorI18n(c, i18n.MsgRedPacketInvalidCode)
		case errors.Is(err, model.ErrRedPacketAlreadyClaimed):
			common.ApiErrorI18n(c, i18n.MsgRedPacketAlreadyClaimed)
		case errors.Is(err, model.ErrRedPacketEmpty):
			common.ApiErrorI18n(c, i18n.MsgRedPacketEmpty)
		case errors.Is(err, model.ErrRedPacketNotFound):
			common.ApiErrorI18n(c, i18n.MsgRedPacketNotFound)
		case errors.Is(err, model.ErrRedPacketNotClaimable):
			common.ApiErrorI18n(c, i18n.MsgRedPacketNotClaimable)
		default:
			common.ApiError(c, err)
		}
		return
	}
	common.ApiSuccess(c, gin.H{
		"packet_id":  claim.PacketId,
		"quota":      claim.Quota,
		"expires_at": claim.ExpiresAt,
	})
}

// GetMyRedPacketClaims lists the signed-in user's claim records.
func GetMyRedPacketClaims(c *gin.Context) {
	claims, err := model.GetUserRedPacketClaimsDetailed(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, claims)
}

// DeleteRedPacket removes a packet as an administrator.
func DeleteRedPacket(c *gin.Context) {
	packetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if err := model.DeleteRedPacket(packetId); err != nil {
		if errors.Is(err, model.ErrRedPacketNotFound) {
			common.ApiErrorI18n(c, i18n.MsgRedPacketNotFound)
			return
		}
		common.ApiError(c, err)
		return
	}
	model.RecordOperationAuditLog(c.GetInt("id"), c.GetInt("role"), "Delete red packet", c.ClientIP(), "red_packet.delete", model.AuditFields{
		"packet_id": packetId,
	}, auditOperatorInfo(c), nil, c)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// GetRedPacketClaims lists the claims of one packet for administrators.
func GetRedPacketClaims(c *gin.Context) {
	packetId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	claims, err := model.GetRedPacketClaims(packetId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, claims)
}

// loadRedPacketByLandingToken resolves the token or writes the shared 404
// response; it returns false when the caller must stop.
func loadRedPacketByLandingToken(c *gin.Context) (*model.RedPacket, bool) {
	packet, err := model.GetRedPacketByLandingToken(strings.TrimSpace(c.Param("token")))
	if err != nil {
		if errors.Is(err, model.ErrRedPacketNotFound) {
			common.ApiErrorI18n(c, i18n.MsgRedPacketNotFound)
			return nil, false
		}
		common.ApiError(c, err)
		return nil, false
	}
	return packet, true
}
