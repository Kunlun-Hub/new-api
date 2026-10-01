package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/gin-gonic/gin"
)

// RequireConsoleFeature blocks a route group when the matching console feature
// switch is turned off, so hiding a page in the UI also disables its API.
func RequireConsoleFeature(feature string) gin.HandlerFunc {
	enabled := func() bool {
		cs := console_setting.GetConsoleSetting()
		switch feature {
		case "orders":
			return cs.OrdersEnabled
		case "invoices":
			return cs.InvoicesEnabled
		case "tickets":
			return cs.TicketsEnabled
		default:
			return true
		}
	}
	return func(c *gin.Context) {
		if !enabled() {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "This feature is disabled",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
