package model

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// Ticket statuses
const (
	TicketStatusOpen       = "open"
	TicketStatusInProgress = "in_progress"
	TicketStatusResolved   = "resolved"
	TicketStatusClosed     = "closed"
)

// TicketCategories are the built-in ticket categories.
var TicketCategories = []string{"billing", "technical", "account", "other"}

// Ticket is a support ticket opened by a user.
type Ticket struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	TicketNo  string `json:"ticket_no" gorm:"type:varchar(32);index:idx_ticket_no"`
	UserId    int    `json:"user_id" gorm:"not null;index:idx_ticket_user"`
	Title     string `json:"title" gorm:"type:varchar(200);not null"`
	Category  string `json:"category" gorm:"type:varchar(32);not null;default:'other'"`
	Priority  string `json:"priority" gorm:"type:varchar(16);not null;default:'normal'"`
	Status    string `json:"status" gorm:"type:varchar(16);not null;default:'open';index:idx_ticket_status"`
	CreatedAt int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt int64  `json:"updated_at" gorm:"bigint"`
}

func (Ticket) TableName() string {
	return "tickets"
}

// TicketReply is a single message in a ticket thread.
type TicketReply struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	TicketId  int    `json:"ticket_id" gorm:"not null;index:idx_reply_ticket"`
	UserId    int    `json:"user_id" gorm:"not null"`
	IsStaff   bool   `json:"is_staff" gorm:"not null;default:false"`
	Content   string `json:"content" gorm:"type:text;not null"`
	CreatedAt int64  `json:"created_at" gorm:"bigint"`
}

func (TicketReply) TableName() string {
	return "ticket_replies"
}

func nowUnix() int64 {
	return time.Now().Unix()
}

// FormatTicketNo builds the human-readable ticket number shown to users, for
// example TK202610010001068 (prefix, creation date, zero-padded ticket id).
func FormatTicketNo(createdAt int64, id int) string {
	return fmt.Sprintf("TK%s%07d", time.Unix(createdAt, 0).Format("20060102"), id)
}

// CreateTicket creates a ticket together with its first user message.
func CreateTicket(userId int, title, category, priority, content string) (*Ticket, error) {
	if category == "" {
		category = "other"
	}
	if priority == "" {
		priority = "normal"
	}
	ticket := &Ticket{
		UserId:    userId,
		Title:     title,
		Category:  category,
		Priority:  priority,
		Status:    TicketStatusOpen,
		CreatedAt: nowUnix(),
		UpdatedAt: nowUnix(),
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(ticket).Error; err != nil {
			return err
		}
		ticket.TicketNo = FormatTicketNo(ticket.CreatedAt, ticket.Id)
		if err := tx.Model(&Ticket{}).Where("id = ?", ticket.Id).Update("ticket_no", ticket.TicketNo).Error; err != nil {
			return err
		}
		reply := &TicketReply{
			TicketId:  ticket.Id,
			UserId:    userId,
			IsStaff:   false,
			Content:   content,
			CreatedAt: nowUnix(),
		}
		return tx.Create(reply).Error
	})
	if err != nil {
		return nil, err
	}
	return ticket, nil
}

// GetTicketById returns a ticket by id, optionally scoped to an owner.
func GetTicketById(id int, ownerId int) (*Ticket, error) {
	ticket := &Ticket{}
	query := DB.Where("id = ?", id)
	if ownerId > 0 {
		query = query.Where("user_id = ?", ownerId)
	}
	if err := query.First(ticket).Error; err != nil {
		return nil, err
	}
	return ticket, nil
}

// GetTicketReplies returns all replies of a ticket in chronological order.
func GetTicketReplies(ticketId int) ([]TicketReply, error) {
	var replies []TicketReply
	err := DB.Where("ticket_id = ?", ticketId).Order("id ASC").Find(&replies).Error
	return replies, err
}

