package middleware

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

const (
	turnstileSiteverifyURL    = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	turnstileTokenMaxLength   = 2048
	turnstileResponseMaxBytes = 64 << 10
	turnstileTokenTTL         = 5 * time.Minute
	turnstileReplayKeyPrefix  = "turnstile:token:"
)

var turnstileHTTPClient = &http.Client{Timeout: 10 * time.Second}
var turnstileReplayLimiter common.InMemoryRateLimiter

type turnstileCheckResponse struct {
	Success    bool     `json:"success"`
	Hostname   string   `json:"hostname"`
	Action     string   `json:"action"`
	ErrorCodes []string `json:"error-codes"`
}

func TurnstileCheck(action string) gin.HandlerFunc {
	return turnstileCheckWithActions(turnstileSiteverifyURL, turnstileHTTPClient, []string{action})
}

// TurnstileCheckForJSONIntent applies Turnstile verification only when the
// JSON request body declares the protected intent. The body is restored for
// the downstream controller.
func TurnstileCheckForJSONIntent(action string, intent string, additionalActions ...string) gin.HandlerFunc {
	actions := append([]string{action}, additionalActions...)
	return turnstileCheckForJSONIntent(turnstileSiteverifyURL, turnstileHTTPClient, actions, intent)
}

func turnstileCheckForJSONIntent(siteverifyURL string, client *http.Client, actions []string, intent string) gin.HandlerFunc {
	check := turnstileCheckWithActions(siteverifyURL, client, actions)
	return func(c *gin.Context) {
		if !common.TurnstileCheckEnabled {
			c.Next()
			return
		}

		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			common.ApiErrorT(c, "Invalid parameters")
			c.Abort()
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(body))

		var payload struct {
			Intent string `json:"intent"`
		}
		if err := common.Unmarshal(body, &payload); err != nil || strings.TrimSpace(payload.Intent) != intent {
			c.Next()
			return
		}

		check(c)
	}
}

func turnstileCheck(siteverifyURL string, client *http.Client, action string) gin.HandlerFunc {
	return turnstileCheckWithActions(siteverifyURL, client, []string{action})
}

func turnstileCheckWithActions(siteverifyURL string, client *http.Client, actions []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !common.TurnstileCheckEnabled {
			c.Next()
			return
		}

		token := strings.TrimSpace(c.GetHeader("X-Turnstile-Token"))
		if token == "" {
			token = strings.TrimSpace(c.Query("turnstile"))
		}
		if token == "" {
			common.ApiErrorT(c, "Turnstile token is empty")
			c.Abort()
			return
		}
		if len(token) > turnstileTokenMaxLength {
			common.ApiErrorT(c, "Turnstile verification failed, please refresh and try again!")
			c.Abort()
			return
		}

		secret := strings.TrimSpace(common.TurnstileSecretKey)
		if strings.TrimSpace(common.TurnstileSiteKey) == "" || secret == "" {
			common.SysLog("Turnstile is enabled but the site key or secret key is not configured")
			common.ApiErrorT(c, "Turnstile verification failed, please refresh and try again!")
			c.Abort()
			return
		}

		claimed, err := claimTurnstileToken(c.Request.Context(), token)
		if err != nil {
			common.SysLog("Turnstile replay protection failed: " + err.Error())
			common.ApiErrorT(c, "Turnstile verification failed, please refresh and try again!")
			c.Abort()
			return
		}
		if !claimed {
			common.SysLog("Turnstile token replay detected")
			common.ApiErrorT(c, "Turnstile verification failed, please refresh and try again!")
			c.Abort()
			return
		}

		err = verifyTurnstile(
			c.Request.Context(),
			client,
			siteverifyURL,
			secret,
			token,
			c.ClientIP(),
			actions,
			turnstileAllowedHostnames(c.Request.Host),
		)
		if err != nil {
			common.SysLog("Turnstile verification failed: " + err.Error())
			common.ApiErrorT(c, "Turnstile verification failed, please refresh and try again!")
			c.Abort()
			return
		}

		c.Next()
	}
}

func claimTurnstileToken(ctx context.Context, token string) (bool, error) {
	digest := sha256.Sum256([]byte(token))
	key := turnstileReplayKeyPrefix + hex.EncodeToString(digest[:])

	if common.RedisEnabled {
		if common.RDB == nil {
			return false, fmt.Errorf("Redis client is not initialized")
		}
		claimed, err := common.RDB.SetNX(ctx, key, "1", turnstileTokenTTL).Result()
		if err != nil {
			return false, fmt.Errorf("claim token in Redis: %w", err)
		}
		return claimed, nil
	}

	turnstileReplayLimiter.Init(turnstileTokenTTL)
	return turnstileReplayLimiter.Request(key, 1, int64(turnstileTokenTTL/time.Second)), nil
}

func verifyTurnstile(
	ctx context.Context,
	client *http.Client,
	siteverifyURL string,
	secret string,
	token string,
	remoteIP string,
	actions []string,
	allowedHostnames []string,
) error {
	form := url.Values{
		"secret":   {secret},
		"response": {token},
	}
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		siteverifyURL,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return fmt.Errorf("create siteverify request: %w", err)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	rawResponse, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("call siteverify: %w", err)
	}
	defer rawResponse.Body.Close()

	if rawResponse.StatusCode != http.StatusOK {
		return fmt.Errorf("siteverify returned HTTP %d", rawResponse.StatusCode)
	}

	var response turnstileCheckResponse
	if err := common.DecodeJson(io.LimitReader(rawResponse.Body, turnstileResponseMaxBytes), &response); err != nil {
		return fmt.Errorf("decode siteverify response: %w", err)
	}
	if !response.Success {
		return fmt.Errorf("siteverify rejected the token: %s", strings.Join(response.ErrorCodes, ", "))
	}
	if !slices.Contains(actions, response.Action) {
		return fmt.Errorf("siteverify action mismatch: expected one of %q, got %q", actions, response.Action)
	}
	if !slices.Contains(allowedHostnames, normalizeTurnstileHostname(response.Hostname)) {
		return fmt.Errorf("siteverify hostname mismatch: got %q", response.Hostname)
	}
	return nil
}

func turnstileAllowedHostnames(requestHost string) []string {
	candidates := []string{requestHost}
	if serverAddress, err := url.Parse(strings.TrimSpace(system_setting.ServerAddress)); err == nil {
		candidates = append(candidates, serverAddress.Hostname())
	}

	hostnames := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		hostname := normalizeTurnstileHostname(candidate)
		if hostname != "" && !slices.Contains(hostnames, hostname) {
			hostnames = append(hostnames, hostname)
		}
	}
	return hostnames
}

func normalizeTurnstileHostname(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if parsed, err := url.Parse(value); err == nil && parsed.Hostname() != "" {
		value = parsed.Hostname()
	} else if host, _, err := net.SplitHostPort(value); err == nil {
		value = host
	}
	return strings.TrimSuffix(strings.ToLower(strings.Trim(value, "[]")), ".")
}
