package oauth

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

var (
	googleTokenEndpoint    = "https://oauth2.googleapis.com/token"
	googleUserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo"
	googleHTTPClient       = newOAuthHTTPClient("GOOGLE_OAUTH_PROXY")
)

func init() {
	Register("google", &GoogleProvider{})
}

type GoogleProvider struct{}

type googleOAuthResponse struct {
	AccessToken      string `json:"access_token"`
	TokenType        string `json:"token_type"`
	ExpiresIn        int    `json:"expires_in"`
	Scope            string `json:"scope"`
	IDToken          string `json:"id_token"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

type googleUser struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
}

func (p *GoogleProvider) GetName() string {
	return "Google"
}

func (p *GoogleProvider) IsEnabled() bool {
	return system_setting.GetGoogleSettings().Enabled
}

func (p *GoogleProvider) ExchangeToken(ctx context.Context, code string, c *gin.Context) (*OAuthToken, error) {
	if code == "" {
		return nil, NewOAuthError(common.NewMessage(msgInvalidCode))
	}

	settings := system_setting.GetGoogleSettings()
	redirectURI := fmt.Sprintf("%s/oauth/google", strings.TrimRight(system_setting.ServerAddress, "/"))
	values := url.Values{}
	values.Set("client_id", settings.ClientId)
	values.Set("client_secret", settings.ClientSecret)
	values.Set("code", code)
	values.Set("grant_type", "authorization_code")
	values.Set("redirect_uri", redirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, googleTokenEndpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	res, err := googleHTTPClient.Do(req)
	if err != nil {
		logger.LogError(ctx, common.LogText("[OAuth-Google] ExchangeToken error: %s", err.Error()))
		return nil, NewOAuthErrorWithRaw(common.NewMessage(msgConnectFailed, map[string]any{"provider": "Google"}), err.Error())
	}
	defer res.Body.Close()

	logger.LogDebug(ctx, "[OAuth-Google] ExchangeToken response status: %d", res.StatusCode)

	var tokenResponse googleOAuthResponse
	if err := common.DecodeJson(io.LimitReader(res.Body, 1<<20), &tokenResponse); err != nil {
		logger.LogError(ctx, common.LogText("[OAuth-Google] ExchangeToken decode error: %s", err.Error()))
		return nil, err
	}
	if tokenResponse.AccessToken == "" {
		logger.LogError(ctx, common.LogText("[OAuth-Google] ExchangeToken failed: status=%d error=%s", res.StatusCode, tokenResponse.Error))
		return nil, NewOAuthError(common.NewMessage(msgTokenFailed, map[string]any{"provider": "Google"}))
	}

	logger.LogDebug(ctx, "[OAuth-Google] ExchangeToken success: scope=%s", tokenResponse.Scope)
	return &OAuthToken{
		AccessToken: tokenResponse.AccessToken,
		TokenType:   tokenResponse.TokenType,
		ExpiresIn:   tokenResponse.ExpiresIn,
		Scope:       tokenResponse.Scope,
		IDToken:     tokenResponse.IDToken,
	}, nil
}

func (p *GoogleProvider) GetUserInfo(ctx context.Context, token *OAuthToken) (*OAuthUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, googleUserInfoEndpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Accept", "application/json")

	res, err := googleHTTPClient.Do(req)
	if err != nil {
		logger.LogError(ctx, common.LogText("[OAuth-Google] GetUserInfo error: %s", err.Error()))
		return nil, NewOAuthErrorWithRaw(common.NewMessage(msgConnectFailed, map[string]any{"provider": "Google"}), err.Error())
	}
	defer res.Body.Close()

	logger.LogDebug(ctx, "[OAuth-Google] GetUserInfo response status: %d", res.StatusCode)
	if res.StatusCode != http.StatusOK {
		return nil, NewOAuthError(common.NewMessage(msgGetUserFailed))
	}

	var user googleUser
	if err := common.DecodeJson(io.LimitReader(res.Body, 1<<20), &user); err != nil {
		logger.LogError(ctx, common.LogText("[OAuth-Google] GetUserInfo decode error: %s", err.Error()))
		return nil, err
	}
	if user.Subject == "" || user.Email == "" {
		return nil, NewOAuthError(common.NewMessage(msgUserInfoEmpty, map[string]any{"provider": "Google"}))
	}
	if !user.EmailVerified {
		return nil, NewOAuthError(common.NewMessage(msgEmailUnverified, map[string]any{"provider": "Google"}))
	}

	return &OAuthUser{
		ProviderUserID: user.Subject,
		DisplayName:    user.Name,
		Email:          user.Email,
	}, nil
}

func (p *GoogleProvider) IsUserIDTaken(providerUserID string) bool {
	return model.IsGoogleIdAlreadyTaken(providerUserID)
}

func (p *GoogleProvider) FillUserByProviderID(user *model.User, providerUserID string) error {
	user.GoogleId = providerUserID
	return user.FillUserByGoogleId()
}

func (p *GoogleProvider) SetProviderUserID(user *model.User, providerUserID string) {
	user.GoogleId = providerUserID
}

func (p *GoogleProvider) GetProviderPrefix() string {
	return "google_"
}

func (p *GoogleProvider) ProviderUserIDColumn() string {
	return "google_id"
}
