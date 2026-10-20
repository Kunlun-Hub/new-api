package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func manageUserGiftQuota(c *gin.Context, req ManageRequest) {
	action := "generic"
	params := model.AuditFields{
		"target_user_id":       req.Id,
		"mode":                 req.Mode,
		"requested_gift_quota": req.Value,
	}
	if req.ExpiredAt != 0 {
		params["expired_at"] = req.ExpiredAt
	}
	switch req.Mode {
	case "add":
		action = "user.gift_quota_add"
	case "subtract":
		action = "user.gift_quota_subtract"
	case "override":
		action = "user.gift_quota_override"
	default:
		params["action"] = "add_gift_quota"
		params["method"] = c.Request.Method
		params["route"] = c.FullPath()
	}
	success := false
	defer func() {
		content := auditContentEN(action, params)
		if !success {
			content = "Failed user gift quota adjustment"
		}
		model.RecordOperationAuditLog(c.GetInt("id"), c.GetInt("role"), content, c.ClientIP(), action, params,
			auditOperatorInfo(c), &model.AuditRequestInfo{
				Method: c.Request.Method, Route: c.FullPath(), Status: c.Writer.Status(), Success: success,
			}, c)
		markAuditLogged(c)
	}()

	adjustment, err := model.AdjustUserGiftQuota(req.Id, c.GetInt("role"), req.Mode, req.Value, req.ExpiredAt)
	if err != nil {
		switch {
		case errors.Is(err, model.ErrInvalidUserGiftQuotaAdjustment):
			params["failure_reason"] = "invalid_parameters"
			if (req.Mode == "add" || req.Mode == "subtract") && req.Value <= 0 {
				common.ApiErrorI18n(c, i18n.MsgUserQuotaChangeZero)
			} else {
				common.ApiErrorI18n(c, i18n.MsgInvalidParams)
			}
		case errors.Is(err, model.ErrUserGiftQuotaExpireInvalid):
			params["failure_reason"] = "invalid_expire_time"
			common.ApiErrorI18n(c, i18n.MsgGiftQuotaExpireInvalid)
		case errors.Is(err, model.ErrUserGiftQuotaPermission):
			params["failure_reason"] = "permission_denied"
			common.ApiErrorI18n(c, i18n.MsgUserNoPermissionHigherLevel)
		case errors.Is(err, gorm.ErrRecordNotFound):
			params["failure_reason"] = "target_not_found"
			common.ApiErrorI18n(c, i18n.MsgUserNotExists)
		case errors.Is(err, model.ErrWalletQuotaLimitExceeded):
			params["failure_reason"] = "quota_limit_exceeded"
			common.ApiError(c, err)
		default:
			params["failure_reason"] = "database_error"
			common.ApiError(c, err)
		}
		return
	}

	params["target_username"] = adjustment.Username
	params["from"] = adjustment.Before
	params["to"] = adjustment.After
	if adjustment.ExpiredAt != 0 {
		params["expired_at"] = adjustment.ExpiredAt
	}
	if req.Mode != "override" {
		params["gift_quota"] = req.Value
	}
	success = true
	operation := model.AuditOperation{Action: action, Params: params}
	model.RecordLogWithAdminInfo(adjustment.UserID, model.LogTypeTopup,
		auditContentEN(action, params), auditOperatorInfo(c), &operation, c)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}
