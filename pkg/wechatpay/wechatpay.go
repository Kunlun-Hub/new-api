package wechatpay

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
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
	defaultAPIBaseURL = "https://api.mch.weixin.qq.com"
	maxResponseBytes  = 1 << 20

	nativePrepayPath = "/v3/pay/transactions/native"
	tradeStateSuffix = "/v3/pay/transactions/out-trade-no/"
)

// Config 描述微信支付 API v3（商户号 + 商户 API 证书）的连接参数。
// PlatformPublicKey/PlatformPublicKeyID 为可选的微信支付公钥，用于校验回调签名。
type Config struct {
	MchID               string
	AppID               string
	PrivateKey          string // apiclient_key.pem 内容
	CertSerial          string // 商户 API 证书序列号
	APIv3Key            string // APIv3 密钥，32 字节
	PlatformPublicKey   string
	PlatformPublicKeyID string
	NotifyURL           string
	APIBaseURL          string // 留空使用官方地址
}

type Client struct {
	config      Config
	apiBaseURL  string
	privateKey  *rsa.PrivateKey
	platformKey *rsa.PublicKey
	httpClient  *http.Client
}

func NewClient(config Config, httpClient *http.Client) (*Client, error) {
	if strings.TrimSpace(config.MchID) == "" {
		return nil, errors.New("wechat pay merchant id is required")
	}
	if strings.TrimSpace(config.AppID) == "" {
		return nil, errors.New("wechat pay app id is required")
	}
	if strings.TrimSpace(config.CertSerial) == "" {
		return nil, errors.New("wechat pay certificate serial is required")
	}
	if len(config.APIv3Key) != 32 {
		return nil, errors.New("wechat pay api v3 key must be 32 bytes")
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	privateKey, err := parsePrivateKey(config.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("wechat pay private key invalid: %w", err)
	}
	var platformKey *rsa.PublicKey
	if strings.TrimSpace(config.PlatformPublicKey) != "" {
		platformKey, err = parsePublicKey(config.PlatformPublicKey)
		if err != nil {
			return nil, fmt.Errorf("wechat pay platform public key invalid: %w", err)
		}
	}
	apiBaseURL := strings.TrimRight(strings.TrimSpace(config.APIBaseURL), "/")
	if apiBaseURL == "" {
		apiBaseURL = defaultAPIBaseURL
	}
	config.CertSerial = strings.TrimSpace(config.CertSerial)
	return &Client{
		config:      config,
		apiBaseURL:  apiBaseURL,
		privateKey:  privateKey,
		platformKey: platformKey,
		httpClient:  httpClient,
	}, nil
}

// CallbackSerial 返回配置的微信支付公钥 ID，用于匹配回调的 Wechatpay-Serial 头。
func (c *Client) CallbackSerial() string {
	return strings.TrimSpace(c.config.PlatformPublicKeyID)
}

// NativePrepay 调用 Native 下单接口，返回用于生成二维码的 code_url。
func (c *Client) NativePrepay(ctx context.Context, outTradeNo string, description string, totalFen int64, attach string) (string, error) {
	if totalFen <= 0 {
		return "", errors.New("wechat pay amount must be positive")
	}
	request := nativePrepayRequest{
		AppID:       c.config.AppID,
		MchID:       c.config.MchID,
		Description: description,
		OutTradeNo:  outTradeNo,
		NotifyURL:   c.config.NotifyURL,
		Attach:      attach,
	}
	request.Amount.Total = totalFen
	request.Amount.Currency = "CNY"
	body, err := common.Marshal(request)
	if err != nil {
		return "", err
	}
	data, err := c.doRequest(ctx, http.MethodPost, nativePrepayPath, string(body))
	if err != nil {
		return "", err
	}
	var response struct {
		CodeURL string `json:"code_url"`
	}
	if err := common.Unmarshal(data, &response); err != nil {
		return "", fmt.Errorf("wechat pay response invalid: %w", err)
	}
	if strings.TrimSpace(response.CodeURL) == "" {
		return "", errors.New("wechat pay native prepay returned empty code url")
	}
	return response.CodeURL, nil
}

// OrderStatus 描述查询订单接口返回的关键字段。
type OrderStatus struct {
	TradeState    string
	TotalFen      int64
	TransactionID string
}

// QueryOrder 查询商户订单状态。订单不存在时返回错误，调用方按未支付处理。
func (c *Client) QueryOrder(ctx context.Context, outTradeNo string) (OrderStatus, error) {
	path := tradeStateSuffix + url.PathEscape(outTradeNo) + "?mchid=" + url.QueryEscape(c.config.MchID)
	data, err := c.doRequest(ctx, http.MethodGet, path, "")
	if err != nil {
		return OrderStatus{}, err
	}
	var response struct {
		TradeState    string `json:"trade_state"`
		TransactionID string `json:"transaction_id"`
		Amount        struct {
			Total int64 `json:"total"`
		} `json:"amount"`
	}
	if err := common.Unmarshal(data, &response); err != nil {
		return OrderStatus{}, fmt.Errorf("wechat pay response invalid: %w", err)
	}
	return OrderStatus{
		TradeState:    response.TradeState,
		TotalFen:      response.Amount.Total,
		TransactionID: response.TransactionID,
	}, nil
}

// Notification 是回调 resource 解密后的订单通知。
type Notification struct {
	MchID         string `json:"mchid"`
	OutTradeNo    string `json:"out_trade_no"`
	TransactionID string `json:"transaction_id"`
	TradeType     string `json:"trade_type"`
	TradeState    string `json:"trade_state"`
	Amount        struct {
		Total      int64  `json:"total"`
		PayerTotal int64  `json:"payer_total"`
		Currency   string `json:"currency"`
	} `json:"amount"`
}

// DecryptNotify 解密回调中的 resource 密文。
func (c *Client) DecryptNotify(ciphertext string, nonce string, associatedData string) (*Notification, error) {
	if strings.TrimSpace(ciphertext) == "" {
		return nil, errors.New("wechat pay notify missing ciphertext")
	}
	plaintext, err := decryptResource(c.config.APIv3Key, ciphertext, nonce, associatedData)
	if err != nil {
		return nil, err
	}
	var notification Notification
	if err := common.Unmarshal(plaintext, &notification); err != nil {
		return nil, fmt.Errorf("wechat pay notify payload invalid: %w", err)
	}
	return &notification, nil
}

// HasPlatformKey 表示是否配置了可用于校验回调签名的微信支付公钥。
func (c *Client) HasPlatformKey() bool {
	return c.platformKey != nil
}

// VerifyNotify 使用微信支付公钥校验回调签名，serial 为回调头中的证书/公钥 ID。
func (c *Client) VerifyNotify(timestamp string, nonce string, body string, signature string, serial string) error {
	if c.platformKey == nil {
		return errors.New("wechat pay platform public key is not configured")
	}
	if expected := c.CallbackSerial(); expected != "" && normalizeSerial(serial) != normalizeSerial(expected) {
		return fmt.Errorf("wechat pay notify serial mismatch: got %s", serial)
	}
	if strings.TrimSpace(timestamp) == "" || strings.TrimSpace(nonce) == "" || strings.TrimSpace(signature) == "" {
		return errors.New("wechat pay notify signature headers incomplete")
	}
	return verifyWithKey(verifyMessage(timestamp, nonce, body), signature, c.platformKey)
}

func (c *Client) doRequest(ctx context.Context, method string, pathWithQuery string, body string) ([]byte, error) {
	var payload io.Reader
	if body != "" {
		payload = strings.NewReader(body)
	}
	request, err := http.NewRequestWithContext(ctx, method, c.apiBaseURL+pathWithQuery, payload)
	if err != nil {
		return nil, err
	}
	timestamp := time.Now().Unix()
	nonce, err := randomNonce()
	if err != nil {
		return nil, err
	}
	signature, err := signWithKey(signatureMessage(method, pathWithQuery, fmt.Sprintf("%d", timestamp), nonce, body), c.privateKey)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "new-api-wechatpay/1.0")
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	request.Header.Set("Authorization", fmt.Sprintf(
		`WECHATPAY2-SHA256-RSA2048 mchid="%s",nonce_str="%s",signature="%s",timestamp="%d",serial_no="%s"`,
		c.config.MchID, nonce, signature, timestamp, c.config.CertSerial,
	))

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, gatewayError(response.StatusCode, data)
	}
	return data, nil
}

func gatewayError(statusCode int, data []byte) error {
	var payload struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	if err := common.Unmarshal(data, &payload); err == nil && payload.Code != "" {
		return fmt.Errorf("wechat pay gateway error: http_status=%d code=%s message=%s", statusCode, payload.Code, payload.Message)
	}
	return fmt.Errorf("wechat pay gateway http status %d", statusCode)
}

const nonceAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

func randomNonce() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	for i := range buffer {
		buffer[i] = nonceAlphabet[int(buffer[i])%len(nonceAlphabet)]
	}
	return string(buffer), nil
}
