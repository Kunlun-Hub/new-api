package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type createTicketRequest struct {
	Title    string `json:"title" binding:"required"`
	Category string `json:"category"`
	Priority string `json:"priority"`
	Content  string `json:"content" binding:"required"`
}

var validTicketPriorities = map[string]bool{
	"low": true, "normal": true, "high": true, "urgent": true,
}

type replyTicketRequest struct {
	Content string `json:"content" binding:"required"`
}

func validTicketCategory(category string) bool {
	for _, c := range model.TicketCategories {
		if c == category {
			return true
		}
	}
	return false
}

func ticketIdParam(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Invalid ticket id"})
		return 0, false
	}
	return id, true
}

// CreateTicket opens a new support ticket for the current user.
func CreateTicket(c *gin.Context) {
	userId := c.GetInt("id")
	req := createTicketRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	if len(req.Title) > 200 {
		req.Title = req.Title[:200]
	}
	if !validTicketCategory(req.Category) {
		req.Category = "other"
	}
	if !validTicketPriorities[req.Priority] {
		req.Priority = "normal"
	}
	ticket, err := model.CreateTicket(userId, req.Title, req.Category, req.Priority, req.Content)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	service.BroadcastTicketEvent(service.TicketEvent{
		Type:     service.TicketEventCreated,
		TicketId: ticket.Id,
		UserId:   ticket.UserId,
		Data:     ticket,
	})
	common.ApiSuccess(c, ticket)
}

// GetUserTickets lists the current user's tickets.
func GetUserTickets(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	status := c.Query("status")

	tickets, total, err := model.SearchTickets(userId, status, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(tickets)
	common.ApiSuccess(c, pageInfo)
}

// GetTicketStats returns the per-status counters of the current user's tickets.
func GetTicketStats(c *gin.Context) {
	counts, err := model.CountTicketsByStatus(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, counts)
}

// GetTicketDetail returns a ticket with its replies. Users can only see their own.
func GetTicketDetail(c *gin.Context) {
	userId := c.GetInt("id")
	id, ok := ticketIdParam(c)
	if !ok {
		return
	}
	ticket, err := model.GetTicketById(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Ticket not found"})
		return
	}
	replies, err := model.GetTicketReplies(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"ticket": ticket, "replies": replies})
}

// ReplyTicket appends a user reply to an open ticket.
func ReplyTicket(c *gin.Context) {
	userId := c.GetInt("id")
	id, ok := ticketIdParam(c)
	if !ok {
		return
	}
	ticket, err := model.GetTicketById(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Ticket not found"})
		return
	}
	if ticket.Status == model.TicketStatusClosed || ticket.Status == model.TicketStatusResolved {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "This ticket is closed and cannot receive new replies"})
		return
	}
	req := replyTicketRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Reply content cannot be empty"})
		return
	}
	reply, err := model.AddTicketReply(id, userId, false, req.Content)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	service.BroadcastTicketEvent(service.TicketEvent{
		Type:     service.TicketEventReply,
		TicketId: id,
		UserId:   ticket.UserId,
		Data:     reply,
	})
	common.ApiSuccess(c, reply)
}

// CloseTicket lets the owner close their own ticket.
func CloseTicket(c *gin.Context) {
	userId := c.GetInt("id")
	id, ok := ticketIdParam(c)
	if !ok {
		return
	}
	ticket, err := model.GetTicketById(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Ticket not found"})
		return
	}
	if ticket.Status == model.TicketStatusClosed {
		common.ApiSuccess(c, ticket)
		return
	}
	if err := model.UpdateTicketStatus(id, model.TicketStatusClosed); err != nil {
		common.ApiError(c, err)
		return
	}
	ticket.Status = model.TicketStatusClosed
	service.BroadcastTicketEvent(service.TicketEvent{
		Type:     service.TicketEventUpdated,
		TicketId: id,
		UserId:   ticket.UserId,
		Data:     ticket,
	})
	common.ApiSuccess(c, ticket)
}

// AdminGetTickets lists all tickets for staff, with the owner's username.
func AdminGetTickets(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	status := c.Query("status")

	tickets, total, err := model.SearchTickets(0, status, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(tickets)
	common.ApiSuccess(c, pageInfo)
}

// AdminGetTicket returns any ticket with its replies.
func AdminGetTicket(c *gin.Context) {
	id, ok := ticketIdParam(c)
	if !ok {
		return
	}
	ticket, err := model.GetTicketById(id, 0)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Ticket not found"})
		return
	}
	replies, err := model.GetTicketReplies(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"ticket": ticket, "replies": replies})
}

// AdminReplyTicket appends a staff reply and marks the ticket in progress.
func AdminReplyTicket(c *gin.Context) {
	adminId := c.GetInt("id")
	id, ok := ticketIdParam(c)
	if !ok {
		return
	}
	ticket, err := model.GetTicketById(id, 0)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Ticket not found"})
		return
	}
	if ticket.Status == model.TicketStatusClosed {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "This ticket is closed"})
		return
	}
	req := replyTicketRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Reply content cannot be empty"})
		return
	}
	reply, err := model.AddTicketReply(id, adminId, true, req.Content)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	service.BroadcastTicketEvent(service.TicketEvent{
		Type:     service.TicketEventReply,
		TicketId: id,
		UserId:   ticket.UserId,
		Data:     reply,
	})
	common.ApiSuccess(c, reply)
}

type adminUpdateTicketRequest struct {
	Status   string `json:"status"`
	Priority string `json:"priority"`
}

// AdminUpdateTicket changes a ticket's status or priority.
func AdminUpdateTicket(c *gin.Context) {
	id, ok := ticketIdParam(c)
	if !ok {
		return
	}
	if _, err := model.GetTicketById(id, 0); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Ticket not found"})
		return
	}
	req := adminUpdateTicketRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	validStatuses := map[string]bool{
		model.TicketStatusOpen: true, model.TicketStatusInProgress: true,
		model.TicketStatusResolved: true, model.TicketStatusClosed: true,
	}
	if req.Status != "" {
		if !validStatuses[req.Status] {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "Invalid status"})
			return
		}
		if err := model.UpdateTicketStatus(id, req.Status); err != nil {
			common.ApiError(c, err)
			return
		}
	}
	if req.Priority != "" {
		if !validTicketPriorities[req.Priority] {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "Invalid priority"})
			return
		}
		if err := model.UpdateTicketPriority(id, req.Priority); err != nil {
			common.ApiError(c, err)
			return
		}
	}
	ticket, _ := model.GetTicketById(id, 0)
	service.BroadcastTicketEvent(service.TicketEvent{
		Type:     service.TicketEventUpdated,
		TicketId: id,
		UserId:   ticket.UserId,
		Data:     ticket,
	})
	common.ApiSuccess(c, ticket)
}
