package controller

import (
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/wechatpay"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

const wechatNotifyMaxBytes = 1 << 20

type WechatPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type WechatNotifyResource struct {
	Algorithm      string `json:"algorithm"`
	Ciphertext     string `json:"ciphertext"`
	Nonce          string `json:"nonce"`
	AssociatedData string `json:"associated_data"`
}

func buildWechatClient() (*wechatpay.Client, error) {
	return wechatpay.NewClient(wechatpay.Config{
		MchID:               setting.WechatMchId,
		AppID:               setting.WechatAppId,
		PrivateKey:          setting.WechatPrivateKey,
		CertSerial:          setting.WechatCertSerial,
		APIv3Key:            setting.WechatApiV3Key,
		PlatformPublicKey:   setting.WechatPlatformPublicKey,
		PlatformPublicKeyID: setting.WechatPlatformPublicKeyId,
		NotifyURL:           service.GetCallbackAddress() + "/api/user/wechat/notify",
	}, service.GetHttpClient())
}

// RequestWechatPay 创建微信支付 Native 订单，返回给前端展示的二维码内容。
func RequestWechatPay(c *gin.Context) {
	if !isWechatTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置微信支付信息"})
		return
	}
	var req WechatPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.PaymentMethod != model.PaymentMethodWechat {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "不支持的支付渠道"})
		return
	}
	if req.Amount < minTopUpForDisplay(setting.WechatMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", minTopUpForDisplay(setting.WechatMinTopUp))})
		return
	}
	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	totalFen := int64(math.Round(payMoney * 100))
	if totalFen < 1 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	client, err := buildWechatClient()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 初始化客户端失败 user_id=%d error=%q", id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "微信支付配置无效，请联系管理员"})
		return
	}

	tradeNo := fmt.Sprintf("USR%dNO%s%d", id, common.GetRandomString(6), time.Now().Unix())
	codeURL, err := client.NativePrepay(c.Request.Context(), tradeNo, fmt.Sprintf("TUC%d", req.Amount), totalFen, "")
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 拉起支付失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(amount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodWechat,
		PaymentProvider: model.PaymentProviderWechat,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
		Type:            model.TopUpTypeOnline,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("微信支付 充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%.2f", id, tradeNo, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"trade_no": tradeNo,
			"qr_code":  codeURL,
		},
	})
}

// WechatNotify 处理微信支付异步通知：验签（配置了微信支付公钥时）、
// 解密 resource、校验商户与金额后完成入账。失败返回非 2xx 让微信重试。
func WechatNotify(c *gin.Context) {
	if !isWechatWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.JSON(http.StatusForbidden, gin.H{"code": "FAIL", "message": "webhook disabled"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(c.Request.Body, wechatNotifyMaxBytes))
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 webhook 读取请求失败 error=%q", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"code": "FAIL", "message": "read body failed"})
		return
	}
	var envelope struct {
		Resource WechatNotifyResource `json:"resource"`
	}
	if err := common.Unmarshal(body, &envelope); err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 webhook 报文无效 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": "invalid payload"})
		return
	}

	client, err := buildWechatClient()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 webhook 初始化客户端失败 error=%q", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"code": "FAIL", "message": "invalid config"})
		return
	}
	if client.HasPlatformKey() {
		err = client.VerifyNotify(
			c.GetHeader("Wechatpay-Timestamp"),
			c.GetHeader("Wechatpay-Nonce"),
			string(body),
			c.GetHeader("Wechatpay-Signature"),
			c.GetHeader("Wechatpay-Serial"),
		)
		if err != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 webhook 验签失败 client_ip=%s error=%q", c.ClientIP(), err.Error()))
			c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "signature verification failed"})
			return
		}
	} else {
		logger.LogWarn(c.Request.Context(), "微信支付 webhook 未配置微信支付公钥，跳过验签，仅依赖 APIv3 密钥解密校验")
	}

	notification, err := client.DecryptNotify(envelope.Resource.Ciphertext, envelope.Resource.Nonce, envelope.Resource.AssociatedData)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 webhook 解密失败 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": "decrypt failed"})
		return
	}
	if strings.TrimSpace(notification.MchID) != strings.TrimSpace(setting.WechatMchId) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 webhook 商户不匹配 client_ip=%s mchid=%q", c.ClientIP(), notification.MchID))
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": "mchid mismatch"})
		return
	}

	tradeNo := strings.TrimSpace(notification.OutTradeNo)
	if notification.TradeState != "SUCCESS" {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("微信支付 webhook 忽略事件 trade_no=%s trade_state=%s client_ip=%s", tradeNo, notification.TradeState, c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"code": "SUCCESS", "message": "成功"})
		return
	}
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 webhook 缺少订单号 client_ip=%s", c.ClientIP()))
		c.JSON(http.StatusBadRequest, gin.H{"code": "FAIL", "message": "missing out_trade_no"})
		return
	}

	paidAmount := decimal.NewFromInt(notification.Amount.Total).Div(decimal.NewFromInt(100))
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	alreadyDone, err := model.RechargeWechat(tradeNo, paidAmount, c.ClientIP())
	if err != nil {
		switch {
		case errors.Is(err, model.ErrTopUpNotFound):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 回调订单不存在 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrPaymentMethodMismatch):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 订单支付网关不匹配 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrPaymentAmountMismatch):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 订单金额不匹配 trade_no=%s total_fen=%d client_ip=%s", tradeNo, notification.Amount.Total, c.ClientIP()))
		case errors.Is(err, model.ErrTopUpStatusInvalid):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 订单状态非法 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		default:
			logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 充值处理失败 trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), err.Error()))
		}
		c.JSON(http.StatusInternalServerError, gin.H{"code": "FAIL", "message": "process failed"})
		return
	}
	if alreadyDone {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("微信支付 重复回调幂等忽略 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	} else {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("微信支付 充值成功 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	}
	c.JSON(http.StatusOK, gin.H{"code": "SUCCESS", "message": "成功"})
}

type WechatQueryRequest struct {
	TradeNo string `json:"trade_no"`
}

// SyncWechatOrder 主动向微信支付查询订单状态，并在已支付时补单入账。
func SyncWechatOrder(c *gin.Context) {
	if !isWechatTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置微信支付信息"})
		return
	}
	var req WechatQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.TradeNo) == "" {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	tradeNo := strings.TrimSpace(req.TradeNo)
	id := c.GetInt("id")
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != id || topUp.PaymentProvider != model.PaymentProviderWechat {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单不存在"})
		return
	}
	if topUp.Status == common.TopUpStatusSuccess {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": true}})
		return
	}

	client, err := buildWechatClient()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("微信支付 初始化客户端失败 user_id=%d error=%q", id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "微信支付配置无效，请联系管理员"})
		return
	}
	status, err := client.QueryOrder(c.Request.Context(), tradeNo)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 订单查询未完成 trade_no=%s user_id=%d error=%q client_ip=%s", tradeNo, id, err.Error(), c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": false}})
		return
	}
	if status.TradeState != "SUCCESS" {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": false}})
		return
	}

	paidAmount := decimal.NewFromInt(status.TotalFen).Div(decimal.NewFromInt(100))
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	alreadyDone, err := model.RechargeWechat(tradeNo, paidAmount, c.ClientIP())
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("微信支付 主动补单失败 trade_no=%s user_id=%d error=%q", tradeNo, id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单状态异常"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("微信支付 主动查询补单成功 trade_no=%s user_id=%d already_done=%v", tradeNo, id, alreadyDone))
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": true}})
}
