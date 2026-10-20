package oauth

import (
	"net/http"
	"os"
	"time"

	"github.com/QuantumNous/new-api/common"
)

func newOAuthHTTPClient(proxyEnv string) *http.Client {
	defaultTransport, ok := http.DefaultTransport.(*http.Transport)
	if !ok || defaultTransport == nil {
		return &http.Client{Timeout: 20 * time.Second}
	}

	transport := defaultTransport.Clone()
	proxyURL, _, err := common.ParseProxyURLRuntime(os.Getenv(proxyEnv))
	if err != nil {
		common.SysError(common.LogText("Invalid %s: %s", proxyEnv, err.Error()))
	} else if proxyURL != nil {
		transport.Proxy = http.ProxyURL(proxyURL)
	}
	return &http.Client{Transport: transport, Timeout: 20 * time.Second}
}
