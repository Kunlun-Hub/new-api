package oauth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGoogleProviderExchangesCodeAndMapsVerifiedUser(t *testing.T) {
	settings := system_setting.GetGoogleSettings()
	originalSettings := *settings
	originalServerAddress := system_setting.ServerAddress
	originalTokenEndpoint, originalUserInfoEndpoint := googleTokenEndpoint, googleUserInfoEndpoint
	t.Cleanup(func() {
		*settings = originalSettings
		system_setting.ServerAddress = originalServerAddress
		googleTokenEndpoint = originalTokenEndpoint
		googleUserInfoEndpoint = originalUserInfoEndpoint
	})

	settings.ClientId = "google-client"
	settings.ClientSecret = "google-secret"
	system_setting.ServerAddress = "https://gateway.example.com/"

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON := func(value any) {
			body, _ := common.Marshal(value)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(body)
		}

		switch r.URL.Path {
		case "/token":
			require.NoError(t, r.ParseForm())
			assert.Equal(t, "google-client", r.Form.Get("client_id"))
			assert.Equal(t, "google-secret", r.Form.Get("client_secret"))
			assert.Equal(t, "authorization-code", r.Form.Get("code"))
			assert.Equal(t, "authorization_code", r.Form.Get("grant_type"))
			assert.Equal(t, "https://gateway.example.com/oauth/google", r.Form.Get("redirect_uri"))
			writeJSON(map[string]any{
				"access_token": "google-access-token",
				"token_type":   "Bearer",
				"expires_in":   3600,
				"scope":        "openid email profile",
			})
		case "/userinfo":
			assert.Equal(t, "Bearer google-access-token", r.Header.Get("Authorization"))
			writeJSON(map[string]any{
				"sub":            "google-subject",
				"email":          "alice@example.com",
				"email_verified": true,
				"name":           "Alice",
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	googleTokenEndpoint = server.URL + "/token"
	googleUserInfoEndpoint = server.URL + "/userinfo"

	provider := &GoogleProvider{}
	token, err := provider.ExchangeToken(context.Background(), "authorization-code", nil)
	require.NoError(t, err)
	assert.Equal(t, "google-access-token", token.AccessToken)

	user, err := provider.GetUserInfo(context.Background(), token)
	require.NoError(t, err)
	assert.Equal(t, "google-subject", user.ProviderUserID)
	assert.Equal(t, "alice@example.com", user.Email)
	assert.Equal(t, "Alice", user.DisplayName)
}

func TestGoogleProviderRejectsUnverifiedEmail(t *testing.T) {
	originalUserInfoEndpoint := googleUserInfoEndpoint
	t.Cleanup(func() { googleUserInfoEndpoint = originalUserInfoEndpoint })

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := common.Marshal(map[string]any{
			"sub":            "google-subject",
			"email":          "alice@example.com",
			"email_verified": false,
			"name":           "Alice",
		})
		_, _ = w.Write(body)
	}))
	defer server.Close()
	googleUserInfoEndpoint = server.URL

	_, err := (&GoogleProvider{}).GetUserInfo(context.Background(), &OAuthToken{AccessToken: "token"})
	require.Error(t, err)
	var oauthError *OAuthError
	require.ErrorAs(t, err, &oauthError)
	assert.Equal(t, msgEmailUnverified, oauthError.Message.Key)
	assert.Equal(t, "Google", oauthError.Message.Params["provider"])
	assert.Contains(t, oauthError.Message.Error(), "not verified")
}

func TestGoogleHTTPClientUsesConfiguredProxy(t *testing.T) {
	t.Setenv("GOOGLE_OAUTH_PROXY", "http://proxy-user:proxy-pass@proxy.example.com:8080")

	client := newOAuthHTTPClient("GOOGLE_OAUTH_PROXY")
	transport, ok := client.Transport.(*http.Transport)
	require.True(t, ok)
	require.NotNil(t, transport.Proxy)

	request, err := http.NewRequest(http.MethodPost, "https://oauth2.googleapis.com/token", nil)
	require.NoError(t, err)
	proxyURL, err := transport.Proxy(request)
	require.NoError(t, err)
	require.NotNil(t, proxyURL)
	assert.Equal(t, "http://proxy-user:proxy-pass@proxy.example.com:8080", proxyURL.String())
}
