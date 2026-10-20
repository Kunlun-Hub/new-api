package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTurnstileAccessLogRedaction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousWriter := gin.DefaultWriter
	var output bytes.Buffer
	gin.DefaultWriter = &output
	t.Cleanup(func() { gin.DefaultWriter = previousWriter })

	router := gin.New()
	SetUpLogger(router)
	router.POST("/api/user/login", func(c *gin.Context) {
		assert.Equal(t, "turnstile-query-secret", c.Query("turnstile"))
		assert.Equal(t, "keep", c.Query("keep"))
		c.Status(http.StatusNoContent)
	})
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/user/login?turnstile=turnstile-query-secret&keep=keep",
		nil,
	)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusNoContent, response.Code)
	assert.Contains(t, output.String(), "turnstile=[REDACTED]")
	assert.Contains(t, output.String(), "keep=keep")
	assert.NotContains(t, output.String(), "turnstile-query-secret")
}

func TestTurnstileCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	previousEnabled := common.TurnstileCheckEnabled
	previousSiteKey := common.TurnstileSiteKey
	previousSecretKey := common.TurnstileSecretKey
	previousServerAddress := system_setting.ServerAddress
	previousRedisEnabled := common.RedisEnabled
	previousRedisClient := common.RDB
	t.Cleanup(func() {
		common.TurnstileCheckEnabled = previousEnabled
		common.TurnstileSiteKey = previousSiteKey
		common.TurnstileSecretKey = previousSecretKey
		system_setting.ServerAddress = previousServerAddress
		common.RedisEnabled = previousRedisEnabled
		common.RDB = previousRedisClient
	})

	common.TurnstileCheckEnabled = true
	common.TurnstileSiteKey = "test-site-key"
	common.TurnstileSecretKey = "test-secret-key"
	common.RedisEnabled = false
	common.RDB = nil
	system_setting.ServerAddress = "https://panel.example.com"

	performRequest := func(t *testing.T, handler gin.HandlerFunc, token string, useHeader bool) (*httptest.ResponseRecorder, *bool) {
		t.Helper()
		handlerHit := false
		router := gin.New()
		router.GET("/protected", handler, func(c *gin.Context) {
			handlerHit = true
			c.Status(http.StatusNoContent)
		})

		path := "/protected"
		if token != "" && !useHeader {
			path += "?turnstile=" + url.QueryEscape(token)
		}
		request := httptest.NewRequest(http.MethodGet, "https://panel.example.com"+path, nil)
		request.RemoteAddr = "192.0.2.44:4321"
		if token != "" && useHeader {
			request.Header.Set("X-Turnstile-Token", token)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response, &handlerHit
	}

	t.Run("accepts a matching token", func(t *testing.T) {
		receivedForm := make(chan url.Values, 1)
		siteverify := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !assert.NoError(t, r.ParseForm()) {
				http.Error(w, "invalid form", http.StatusBadRequest)
				return
			}
			receivedForm <- r.PostForm
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"success":true,"action":"login","hostname":"panel.example.com"}`))
		}))
		defer siteverify.Close()

		response, handlerHit := performRequest(t, turnstileCheck(siteverify.URL, siteverify.Client(), "login"), "test-token", true)

		assert.Equal(t, http.StatusNoContent, response.Code)
		assert.True(t, *handlerHit)
		form := <-receivedForm
		assert.Equal(t, "test-secret-key", form.Get("secret"))
		assert.Equal(t, "test-token", form.Get("response"))
		assert.Equal(t, "192.0.2.44", form.Get("remoteip"))
	})

	t.Run("rejects a replayed token with shared Redis", func(t *testing.T) {
		redisServer, _ := useRateLimitMiniRedis(t)
		var siteverifyCalls atomic.Int32
		siteverify := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			siteverifyCalls.Add(1)
			action := "login"
			if r.FormValue("response") == "json-intent-register-token" {
				action = "register"
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"success":true,"action":"` + action + `","hostname":"panel.example.com"}`))
		}))
		defer siteverify.Close()

		handler := turnstileCheck(siteverify.URL, siteverify.Client(), "login")
		firstResponse, firstHit := performRequest(t, handler, "redis-replayed-token", true)
		replayResponse, replayHit := performRequest(t, handler, "redis-replayed-token", false)

		assert.Equal(t, http.StatusNoContent, firstResponse.Code)
		assert.True(t, *firstHit)
		assert.False(t, *replayHit)
		assert.Contains(t, replayResponse.Body.String(), `"success":false`)
		assert.Equal(t, int32(1), siteverifyCalls.Load())

		keys := redisServer.Keys()
		require.Len(t, keys, 1)
		assert.Contains(t, keys[0], turnstileReplayKeyPrefix)
		assert.NotContains(t, keys[0], "redis-replayed-token")
		assert.Equal(t, turnstileTokenTTL, redisServer.TTL(keys[0]))
	})

	t.Run("rejects a replayed token without Redis", func(t *testing.T) {
		var siteverifyCalls atomic.Int32
		siteverify := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			siteverifyCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"success":true,"action":"login","hostname":"panel.example.com"}`))
		}))
		defer siteverify.Close()

		handler := turnstileCheck(siteverify.URL, siteverify.Client(), "login")
		firstResponse, firstHit := performRequest(t, handler, "memory-replayed-token", true)
		replayResponse, replayHit := performRequest(t, handler, "memory-replayed-token", false)

		assert.Equal(t, http.StatusNoContent, firstResponse.Code)
		assert.True(t, *firstHit)
		assert.False(t, *replayHit)
		assert.Contains(t, replayResponse.Body.String(), `"success":false`)
		assert.Equal(t, int32(1), siteverifyCalls.Load())
	})

	t.Run("fails closed when shared Redis is unavailable", func(t *testing.T) {
		common.RedisEnabled = true
		common.RDB = nil
		defer func() {
			common.RedisEnabled = false
			common.RDB = nil
		}()

		var siteverifyCalled atomic.Bool
		siteverify := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			siteverifyCalled.Store(true)
		}))
		defer siteverify.Close()

		response, handlerHit := performRequest(t, turnstileCheck(siteverify.URL, siteverify.Client(), "login"), "redis-unavailable-token", true)

		assert.False(t, *handlerHit)
		assert.False(t, siteverifyCalled.Load())
		assert.Contains(t, response.Body.String(), `"success":false`)
	})

	tests := []struct {
		name               string
		token              string
		siteverifyStatus   int
		siteverifyResponse string
		expectSiteverify   bool
	}{
		{
			name:               "rejects a missing token",
			siteverifyStatus:   http.StatusOK,
			siteverifyResponse: `{"success":true,"action":"login","hostname":"panel.example.com"}`,
		},
		{
			name:               "rejects an oversized token",
			token:              strings.Repeat("a", turnstileTokenMaxLength+1),
			siteverifyStatus:   http.StatusOK,
			siteverifyResponse: `{"success":true,"action":"login","hostname":"panel.example.com"}`,
		},
		{
			name:               "rejects a failed siteverify response",
			token:              "test-token",
			siteverifyStatus:   http.StatusOK,
			siteverifyResponse: `{"success":false,"error-codes":["invalid-input-response"]}`,
			expectSiteverify:   true,
		},
		{
			name:               "rejects an action mismatch",
			token:              "test-token",
			siteverifyStatus:   http.StatusOK,
			siteverifyResponse: `{"success":true,"action":"checkin","hostname":"panel.example.com"}`,
			expectSiteverify:   true,
		},
		{
			name:               "rejects a hostname mismatch",
			token:              "test-token",
			siteverifyStatus:   http.StatusOK,
			siteverifyResponse: `{"success":true,"action":"login","hostname":"attacker.example.com"}`,
			expectSiteverify:   true,
		},
		{
			name:               "rejects an invalid siteverify response",
			token:              "test-token",
			siteverifyStatus:   http.StatusOK,
			siteverifyResponse: `not-json`,
			expectSiteverify:   true,
		},
		{
			name:               "rejects a siteverify HTTP failure",
			token:              "test-token",
			siteverifyStatus:   http.StatusBadGateway,
			siteverifyResponse: `{"success":true,"action":"login","hostname":"panel.example.com"}`,
			expectSiteverify:   true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			token := test.token
			if token == "test-token" {
				token = test.name
			}
			var siteverifyCalled atomic.Bool
			siteverify := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				siteverifyCalled.Store(true)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(test.siteverifyStatus)
				_, _ = w.Write([]byte(test.siteverifyResponse))
			}))
			defer siteverify.Close()

			response, handlerHit := performRequest(t, turnstileCheck(siteverify.URL, siteverify.Client(), "login"), token, false)

			assert.False(t, *handlerHit)
			assert.Equal(t, test.expectSiteverify, siteverifyCalled.Load())
			var payload struct {
				Success bool `json:"success"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			assert.False(t, payload.Success)
		})
	}

	t.Run("verifies only the matching JSON intent and preserves the body", func(t *testing.T) {
		var siteverifyCalls atomic.Int32
		siteverify := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			siteverifyCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"success":true,"action":"login","hostname":"panel.example.com"}`))
		}))
		defer siteverify.Close()

		handler := turnstileCheckForJSONIntent(siteverify.URL, siteverify.Client(), []string{"login", "register"}, "login")
		performJSONRequest := func(t *testing.T, body string, token string) (*httptest.ResponseRecorder, *bool, string) {
			t.Helper()
			handlerHit := false
			receivedIntent := ""
			router := gin.New()
			router.POST("/protected", handler, func(c *gin.Context) {
				handlerHit = true
				var payload struct {
					Intent string `json:"intent"`
				}
				if assert.NoError(t, common.DecodeJson(c.Request.Body, &payload)) {
					receivedIntent = payload.Intent
				}
				c.Status(http.StatusNoContent)
			})

			request := httptest.NewRequest(http.MethodPost, "https://panel.example.com/protected", strings.NewReader(body))
			request.RemoteAddr = "192.0.2.44:4321"
			if token != "" {
				request.Header.Set("X-Turnstile-Token", token)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			return response, &handlerHit, receivedIntent
		}

		bindResponse, bindHit, bindIntent := performJSONRequest(t, `{"provider":"github","intent":"bind"}`, "")
		assert.Equal(t, http.StatusNoContent, bindResponse.Code)
		assert.True(t, *bindHit)
		assert.Equal(t, "bind", bindIntent)
		assert.Equal(t, int32(0), siteverifyCalls.Load())

		missingResponse, missingHit, _ := performJSONRequest(t, `{"provider":"github","intent":"login"}`, "")
		assert.False(t, *missingHit)
		assert.Contains(t, missingResponse.Body.String(), `"success":false`)
		assert.Equal(t, int32(0), siteverifyCalls.Load())

		loginResponse, loginHit, loginIntent := performJSONRequest(t, `{"provider":"github","intent":"login"}`, "json-intent-login-token")
		assert.Equal(t, http.StatusNoContent, loginResponse.Code)
		assert.True(t, *loginHit)
		assert.Equal(t, "login", loginIntent)
		assert.Equal(t, int32(1), siteverifyCalls.Load())

		registerResponse, registerHit, registerIntent := performJSONRequest(t, `{"provider":"github","intent":"login"}`, "json-intent-register-token")
		assert.Equal(t, http.StatusNoContent, registerResponse.Code)
		assert.True(t, *registerHit)
		assert.Equal(t, "login", registerIntent)
		assert.Equal(t, int32(2), siteverifyCalls.Load())
	})

	t.Run("fails closed when credentials are missing", func(t *testing.T) {
		common.TurnstileSecretKey = ""
		defer func() { common.TurnstileSecretKey = "test-secret-key" }()

		var siteverifyCalled atomic.Bool
		siteverify := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			siteverifyCalled.Store(true)
		}))
		defer siteverify.Close()

		response, handlerHit := performRequest(t, turnstileCheck(siteverify.URL, siteverify.Client(), "login"), "test-token", true)

		assert.False(t, *handlerHit)
		assert.False(t, siteverifyCalled.Load())
		assert.Contains(t, response.Body.String(), `"success":false`)
	})

	t.Run("bypasses verification when disabled", func(t *testing.T) {
		common.TurnstileCheckEnabled = false
		defer func() { common.TurnstileCheckEnabled = true }()

		var siteverifyCalled atomic.Bool
		siteverify := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			siteverifyCalled.Store(true)
		}))
		defer siteverify.Close()

		response, handlerHit := performRequest(t, turnstileCheck(siteverify.URL, siteverify.Client(), "login"), "", false)

		assert.Equal(t, http.StatusNoContent, response.Code)
		assert.True(t, *handlerHit)
		assert.False(t, siteverifyCalled.Load())
	})
}
