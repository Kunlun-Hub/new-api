package middleware

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// WebSocketTokenProtocol is the subprotocol the browser client must request
// alongside its access token.
const WebSocketTokenProtocol = "newapi.ws.v1"

// WebSocketTokenAuth authenticates a WebSocket handshake.
//
// Browsers cannot set an Authorization header on WebSocket connections, so the
// access token travels as the second requested subprotocol, for example
// `new WebSocket(url, ["newapi.ws.v1", token])`. The token is not written to
// access logs and the handshake still runs through the ordinary dashboard
// authentication path.
func WebSocketTokenAuth(minRole int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(c.GetHeader("Authorization")) == "" {
			if token := tokenFromSubprotocols(c.GetHeader("Sec-WebSocket-Protocol")); token != "" {
				c.Request.Header.Set("Authorization", "Bearer "+token)
			}
		}
		switch minRole {
		case common.RoleRootUser:
			RootAuth()(c)
		case common.RoleAdminUser:
			AdminAuth()(c)
		default:
			UserAuth()(c)
		}
	}
}

// tokenFromSubprotocols returns the first requested subprotocol that is not the
// WebSocket protocol name itself.
func tokenFromSubprotocols(header string) string {
	for _, value := range strings.Split(header, ",") {
		protocol := strings.TrimSpace(value)
		if protocol == "" || protocol == WebSocketTokenProtocol {
			continue
		}
		return protocol
	}
	return ""
}
