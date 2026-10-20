package wechatpay

import (
	"context"
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testAPIv3Key = "0123456789abcdef0123456789abcdef"

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

// parseAuthorization 从 Authorization 头中解析待验签字段。
func parseAuthorization(t *testing.T, header string) (signature string, timestamp string, nonce string, serial string) {
	t.Helper()
	require.True(t, strings.HasPrefix(header, "WECHATPAY2-SHA256-RSA2048 "), header)
	fields := strings.TrimPrefix(header, "WECHATPAY2-SHA256-RSA2048 ")
	for _, field := range strings.Split(fields, ",") {
		name, value, found := strings.Cut(field, "=")
		require.True(t, found, field)
		value = strings.Trim(value, `"`)
		switch name {
		case "signature":
			signature = value
		case "timestamp":
			timestamp = value
		case "nonce_str":
			nonce = value
		case "serial_no":
			serial = value
		}
	}
	require.NotEmpty(t, signature)
	require.NotEmpty(t, timestamp)
	require.NotEmpty(t, nonce)
	require.NotEmpty(t, serial)
	return signature, timestamp, nonce, serial
}

func TestNativePrepaySignsRequestAndReturnsCodeURL(t *testing.T) {
	key, privateKey, publicKey := generateTestKeyPair(t)

	var requestBody string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v3/pay/transactions/native", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)

		data, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		requestBody = string(data)

		signature, timestamp, nonce, serial := parseAuthorization(t, r.Header.Get("Authorization"))
		assert.Equal(t, "MCH123456", serial)
		decoded, err := base64.StdEncoding.DecodeString(signature)
		require.NoError(t, err)
		digest := sha256.Sum256([]byte(signatureMessage(http.MethodPost, "/v3/pay/transactions/native", timestamp, nonce, requestBody)))
		require.NoError(t, rsa.VerifyPKCS1v15(&key.PublicKey, crypto.SHA256, digest[:], decoded))

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code_url":"weixin://wxpay/bizpayurl?pr=abc123"}`))
	}))
	defer server.Close()

	client, err := NewClient(Config{
		MchID:      "1900000001",
		AppID:      "wx1234567890",
		PrivateKey: privateKey,
		CertSerial: "MCH123456",
		APIv3Key:   testAPIv3Key,
		NotifyURL:  "https://example.com/api/user/wechat/notify",
		APIBaseURL: server.URL,
	}, server.Client())
	require.NoError(t, err)

	codeURL, err := client.NativePrepay(context.Background(), "USR1NOABC", "TUC10", 100, "")
	require.NoError(t, err)
	assert.Equal(t, "weixin://wxpay/bizpayurl?pr=abc123", codeURL)

	var payload map[string]any
	require.NoError(t, common.UnmarshalJsonStr(requestBody, &payload))
	assert.Equal(t, "wx1234567890", payload["appid"])
	assert.Equal(t, "1900000001", payload["mchid"])
	assert.Equal(t, "USR1NOABC", payload["out_trade_no"])
	assert.Equal(t, "https://example.com/api/user/wechat/notify", payload["notify_url"])
	amount, ok := payload["amount"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, float64(100), amount["total"])
	assert.Equal(t, "CNY", amount["currency"])
	_ = publicKey
}

func TestDecryptNotifyReturnsOrder(t *testing.T) {
	_, privateKey, publicKey := generateTestKeyPair(t)
	client, err := NewClient(Config{
		MchID:      "1900000001",
		AppID:      "wx1234567890",
		PrivateKey: privateKey,
		CertSerial: "MCH123456",
		APIv3Key:   testAPIv3Key,
	}, nil)
	require.NoError(t, err)

	plaintext := `{"mchid":"1900000001","out_trade_no":"USR1NOABC","transaction_id":"4200001","trade_type":"NATIVE","trade_state":"SUCCESS","amount":{"total":100,"payer_total":100,"currency":"CNY"}}`
	block, err := aes.NewCipher([]byte(testAPIv3Key))
	require.NoError(t, err)
	gcm, err := cipher.NewGCM(block)
	require.NoError(t, err)
	nonce := "abcdef123456"
	sealed := gcm.Seal(nil, []byte(nonce), []byte(plaintext), []byte("transaction"))
	ciphertext := base64.StdEncoding.EncodeToString(sealed)

	notification, err := client.DecryptNotify(ciphertext, nonce, "transaction")
	require.NoError(t, err)
	assert.Equal(t, "1900000001", notification.MchID)
	assert.Equal(t, "USR1NOABC", notification.OutTradeNo)
	assert.Equal(t, "SUCCESS", notification.TradeState)
	assert.Equal(t, int64(100), notification.Amount.Total)

	_, err = client.DecryptNotify(ciphertext, nonce, "other-associated-data")
	require.Error(t, err)
	_ = publicKey
}

func TestVerifyNotifyChecksSignature(t *testing.T) {
	key, privateKey, publicKey := generateTestKeyPair(t)
	client, err := NewClient(Config{
		MchID:             "1900000001",
		AppID:             "wx1234567890",
		PrivateKey:        privateKey,
		CertSerial:        "MCH123456",
		APIv3Key:          testAPIv3Key,
		PlatformPublicKey: publicKey,
	}, nil)
	require.NoError(t, err)

	body := `{"id":"evt-1"}`
	message := verifyMessage("1700000000", "nonce123", body)
	digest := sha256.Sum256([]byte(message))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	require.NoError(t, err)
	encoded := base64.StdEncoding.EncodeToString(signature)

	require.NoError(t, client.VerifyNotify("1700000000", "nonce123", body, encoded, ""))
	require.Error(t, client.VerifyNotify("1700000000", "nonce123", `{"id":"evt-2"}`, encoded, ""))
}

func TestQueryOrderParsesState(t *testing.T) {
	_, privateKey, _ := generateTestKeyPair(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/v3/pay/transactions/out-trade-no/USR1NOABC", r.URL.Path)
		assert.Equal(t, "1900000001", r.URL.Query().Get("mchid"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"trade_state":"SUCCESS","transaction_id":"4200001","amount":{"total":100}}`))
	}))
	defer server.Close()

	client, err := NewClient(Config{
		MchID:      "1900000001",
		AppID:      "wx1234567890",
		PrivateKey: privateKey,
		CertSerial: "MCH123456",
		APIv3Key:   testAPIv3Key,
		APIBaseURL: server.URL,
	}, server.Client())
	require.NoError(t, err)

	status, err := client.QueryOrder(context.Background(), "USR1NOABC")
	require.NoError(t, err)
	assert.Equal(t, "SUCCESS", status.TradeState)
	assert.Equal(t, int64(100), status.TotalFen)
	assert.Equal(t, "4200001", status.TransactionID)
}
