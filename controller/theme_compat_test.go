package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateOptionRejectsRetiredFrontendTheme(t *testing.T) {
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(
		http.MethodPut,
		"/api/option/",
		strings.NewReader(`{"key":"theme.frontend","value":"classic"}`),
	)

	UpdateOption(context)

	assert.Equal(t, http.StatusOK, response.Code)
	assert.JSONEq(t, `{"success":false,"message":"The Classic frontend has been removed. The theme can only be set to default","message_key":"The Classic frontend has been removed. The theme can only be set to default"}`, response.Body.String())
}

func TestGetStatusAdvertisesDefaultDashboard(t *testing.T) {
	previousMap := common.OptionMap
	common.OptionMap = map[string]string{}
	t.Cleanup(func() { common.OptionMap = previousMap })
	googleSettings := system_setting.GetGoogleSettings()
	previousGoogleSettings := *googleSettings
	t.Cleanup(func() { *googleSettings = previousGoogleSettings })
	googleSettings.Enabled = true
	googleSettings.ClientId = "google-client"
	googleSettings.ClientSecret = "google-secret"
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)

	GetStatus(context)

	var payload struct {
		Success bool           `json:"success"`
		Data    map[string]any `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	assert.True(t, payload.Success)
	assert.Equal(t, "default", payload.Data["theme"])
	assert.Equal(t, true, payload.Data["google_oauth"])
	assert.Equal(t, "google-client", payload.Data["google_client_id"])
	assert.NotContains(t, payload.Data, "google_client_secret")
}

func TestUpdateOptionRequiresGoogleClientCredentials(t *testing.T) {
	googleSettings := system_setting.GetGoogleSettings()
	previousGoogleSettings := *googleSettings
	t.Cleanup(func() { *googleSettings = previousGoogleSettings })

	for _, settings := range []system_setting.GoogleSettings{
		{},
		{ClientId: "google-client"},
		{ClientSecret: "google-secret"},
	} {
		*googleSettings = settings
		response := httptest.NewRecorder()
		context, _ := gin.CreateTestContext(response)
		context.Request = httptest.NewRequest(
			http.MethodPut,
			"/api/option/",
			strings.NewReader(`{"key":"google.enabled","value":true}`),
		)

		UpdateOption(context)

		var payload struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
		assert.False(t, payload.Success)
		assert.Contains(t, payload.Message, "Google OAuth")
	}
}
