package controller

import (
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	ticketSocketPingInterval = 30 * time.Second
	ticketSocketWriteWait    = 10 * time.Second
	ticketSocketPongWait     = 70 * time.Second
)

var ticketUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	Subprotocols:    []string{middleware.WebSocketTokenProtocol},
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// TicketWebSocket streams the caller's own ticket events.
func TicketWebSocket(c *gin.Context) {
	serveTicketSocket(c, c.GetInt("id"), false)
}

// AdminTicketWebSocket streams every ticket event to the staff console.
func AdminTicketWebSocket(c *gin.Context) {
	serveTicketSocket(c, 0, true)
}

func serveTicketSocket(c *gin.Context, userId int, isAdmin bool) {
	events, unsubscribe := service.SubscribeTickets(userId, isAdmin)
	defer unsubscribe()

	conn, err := ticketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.LogError(c.Request.Context(), "ticket websocket upgrade failed: "+err.Error())
		return
	}
	defer conn.Close()

	conn.SetReadLimit(4096)
	_ = conn.SetReadDeadline(time.Now().Add(ticketSocketPongWait))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(ticketSocketPongWait))
	})

	closed := make(chan struct{})
	go func() {
		defer close(closed)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	ticker := time.NewTicker(ticketSocketPingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-closed:
			return
		case payload, ok := <-events:
			if !ok {
				return
			}
			_ = conn.SetWriteDeadline(time.Now().Add(ticketSocketWriteWait))
			if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}
		case <-ticker.C:
			_ = conn.SetWriteDeadline(time.Now().Add(ticketSocketWriteWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
