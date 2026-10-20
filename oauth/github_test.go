package oauth

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGitHubHTTPClientUsesConfiguredProxy(t *testing.T) {
	t.Setenv("GITHUB_OAUTH_PROXY", "http://proxy-user:proxy-pass@proxy.example.com:8080")

	client := newOAuthHTTPClient("GITHUB_OAUTH_PROXY")
	transport, ok := client.Transport.(*http.Transport)
	require.True(t, ok)
	require.NotNil(t, transport.Proxy)

	request, err := http.NewRequest(http.MethodGet, "https://github.com/login/oauth/access_token", nil)
	require.NoError(t, err)
	proxyURL, err := transport.Proxy(request)
	require.NoError(t, err)
	require.NotNil(t, proxyURL)
	assert.Equal(t, "http://proxy-user:proxy-pass@proxy.example.com:8080", proxyURL.String())
}