// AddTicketReply appends a reply and bumps the ticket's updated time.
func AddTicketReply(ticketId, userId int, isStaff bool, content string) (*TicketReply, error) {
	reply := &TicketReply{
		TicketId:  ticketId,
		UserId:    userId,
		IsStaff:   isStaff,
		Content:   content,
		CreatedAt: nowUnix(),
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(reply).Error; err != nil {
			return err
		}
		updates := map[string]any{"updated_at": nowUnix()}
		if isStaff {
			updates["status"] = TicketStatusInProgress
		}
		return tx.Model(&Ticket{}).Where("id = ?", ticketId).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}
	return reply, nil
}

// UpdateTicketStatus changes a ticket's status.
func UpdateTicketStatus(ticketId int, status string) error {
	return DB.Model(&Ticket{}).Where("id = ?", ticketId).Updates(map[string]any{
		"status":     status,
		"updated_at": nowUnix(),
	}).Error
}

// UpdateTicketPriority changes a ticket's priority.
func UpdateTicketPriority(ticketId int, priority string) error {
	return DB.Model(&Ticket{}).Where("id = ?", ticketId).Updates(map[string]any{
		"priority":   priority,
		"updated_at": nowUnix(),
	}).Error
}

// SearchTickets lists tickets with optional owner/status filters.
func SearchTickets(ownerId int, status string, pageInfo *common.PageInfo) ([]Ticket, int64, error) {
	var tickets []Ticket
	var total int64
	query := DB.Model(&Ticket{})
	if ownerId > 0 {
		query = query.Where("user_id = ?", ownerId)
	}
	if status != "" && status != "all" {
		switch status {
		case "pending":
			// Console tab: still waiting for a staff reply.
			query = query.Where("status = ?", TicketStatusOpen)
		case "replied":
			// Console tab: staff already answered.
			query = query.Where("status IN ?", []string{TicketStatusResolved, TicketStatusInProgress})
		default:
			query = query.Where("status = ?", status)
		}
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("updated_at DESC").Offset(pageInfo.GetStartIdx()).Limit(pageInfo.GetPageSize()).Find(&tickets).Error
	return tickets, total, err
}

// CountOpenTickets counts tickets that are not resolved or closed.
func CountOpenTickets(ownerId int) (int64, error) {
	var count int64
	query := DB.Model(&Ticket{}).Where("status IN ?", []string{TicketStatusOpen, TicketStatusInProgress})
	if ownerId > 0 {
		query = query.Where("user_id = ?", ownerId)
	}
	err := query.Count(&count).Error
	return count, err
}

// CountTicketsByStatus returns the per-tab counters shown on the ticket list.
func CountTicketsByStatus(ownerId int) (map[string]int64, error) {
	counts := map[string]int64{"pending": 0, "resolved": 0, "closed": 0}
	query := DB.Model(&Ticket{})
	if ownerId > 0 {
		query = query.Where("user_id = ?", ownerId)
	}
	var rows []struct {
		Status string
		Total  int64
	}
	if err := query.Select("status, count(*) as total").Group("status").Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		switch row.Status {
		case TicketStatusOpen:
			counts["pending"] += row.Total
		case TicketStatusInProgress, TicketStatusResolved:
			counts["resolved"] += row.Total
		case TicketStatusClosed:
			counts["closed"] += row.Total
		}
	}
	return counts, nil
}

// BackfillTicketNumbers assigns ticket numbers to tickets created before the
// column existed.
func BackfillTicketNumbers() error {
	var tickets []Ticket
	if err := DB.Where("ticket_no IS NULL OR ticket_no = ?", "").Find(&tickets).Error; err != nil {
		return err
	}
	for i := range tickets {
		ticket := tickets[i]
		no := FormatTicketNo(ticket.CreatedAt, ticket.Id)
		if err := DB.Model(&Ticket{}).Where("id = ?", ticket.Id).Update("ticket_no", no).Error; err != nil {
			return err
		}
	}
	return nil
}
