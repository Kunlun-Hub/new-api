package alipay

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	productionGatewayURL = "https://openapi.alipay.com/gateway.do"
	sandboxGatewayURL    = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"

	tradeSuccessCode = "10000"
	maxResponseBytes = 1 << 20
)

// 支付宝开放平台要求 timestamp 使用 GMT+8 时区，服务器时区可能是 UTC。
var cstZone = time.FixedZone("CST", 8*60*60)

// Config 描述支付宝开放平台应用（公钥模式）的连接参数。
type Config struct {
	AppID           string
	PrivateKey      string // 应用私钥
	AlipayPublicKey string // 支付宝公钥，用于校验异步通知签名
	NotifyURL       string
	GatewayURL      string // 留空时根据 Sandbox 选择默认网关
	Sandbox         bool
}

type Client struct {
	config     Config
	gatewayURL string
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	httpClient *http.Client
}

func NewClient(config Config, httpClient *http.Client) (*Client, error) {
	if strings.TrimSpace(config.AppID) == "" {
		return nil, errors.New("alipay app id is required")
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	privateKey, err := parsePrivateKey(config.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("alipay private key invalid: %w", err)
	}
	publicKey, err := parsePublicKey(config.AlipayPublicKey)
	if err != nil {
		return nil, fmt.Errorf("alipay public key invalid: %w", err)
	}
	gatewayURL := strings.TrimSpace(config.GatewayURL)
	if gatewayURL == "" {
		gatewayURL = productionGatewayURL
		if config.Sandbox {
			gatewayURL = sandboxGatewayURL
		}
	}
	return &Client{
		config:     config,
		gatewayURL: gatewayURL,
		privateKey: privateKey,
		publicKey:  publicKey,
		httpClient: httpClient,
	}, nil
}

// Precreate 调用 alipay.trade.precreate 创建当面付订单，返回二维码内容。
func (c *Client) Precreate(ctx context.Context, outTradeNo string, subject string, totalAmount string) (string, error) {
	bizContent, err := common.Marshal(map[string]string{
		"out_trade_no": outTradeNo,
		"subject":      subject,
		"total_amount": totalAmount,
	})
	if err != nil {
		return "", err
	}
	body, err := c.execute(ctx, "alipay.trade.precreate", string(bizContent))
	if err != nil {
		return "", err
	}
	var response struct {
		Precreate struct {
			Code    string `json:"code"`
			Msg     string `json:"msg"`
			SubCode string `json:"sub_code"`
			SubMsg  string `json:"sub_msg"`
			QRCode  string `json:"qr_code"`
		} `json:"alipay_trade_precreate_response"`
	}
	if err := common.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("alipay response invalid: %w", err)
	}
	result := response.Precreate
	if result.Code != tradeSuccessCode {
		return "", fmt.Errorf("alipay precreate failed: code=%s msg=%s sub_code=%s sub_msg=%s", result.Code, result.Msg, result.SubCode, result.SubMsg)
	}
	if result.QRCode == "" {
		return "", errors.New("alipay precreate returned empty qr code")
	}
	return result.QRCode, nil
}

// TradeStatus 描述 alipay.trade.query 返回的订单状态。
type TradeStatus struct {
	Code        string
	SubCode     string
	SubMsg      string
	TradeStatus string
	TotalAmount string
}

