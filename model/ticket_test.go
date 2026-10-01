package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFormatTicketNo(t *testing.T) {
	createdAt := time.Date(2026, time.October, 1, 3, 4, 5, 0, time.Local).Unix()
	assert.Equal(t, "TK202610010000012", FormatTicketNo(createdAt, 12))
	assert.Equal(t, "TK202609300000004", FormatTicketNo(
		time.Date(2026, time.September, 30, 23, 0, 0, 0, time.Local).Unix(), 4))
}

func TestCreateTicketAssignsTicketNo(t *testing.T) {
	ticket, err := CreateTicket(9001, "ticket number", "technical", "normal", "hello")
	require.NoError(t, err)
	require.NotZero(t, ticket.Id)
	assert.Equal(t, FormatTicketNo(ticket.CreatedAt, ticket.Id), ticket.TicketNo)

	stored, err := GetTicketById(ticket.Id, 9001)
	require.NoError(t, err)
	assert.Equal(t, ticket.TicketNo, stored.TicketNo)
}

func TestSearchTicketsConsoleTabs(t *testing.T) {
	const userId = 9002
	statuses := []string{TicketStatusOpen, TicketStatusInProgress, TicketStatusResolved, TicketStatusClosed}
	created := make([]*Ticket, 0, len(statuses))
	for _, status := range statuses {
		ticket, err := CreateTicket(userId, "tab filter", "technical", "normal", "body")
		require.NoError(t, err)
		if status != TicketStatusOpen {
			require.NoError(t, UpdateTicketStatus(ticket.Id, status))
		}
		ticket.Status = status
		created = append(created, ticket)
	}

	pending, pendingTotal, err := SearchTickets(userId, "pending", &common.PageInfo{Page: 1, PageSize: 20})
	require.NoError(t, err)
	require.Equal(t, int64(1), pendingTotal)
	require.Len(t, pending, 1)
	assert.Equal(t, TicketStatusOpen, pending[0].Status)

	replied, repliedTotal, err := SearchTickets(userId, "replied", &common.PageInfo{Page: 1, PageSize: 20})
	require.NoError(t, err)
	require.Equal(t, int64(2), repliedTotal)
	require.Len(t, replied, 2)

	closed, closedTotal, err := SearchTickets(userId, "closed", &common.PageInfo{Page: 1, PageSize: 20})
	require.NoError(t, err)
	require.Equal(t, int64(1), closedTotal)
	require.Len(t, closed, 1)
	assert.Equal(t, TicketStatusClosed, closed[0].Status)

	counts, err := CountTicketsByStatus(userId)
	require.NoError(t, err)
	assert.Equal(t, int64(1), counts["pending"])
	assert.Equal(t, int64(2), counts["resolved"])
	assert.Equal(t, int64(1), counts["closed"])

	for _, ticket := range created {
		require.NoError(t, DB.Where("id = ?", ticket.Id).Delete(&Ticket{}).Error)
		require.NoError(t, DB.Where("ticket_id = ?", ticket.Id).Delete(&TicketReply{}).Error)
	}
}
