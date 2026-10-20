package controller

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/alipay"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type AlipayPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

func buildAlipayClient() (*alipay.Client, error) {
	return alipay.NewClient(alipay.Config{
		AppID:           setting.AlipayAppId,
		PrivateKey:      setting.AlipayPrivateKey,
		AlipayPublicKey: setting.AlipayPublicKey,
		NotifyURL:       service.GetCallbackAddress() + "/api/user/alipay/notify",
		Sandbox:         setting.AlipaySandbox,
	}, service.GetHttpClient())
}

// RequestAlipayPay 创建支付宝官方当面付订单，返回给前端展示的二维码内容。
func RequestAlipayPay(c *gin.Context) {
	if !isAlipayTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置支付宝支付信息"})
		return
	}
	var req AlipayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.PaymentMethod != model.PaymentMethodAlipay {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "不支持的支付渠道"})
		return
	}
	if req.Amount < minTopUpForDisplay(setting.AlipayMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", minTopUpForDisplay(setting.AlipayMinTopUp))})
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
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	client, err := buildAlipayClient()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 初始化客户端失败 user_id=%d error=%q", id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "支付宝支付配置无效，请联系管理员"})
		return
	}

	tradeNo := fmt.Sprintf("USR%dNO%s%d", id, common.GetRandomString(6), time.Now().Unix())
	outTradeNo := tradeNo
	subject := fmt.Sprintf("TUC%d", req.Amount)
	money := strconv.FormatFloat(payMoney, 'f', 2, 64)
	// 当面付返回二维码，电脑网站支付返回收银台跳转 URL。
	var qrCode, payURL string
	if setting.AlipayPayMode == setting.AlipayPayModePage {
		returnURL := paymentReturnPath("/wallet?alipay_trade_no=" + url.QueryEscape(tradeNo))
		payURL, err = client.PagePay(outTradeNo, subject, money, returnURL)
	} else {
		qrCode, err = client.Precreate(c.Request.Context(), outTradeNo, subject, money)
	}
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 拉起支付失败 user_id=%d trade_no=%s amount=%d mode=%s error=%q", id, tradeNo, req.Amount, setting.AlipayPayMode, err.Error()))
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
		PaymentMethod:   model.PaymentMethodAlipay,
		PaymentProvider: model.PaymentProviderAlipay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
		Type:            model.TopUpTypeOnline,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%.2f mode=%s", id, tradeNo, req.Amount, payMoney, setting.AlipayPayMode))
	data := gin.H{"trade_no": tradeNo}
	if qrCode != "" {
		data["qr_code"] = qrCode
	}
	if payURL != "" {
		data["pay_url"] = payURL
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    data,
	})
}

// AlipayNotify 处理支付宝异步通知：RSA2 验签、应用与金额校验后完成入账。
func AlipayNotify(c *gin.Context) {
	if !isAlipayWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.String(http.StatusOK, "fail")
		return
	}

	params := make(map[string]string)
	if err := c.Request.ParseForm(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 webhook 表单解析失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.String(http.StatusOK, "fail")
		return
	}
	for key := range c.Request.PostForm {
		params[key] = c.Request.PostForm.Get(key)
	}
	for key := range c.Request.URL.Query() {
		if _, exists := params[key]; !exists {
			params[key] = c.Request.URL.Query().Get(key)
		}
	}
	if len(params) == 0 {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 参数为空 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.String(http.StatusOK, "fail")
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 webhook 收到请求 path=%q client_ip=%s method=%s params=%q", c.Request.RequestURI, c.ClientIP(), c.Request.Method, common.GetJsonString(params)))

	client, err := buildAlipayClient()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 webhook 初始化客户端失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.String(http.StatusOK, "fail")
		return
	}
	if err := client.VerifyNotify(params); err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 验签失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.String(http.StatusOK, "fail")
		return
	}
	if strings.TrimSpace(params["app_id"]) != strings.TrimSpace(setting.AlipayAppId) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 应用不匹配 path=%q client_ip=%s app_id=%q", c.Request.RequestURI, c.ClientIP(), params["app_id"]))
		c.String(http.StatusOK, "fail")
		return
	}

	tradeNo := params["out_trade_no"]
	tradeStatus := params["trade_status"]
	if tradeStatus != "TRADE_SUCCESS" && tradeStatus != "TRADE_FINISHED" {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 webhook 忽略事件 trade_no=%s trade_status=%s client_ip=%s", tradeNo, tradeStatus, c.ClientIP()))
		c.String(http.StatusOK, "success")
		return
	}
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 缺少订单号 client_ip=%s params=%q", c.ClientIP(), common.GetJsonString(params)))
		c.String(http.StatusOK, "fail")
		return
	}
	paidAmount, err := decimal.NewFromString(params["total_amount"])
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 webhook 金额无效 trade_no=%s total_amount=%q client_ip=%s", tradeNo, params["total_amount"], c.ClientIP()))
		c.String(http.StatusOK, "fail")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	alreadyDone, err := model.RechargeAlipay(tradeNo, paidAmount, c.ClientIP())
	if err != nil {
		switch {
		case errors.Is(err, model.ErrTopUpNotFound):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 回调订单不存在 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrPaymentMethodMismatch):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 订单支付网关不匹配 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrPaymentAmountMismatch):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 订单金额不匹配 trade_no=%s total_amount=%q client_ip=%s", tradeNo, params["total_amount"], c.ClientIP()))
		case errors.Is(err, model.ErrTopUpStatusInvalid):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 订单状态非法 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		default:
			logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 充值处理失败 trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), err.Error()))
		}
		c.String(http.StatusOK, "fail")
		return
	}
	if alreadyDone {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 重复回调幂等忽略 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	} else {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 充值成功 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	}
	c.String(http.StatusOK, "success")
}

type AlipayQueryRequest struct {
	TradeNo string `json:"trade_no"`
}

// SyncAlipayOrder 主动向支付宝查询订单状态，并在已支付时补单入账。
// 用于电脑网站支付回跳后的对账，以及异步通知延迟/丢失时的兜底。
func SyncAlipayOrder(c *gin.Context) {
	if !isAlipayTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置支付宝支付信息"})
		return
	}
	var req AlipayQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.TradeNo) == "" {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	tradeNo := strings.TrimSpace(req.TradeNo)
	id := c.GetInt("id")
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != id || topUp.PaymentProvider != model.PaymentProviderAlipay {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单不存在"})
		return
	}
	if topUp.Status == common.TopUpStatusSuccess {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": true}})
		return
	}

	client, err := buildAlipayClient()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("支付宝 初始化客户端失败 user_id=%d error=%q", id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "支付宝支付配置无效，请联系管理员"})
		return
	}
	status, err := client.QueryTrade(c.Request.Context(), tradeNo)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 订单查询未完成 trade_no=%s user_id=%d code=%s sub_code=%s client_ip=%s", tradeNo, id, status.Code, status.SubCode, c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": false}})
		return
	}
	if status.TradeStatus != "TRADE_SUCCESS" && status.TradeStatus != "TRADE_FINISHED" {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": false}})
		return
	}
	paidAmount, err := decimal.NewFromString(status.TotalAmount)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 查询金额无效 trade_no=%s total_amount=%q", tradeNo, status.TotalAmount))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单状态异常"})
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	alreadyDone, err := model.RechargeAlipay(tradeNo, paidAmount, c.ClientIP())
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("支付宝 主动补单失败 trade_no=%s user_id=%d error=%q", tradeNo, id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单状态异常"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("支付宝 主动查询补单成功 trade_no=%s user_id=%d already_done=%v", tradeNo, id, alreadyDone))
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{"paid": true}})
}
