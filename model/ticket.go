package model

import (
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

// CreateTicket creates a ticket together with its first user message.
func CreateTicket(userId int, title, category, content string) (*Ticket, error) {
	if category == "" {
		category = "other"
	}
	ticket := &Ticket{
		UserId:    userId,
		Title:     title,
		Category:  category,
		Priority:  "normal",
		Status:    TicketStatusOpen,
		CreatedAt: nowUnix(),
		UpdatedAt: nowUnix(),
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(ticket).Error; err != nil {
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
		query = query.Where("status = ?", status)
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
