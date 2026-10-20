package alipay

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"sort"
	"strings"
)

// requestSignContent 按支付宝请求签名规则生成待签名串：剔除 sign 与空值后按 key
// 升序拼接。注意请求签名必须包含 sign_type，异步通知验签则必须剔除，两者规则不同。
func requestSignContent(params map[string]string) string {
	return joinSortedParams(params, "sign")
}

// notifySignContent 按异步通知验签规则生成待签名串：剔除 sign、sign_type 与空值。
func notifySignContent(params map[string]string) string {
	return joinSortedParams(params, "sign", "sign_type")
}

func joinSortedParams(params map[string]string, excluded ...string) string {
	skip := make(map[string]struct{}, len(excluded))
	for _, key := range excluded {
		skip[key] = struct{}{}
	}
	keys := make([]string, 0, len(params))
	for key, value := range params {
		if _, ok := skip[key]; ok || value == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var builder strings.Builder
	for i, key := range keys {
		if i > 0 {
			builder.WriteByte('&')
		}
		builder.WriteString(key)
		builder.WriteByte('=')
		builder.WriteString(params[key])
	}
	return builder.String()
}

func signWithKey(params map[string]string, key *rsa.PrivateKey) (string, error) {
	digest := sha256.Sum256([]byte(requestSignContent(params)))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

func base64Decode(value string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(strings.TrimSpace(value))
}

func parsePrivateKey(raw string) (*rsa.PrivateKey, error) {
	der, err := decodePemBody(raw)
	if err != nil {
		return nil, err
	}
	if key, err := x509.ParsePKCS8PrivateKey(der); err == nil {
		rsaKey, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, errors.New("not an RSA private key")
		}
		return rsaKey, nil
	}
	return x509.ParsePKCS1PrivateKey(der)
}

func parsePublicKey(raw string) (*rsa.PublicKey, error) {
	der, err := decodePemBody(raw)
	if err != nil {
		return nil, err
	}
	if key, err := x509.ParsePKIXPublicKey(der); err == nil {
		rsaKey, ok := key.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("not an RSA public key")
		}
		return rsaKey, nil
	}
	return x509.ParsePKCS1PublicKey(der)
}

// decodePemBody 兼容带 PEM 头（含换行）与支付宝控制台直接复制的单行 Base64。
func decodePemBody(raw string) ([]byte, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil, errors.New("key is empty")
	}
	var builder strings.Builder
	for line := range strings.SplitSeq(value, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "-----") {
			continue
		}
		builder.WriteString(line)
	}
	der, err := base64.StdEncoding.DecodeString(builder.String())
	if err != nil {
		return nil, errors.New("key is not valid base64")
	}
	return der, nil
}
