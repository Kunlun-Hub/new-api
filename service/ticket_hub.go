package service

import (
	"context"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
)

// Ticket event types pushed over the support-ticket WebSocket.
const (
	TicketEventCreated = "ticket.created"
	TicketEventReply   = "ticket.reply"
	TicketEventUpdated = "ticket.updated"
)

// TicketEvent is delivered to staff subscribers and to the ticket owner.
type TicketEvent struct {
	Type     string `json:"type"`
	TicketId int    `json:"ticket_id"`
	UserId   int    `json:"user_id"`
	Data     any    `json:"data,omitempty"`
}

type ticketSubscriber struct {
	userId  int
	isAdmin bool
	events  chan []byte
}

// TicketHub fans support-ticket events out to the staff console and to the
// affected user's open pages. It is process-local: every running instance
// pushes only to the connections it holds.
type TicketHub struct {
	mu          sync.RWMutex
	subscribers map[*ticketSubscriber]struct{}
}

var ticketHub = &TicketHub{subscribers: make(map[*ticketSubscriber]struct{})}

// SubscribeTickets registers one connection. The returned cancel function must
// be called when the connection closes.
func SubscribeTickets(userId int, isAdmin bool) (<-chan []byte, func()) {
	subscriber := &ticketSubscriber{
		userId:  userId,
		isAdmin: isAdmin,
		events:  make(chan []byte, 16),
	}
	ticketHub.mu.Lock()
	ticketHub.subscribers[subscriber] = struct{}{}
	ticketHub.mu.Unlock()

	cancel := func() {
		ticketHub.mu.Lock()
		if _, ok := ticketHub.subscribers[subscriber]; ok {
			delete(ticketHub.subscribers, subscriber)
			close(subscriber.events)
		}
		ticketHub.mu.Unlock()
	}
	return subscriber.events, cancel
}

// BroadcastTicketEvent pushes one event without blocking on slow readers.
func BroadcastTicketEvent(event TicketEvent) {
	payload, err := common.Marshal(event)
	if err != nil {
		logger.LogError(context.Background(), "failed to encode ticket event: "+err.Error())
		return
	}

	ticketHub.mu.RLock()
	defer ticketHub.mu.RUnlock()
	for subscriber := range ticketHub.subscribers {
		if !subscriber.isAdmin && subscriber.userId != event.UserId {
			continue
		}
		select {
		case subscriber.events <- payload:
		default:
		}
	}
}
