package alipay

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func generateTestKeyPair(t *testing.T) (*rsa.PrivateKey, string, string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	privateKeyDER, err := x509.MarshalPKCS8PrivateKey(key)
	require.NoError(t, err)
	publicKeyDER, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	require.NoError(t, err)
	return key, base64.StdEncoding.EncodeToString(privateKeyDER), base64.StdEncoding.EncodeToString(publicKeyDER)
}

func TestVerifyNotifyChecksRSASignature(t *testing.T) {
	key, privateKey, publicKey := generateTestKeyPair(t)
	client, err := NewClient(Config{
		AppID:           "2021000000000000",
		PrivateKey:      privateKey,
		AlipayPublicKey: publicKey,
	}, nil)
	require.NoError(t, err)

	params := map[string]string{
		"app_id":       "2021000000000000",
		"out_trade_no": "USR1NOABC",
		"total_amount": "9.99",
		"trade_status": "TRADE_SUCCESS",
	}
	// 手工构造规范待签名串，独立验证参数排序与拼接规则。
	content := "app_id=2021000000000000&out_trade_no=USR1NOABC&total_amount=9.99&trade_status=TRADE_SUCCESS"
	digest := sha256.Sum256([]byte(content))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	require.NoError(t, err)
	params["sign"] = base64.StdEncoding.EncodeToString(signature)
	params["sign_type"] = "RSA2"

	require.NoError(t, client.VerifyNotify(params))

	params["total_amount"] = "0.01"
	require.Error(t, client.VerifyNotify(params))
}

func TestNewClientRejectsInvalidKeys(t *testing.T) {
	_, privateKey, publicKey := generateTestKeyPair(t)

	_, err := NewClient(Config{AppID: "app", PrivateKey: "not-a-key", AlipayPublicKey: publicKey}, nil)
	require.Error(t, err)

	_, err = NewClient(Config{AppID: "app", PrivateKey: privateKey, AlipayPublicKey: "not-a-key"}, nil)
	require.Error(t, err)
}

func TestPrecreateSendsSignedRequestAndParsesQRCode(t *testing.T) {
	key, privateKey, publicKey := generateTestKeyPair(t)

	var requestValues url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "bad form", http.StatusBadRequest)
			return
		}
		requestValues = r.PostForm
		params := make(map[string]string, len(r.PostForm))
		for name, values := range r.PostForm {
			params[name] = values[0]
		}
		signature := params["sign"]
		delete(params, "sign")
		// 请求签名必须包含 sign_type，只有异步通知验签才剔除。
		digest := sha256.Sum256([]byte(requestSignContent(params)))
		decoded, err := base64.StdEncoding.DecodeString(signature)
		if err != nil || rsa.VerifyPKCS1v15(&key.PublicKey, crypto.SHA256, digest[:], decoded) != nil {
			http.Error(w, "bad signature", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"alipay_trade_precreate_response":{"code":"10000","msg":"Success","qr_code":"https://qr.alipay.com/bax123456"},"sign":"server-sign"}`))
	}))
	defer server.Close()

	client, err := NewClient(Config{
		AppID:           "2021000000000000",
		PrivateKey:      privateKey,
		AlipayPublicKey: publicKey,
		NotifyURL:       "https://example.com/api/user/alipay/notify",
		GatewayURL:      server.URL,
	}, server.Client())
	require.NoError(t, err)

	qrCode, err := client.Precreate(context.Background(), "USR1NOABC", "TUC10", "9.99")
	require.NoError(t, err)
	assert.Equal(t, "https://qr.alipay.com/bax123456", qrCode)

	assert.Equal(t, "2021000000000000", requestValues.Get("app_id"))
	assert.Equal(t, "alipay.trade.precreate", requestValues.Get("method"))
	assert.Equal(t, "RSA2", requestValues.Get("sign_type"))
	assert.Equal(t, "https://example.com/api/user/alipay/notify", requestValues.Get("notify_url"))
	var bizContent map[string]string
	require.NoError(t, common.UnmarshalJsonStr(requestValues.Get("biz_content"), &bizContent))
	assert.Equal(t, "USR1NOABC", bizContent["out_trade_no"])
	assert.Equal(t, "TUC10", bizContent["subject"])
	assert.Equal(t, "9.99", bizContent["total_amount"])
}

func TestPrecreateReturnsGatewayError(t *testing.T) {
	_, privateKey, publicKey := generateTestKeyPair(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"alipay_trade_precreate_response":{"code":"40004","msg":"Business Failed","sub_code":"ACQ.INVALID_PARAMETER","sub_msg":"Invalid parameter"}}`))
	}))
	defer server.Close()

	client, err := NewClient(Config{
		AppID:           "2021000000000000",
		PrivateKey:      privateKey,
		AlipayPublicKey: publicKey,
		GatewayURL:      server.URL,
	}, server.Client())
	require.NoError(t, err)

	_, err = client.Precreate(context.Background(), "USR1NOABC", "TUC10", "9.99")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "ACQ.INVALID_PARAMETER")
}

