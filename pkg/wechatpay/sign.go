package wechatpay

import (
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
)

// signatureMessage 按微信支付 API v3 规则拼接待签名串，body 为空时保留空行。
func signatureMessage(method string, pathWithQuery string, timestamp string, nonce string, body string) string {
	return method + "\n" + pathWithQuery + "\n" + timestamp + "\n" + nonce + "\n" + body + "\n"
}

// verifyMessage 按微信支付回调验签规则拼接待验签串。
func verifyMessage(timestamp string, nonce string, body string) string {
	return timestamp + "\n" + nonce + "\n" + body + "\n"
}

func signWithKey(message string, key *rsa.PrivateKey) (string, error) {
	digest := sha256.Sum256([]byte(message))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

func verifyWithKey(message string, signature string, key *rsa.PublicKey) error {
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(signature))
	if err != nil {
		return errors.New("signature is not valid base64")
	}
	digest := sha256.Sum256([]byte(message))
	return rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], decoded)
}

// decryptResource 用 APIv3 密钥解密回调中的 resource（AEAD_AES_256_GCM）。
func decryptResource(apiV3Key string, ciphertext string, nonce string, associatedData string) ([]byte, error) {
	block, err := aes.NewCipher([]byte(apiV3Key))
	if err != nil {
		return nil, fmt.Errorf("wechat pay api v3 key invalid: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	data, err := base64.StdEncoding.DecodeString(strings.TrimSpace(ciphertext))
	if err != nil {
		return nil, errors.New("wechat pay notify ciphertext is not valid base64")
	}
	plaintext, err := gcm.Open(nil, []byte(nonce), data, []byte(associatedData))
	if err != nil {
		return nil, fmt.Errorf("wechat pay notify decrypt failed: %w", err)
	}
	return plaintext, nil
}

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

// normalizeSerial 统一证书序列号为小写无空格形式，便于与回调头比对。
func normalizeSerial(serial string) string {
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(serial), " ", ""))
}