// QueryTrade 调用 alipay.trade.query 查询订单状态。订单不存在时返回
// 业务错误码 ACQ.TRADE_NOT_EXIST，调用方需自行区分。
func (c *Client) QueryTrade(ctx context.Context, outTradeNo string) (TradeStatus, error) {
	bizContent, err := common.Marshal(map[string]string{"out_trade_no": outTradeNo})
	if err != nil {
		return TradeStatus{}, err
	}
	body, err := c.execute(ctx, "alipay.trade.query", string(bizContent))
	if err != nil {
		return TradeStatus{}, err
	}
	var response struct {
		Query struct {
			Code        string `json:"code"`
			SubCode     string `json:"sub_code"`
			SubMsg      string `json:"sub_msg"`
			TradeStatus string `json:"trade_status"`
			TotalAmount string `json:"total_amount"`
		} `json:"alipay_trade_query_response"`
	}
	if err := common.Unmarshal(body, &response); err != nil {
		return TradeStatus{}, fmt.Errorf("alipay response invalid: %w", err)
	}
	result := TradeStatus{
		Code:        response.Query.Code,
		SubCode:     response.Query.SubCode,
		SubMsg:      response.Query.SubMsg,
		TradeStatus: response.Query.TradeStatus,
		TotalAmount: response.Query.TotalAmount,
	}
	if result.Code != tradeSuccessCode {
		return result, fmt.Errorf("alipay trade query failed: code=%s sub_code=%s sub_msg=%s", result.Code, result.SubCode, result.SubMsg)
	}
	return result, nil
}

// PagePay 构造电脑网站支付（alipay.trade.page.pay）的收银台跳转 URL。
// 该接口只做本地签名组装，不发起网络请求；用户浏览器打开返回的 URL 后
// 在支付宝收银台完成支付，异步通知仍走 notify_url。
func (c *Client) PagePay(outTradeNo string, subject string, totalAmount string, returnURL string) (string, error) {
	bizContent, err := common.Marshal(map[string]string{
		"out_trade_no": outTradeNo,
		"subject":      subject,
		"total_amount": totalAmount,
		"product_code": "FAST_INSTANT_TRADE_PAY",
	})
	if err != nil {
		return "", err
	}
	params := c.buildRequestParams("alipay.trade.page.pay", string(bizContent))
	if strings.TrimSpace(returnURL) != "" {
		params["return_url"] = returnURL
	}
	signature, err := signWithKey(params, c.privateKey)
	if err != nil {
		return "", err
	}
	params["sign"] = signature

	values := url.Values{}
	for key, value := range params {
		values.Set(key, value)
	}
	return c.gatewayURL + "?" + values.Encode(), nil
}

// VerifyNotify 校验支付宝异步通知的 RSA2 签名，params 为已解码的表单参数。
func (c *Client) VerifyNotify(params map[string]string) error {
	sign := strings.TrimSpace(params["sign"])
	if sign == "" {
		return errors.New("alipay notify missing sign")
	}
	if signType := params["sign_type"]; signType != "" && !strings.EqualFold(signType, "RSA2") {
		return fmt.Errorf("alipay notify unsupported sign type: %s", signType)
	}
	signature, err := base64Decode(sign)
	if err != nil {
		return errors.New("alipay notify signature is not valid base64")
	}
	digest := sha256.Sum256([]byte(notifySignContent(params)))
	if err := rsa.VerifyPKCS1v15(c.publicKey, crypto.SHA256, digest[:], signature); err != nil {
		return errors.New("alipay notify signature verification failed")
	}
	return nil
}

// buildRequestParams 组装支付宝公共请求参数（不含 sign）。
func (c *Client) buildRequestParams(method string, bizContent string) map[string]string {
	params := map[string]string{
		"app_id":      c.config.AppID,
		"method":      method,
		"format":      "JSON",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   time.Now().In(cstZone).Format("2006-01-02 15:04:05"),
		"version":     "1.0",
		"biz_content": bizContent,
	}
	if c.config.NotifyURL != "" {
		params["notify_url"] = c.config.NotifyURL
	}
	return params
}

func (c *Client) execute(ctx context.Context, method string, bizContent string) ([]byte, error) {
	params := c.buildRequestParams(method, bizContent)
	signature, err := signWithKey(params, c.privateKey)
	if err != nil {
		return nil, err
	}
	params["sign"] = signature

	form := url.Values{}
	for key, value := range params {
		form.Set(key, value)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.gatewayURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("alipay gateway http status %d", response.StatusCode)
	}
	return body, nil
}