func TestPagePayBuildsSignedRedirectURL(t *testing.T) {
	key, privateKey, publicKey := generateTestKeyPair(t)
	client, err := NewClient(Config{
		AppID:           "2021000000000000",
		PrivateKey:      privateKey,
		AlipayPublicKey: publicKey,
		NotifyURL:       "https://example.com/api/user/alipay/notify",
		GatewayURL:      "https://openapi.alipay.com/gateway.do",
	}, nil)
	require.NoError(t, err)

	payURL, err := client.PagePay("USR1NOABC", "TUC10", "9.99", "https://example.com/wallet?alipay_trade_no=USR1NOABC")
	require.NoError(t, err)

	parsed, err := url.Parse(payURL)
	require.NoError(t, err)
	assert.Equal(t, "https://openapi.alipay.com/gateway.do", parsed.Scheme+"://"+parsed.Host+parsed.Path)

	values := parsed.Query()
	assert.Equal(t, "alipay.trade.page.pay", values.Get("method"))
	assert.Equal(t, "RSA2", values.Get("sign_type"))
	assert.Equal(t, "2021000000000000", values.Get("app_id"))
	assert.Equal(t, "https://example.com/wallet?alipay_trade_no=USR1NOABC", values.Get("return_url"))

	params := make(map[string]string, len(values))
	for name := range values {
		params[name] = values.Get(name)
	}
	signature := params["sign"]
	require.NotEmpty(t, signature)
	delete(params, "sign")
	digest := sha256.Sum256([]byte(requestSignContent(params)))
	decoded, err := base64.StdEncoding.DecodeString(signature)
	require.NoError(t, err)
	require.NoError(t, rsa.VerifyPKCS1v15(&key.PublicKey, crypto.SHA256, digest[:], decoded))

	var bizContent map[string]string
	require.NoError(t, common.UnmarshalJsonStr(values.Get("biz_content"), &bizContent))
	assert.Equal(t, "FAST_INSTANT_TRADE_PAY", bizContent["product_code"])
	assert.Equal(t, "USR1NOABC", bizContent["out_trade_no"])
	assert.Equal(t, "9.99", bizContent["total_amount"])
}

func TestQueryTradeParsesStatus(t *testing.T) {
	_, privateKey, publicKey := generateTestKeyPair(t)

	var requestValues url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseForm())
		requestValues = r.PostForm
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"alipay_trade_query_response":{"code":"10000","msg":"Success","trade_status":"TRADE_SUCCESS","total_amount":"9.99"},"sign":"server-sign"}`))
	}))
	defer server.Close()

	client, err := NewClient(Config{
		AppID:           "2021000000000000",
		PrivateKey:      privateKey,
		AlipayPublicKey: publicKey,
		GatewayURL:      server.URL,
	}, server.Client())
	require.NoError(t, err)

	status, err := client.QueryTrade(context.Background(), "USR1NOABC")
	require.NoError(t, err)
	assert.Equal(t, "TRADE_SUCCESS", status.TradeStatus)
	assert.Equal(t, "9.99", status.TotalAmount)
	assert.Equal(t, "alipay.trade.query", requestValues.Get("method"))
	var bizContent map[string]string
	require.NoError(t, common.UnmarshalJsonStr(requestValues.Get("biz_content"), &bizContent))
	assert.Equal(t, "USR1NOABC", bizContent["out_trade_no"])
}
