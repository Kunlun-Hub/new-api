package model

import (
	"errors"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

// 发票类型
const (
	InvoiceTypeNormal  = "normal"
	InvoiceTypeSpecial = "special"
)

// 抬头类型
const (
	InvoiceTitleCompany  = "company"
	InvoiceTitlePersonal = "personal"
)

// 申请状态
const (
	InvoiceStatusPending     = "pending"      // 待审核
	InvoiceStatusInvoicing   = "invoicing"    // 开票中
	InvoiceStatusApproved    = "approved"     // 已通过/已开票
	InvoiceStatusRejected    = "rejected"     // 已拒绝
	InvoiceStatusRedFlushing = "red_flushing" // 红冲中
)

// InvoiceStatuses 返回全部合法状态
func InvoiceStatuses() []string {
	return []string{
		InvoiceStatusPending,
		InvoiceStatusInvoicing,
		InvoiceStatusApproved,
		InvoiceStatusRejected,
		InvoiceStatusRedFlushing,
	}
}

// IsInvoiceStatusValid 判断状态是否合法
func IsInvoiceStatusValid(status string) bool {
	for _, item := range InvoiceStatuses() {
		if item == status {
			return true
		}
	}
	return false
}

var (
	ErrInvoiceNoOrder         = errors.New("no invoiceable order")
	ErrInvoiceAmountNotEnough = errors.New("invoiceable amount not enough")
	ErrInvoicePendingExists   = errors.New("pending invoice application exists")
	ErrInvoiceNotFound        = errors.New("invoice not found")
	ErrInvoiceNotDeletable    = errors.New("invoice not deletable")
	ErrInvoiceStatusInvalid   = errors.New("invoice status invalid")
	ErrInvoiceReasonRequired  = errors.New("invoice reason required")
)

// Invoice 是用户提交的开票申请，一次申请可以覆盖多笔充值订单。
type Invoice struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int    `json:"user_id" gorm:"not null;index:idx_invoice_user"`
	Username  string `json:"username" gorm:"type:varchar(64);not null;default:''"`
	Type      string `json:"type" gorm:"type:varchar(16);not null;default:'normal'"`
	TitleType string `json:"title_type" gorm:"type:varchar(16);not null;default:'company'"`
	Title     string `json:"title" gorm:"type:varchar(255);not null;default:''"`
	TaxId     string `json:"tax_id" gorm:"type:varchar(64);not null;default:''"`
	// ProjectType 对应开票项目名称（0 信息技术服务费 / 1 信息系统服务 / 2 软件测试服务 / 3 API技术服务 / 4 技术服务）
	ProjectType int    `json:"project_type" gorm:"default:0"`
	Content     string `json:"content" gorm:"type:varchar(255);not null;default:''"`
	Remark      string `json:"remark" gorm:"type:varchar(500);not null;default:''"`
	// 增值税专用发票的购买方信息
	BuyerBankAccount string  `json:"buyer_bank_account" gorm:"type:varchar(255);not null;default:''"`
	BuyerTel         string  `json:"buyer_tel" gorm:"type:varchar(64);not null;default:''"`
	BuyerAddr        string  `json:"buyer_addr" gorm:"type:varchar(255);not null;default:''"`
	Amount           float64 `json:"amount"`
	TradeNos         string  `json:"trade_nos" gorm:"type:text"`
	Status           string  `json:"status" gorm:"type:varchar(16);not null;default:'pending';index:idx_invoice_status"`
	Reason           string  `json:"reason" gorm:"type:varchar(255);not null;default:''"`
	FileUrl          string  `json:"file_url" gorm:"type:varchar(512);not null;default:''"`
	InvoiceNo        string  `json:"invoice_no" gorm:"type:varchar(64);not null;default:''"`
	RedInvoiceNo     string  `json:"red_invoice_no" gorm:"type:varchar(64);not null;default:''"`
	CreatedAt        int64   `json:"created_at" gorm:"bigint"`
	UpdatedAt        int64   `json:"updated_at" gorm:"bigint"`
	// Orders 为申请覆盖的充值订单，仅在列表/详情接口中回填
	Orders []InvoiceOrder `json:"orders" gorm:"-"`
}

func (Invoice) TableName() string {
	return "invoices"
}

// InvoiceOrder 记录申请与充值订单的对应关系，便于订单列表展示开票状态。
type InvoiceOrder struct {
	Id        int     `json:"id" gorm:"primaryKey;autoIncrement"`
	InvoiceId int     `json:"invoice_id" gorm:"not null;index:idx_invoice_order_invoice"`
	UserId    int     `json:"user_id" gorm:"not null;index:idx_invoice_order_user"`
	TradeNo   string  `json:"trade_no" gorm:"type:varchar(255);not null;index:idx_invoice_order_trade_no"`
	Amount    float64 `json:"amount"`
	Money     float64 `json:"money" gorm:"-"`
}

func (InvoiceOrder) TableName() string {
	return "invoice_orders"
}

// InvoiceApplication 是一次开票申请的提交内容。
type InvoiceApplication struct {
	UserId           int
	Username         string
	TradeNos         []string
	Type             string
	TitleType        string
	Title            string
	TaxId            string
	ProjectType      int
	Content          string
	Remark           string
	BuyerBankAccount string
	BuyerTel         string
	BuyerAddr        string
	// Amount 仅管理员手动创建发票时使用
	Amount float64
	// Manual 为 true 时跳过订单校验（管理员手动创建）
	Manual bool
}

// invoiceableTopUpQuery 返回已支付、未被有效申请占用且未被标记已开票的订单。
func invoiceableTopUpQuery(userId int) *gorm.DB {
	usedTradeNos := DB.Model(&InvoiceOrder{}).
		Select("invoice_orders.trade_no").
		Joins("JOIN invoices ON invoices.id = invoice_orders.invoice_id").
		Where("invoices.status IN ?", []string{
			InvoiceStatusPending,
			InvoiceStatusInvoicing,
			InvoiceStatusApproved,
			InvoiceStatusRedFlushing,
		})
	return DB.Model(&TopUp{}).
		Where("user_id = ?", userId).
		Where("status = ?", common.TopUpStatusSuccess).
		Where("type = ?", TopUpTypeOnline).
		Where("(is_invoiced IS NULL OR is_invoiced = ?)", false).
		Where("trade_no NOT IN (?)", usedTradeNos)
}

// GetInvoiceableTopUps 返回用户可开票的充值订单。
func GetInvoiceableTopUps(userId int) ([]TopUp, error) {
	var topups []TopUp
	err := invoiceableTopUpQuery(userId).Order("create_time DESC").Find(&topups).Error
	return topups, err
}

// GetInvoiceableAmount 返回用户当前可开票金额。
func GetInvoiceableAmount(userId int) (float64, error) {
	topups, err := GetInvoiceableTopUps(userId)
	if err != nil {
		return 0, err
	}
	return sumInvoiceAmount(topups), nil
}

// GetInvoiceableAmountForTradeNos 返回指定订单的可开票金额（订单需属于该用户且可开票）。
func GetInvoiceableAmountForTradeNos(userId int, tradeNos []string) (float64, error) {
	topups, err := GetInvoiceableTopUps(userId)
	if err != nil {
		return 0, err
	}
	return sumInvoiceAmount(pickInvoiceTopUps(topups, tradeNos)), nil
}

func sumInvoiceAmount(topups []TopUp) float64 {
	var total float64
	for _, topup := range topups {
		total += topup.Money
	}
	return roundInvoiceAmount(total)
}

func roundInvoiceAmount(amount float64) float64 {
	return math.Round(amount*100) / 100
}

// CountUserInvoices 统计用户在指定状态下的申请数量。
func CountUserInvoices(userId int, statuses []string) (int64, error) {
	var count int64
	err := DB.Model(&Invoice{}).Where("user_id = ?", userId).Where("status IN ?", statuses).Count(&count).Error
	return count, err
}

// CreateInvoice 校验并创建一次开票申请，同时锁定所选订单。
func CreateInvoice(app InvoiceApplication) (*Invoice, error) {
	var amount float64
	var tradeNos []string

	if app.Manual {
		if app.Amount <= 0 {
			return nil, ErrInvoiceAmountNotEnough
		}
		amount = roundInvoiceAmount(app.Amount)
	} else {
		blocking, err := CountUserInvoices(app.UserId, []string{InvoiceStatusPending, InvoiceStatusRejected})
		if err != nil {
			return nil, err
		}
		if blocking > 0 {
			return nil, ErrInvoicePendingExists
		}

		topups, err := GetInvoiceableTopUps(app.UserId)
		if err != nil {
			return nil, err
		}
		picked := pickInvoiceTopUps(topups, app.TradeNos)
		if len(picked) == 0 {
			return nil, ErrInvoiceNoOrder
		}
		amount = sumInvoiceAmount(picked)
		if amount < operation_setting.GetInvoiceMinAmount() {
			return nil, ErrInvoiceAmountNotEnough
		}
		for _, topup := range picked {
			tradeNos = append(tradeNos, topup.TradeNo)
		}
	}

	invoice := &Invoice{
		UserId:           app.UserId,
		Username:         app.Username,
		Type:             app.Type,
		TitleType:        app.TitleType,
		Title:            app.Title,
		TaxId:            app.TaxId,
		ProjectType:      app.ProjectType,
		Content:          app.Content,
		Remark:           app.Remark,
		BuyerBankAccount: app.BuyerBankAccount,
		BuyerTel:         app.BuyerTel,
		BuyerAddr:        app.BuyerAddr,
		Amount:           amount,
		TradeNos:         strings.Join(tradeNos, ","),
		Status:           InvoiceStatusPending,
		CreatedAt:        nowUnix(),
		UpdatedAt:        nowUnix(),
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(invoice).Error; err != nil {
			return err
		}
		if len(tradeNos) == 0 {
			return nil
		}
		orders := make([]InvoiceOrder, 0, len(tradeNos))
		for _, tradeNo := range tradeNos {
			orders = append(orders, InvoiceOrder{
				InvoiceId: invoice.Id,
				UserId:    app.UserId,
				TradeNo:   tradeNo,
			})
		}
		return tx.Create(&orders).Error
	})
	if err != nil {
		return nil, err
	}
	if err := fillInvoiceOrderAmounts([]*Invoice{invoice}); err != nil {
		return nil, err
	}
	return invoice, nil
}

func pickInvoiceTopUps(topups []TopUp, tradeNos []string) []TopUp {
	if len(tradeNos) == 0 {
		return topups
	}
	selected := make(map[string]bool, len(tradeNos))
	for _, tradeNo := range tradeNos {
		selected[tradeNo] = true
	}
	picked := make([]TopUp, 0, len(tradeNos))
	for _, topup := range topups {
		if selected[topup.TradeNo] {
			picked = append(picked, topup)
		}
	}
	return picked
}

// fillInvoiceOrderAmounts 回填申请覆盖订单的支付金额，用于列表与复制信息展示。
func fillInvoiceOrderAmounts(invoices []*Invoice) error {
	if len(invoices) == 0 {
		return nil
	}
	ids := make([]int, 0, len(invoices))
	tradeNos := make([]string, 0)
	for _, invoice := range invoices {
		ids = append(ids, invoice.Id)
		if invoice.TradeNos != "" {
			tradeNos = append(tradeNos, strings.Split(invoice.TradeNos, ",")...)
		}
	}
	if len(tradeNos) == 0 {
		for _, invoice := range invoices {
			invoice.Orders = []InvoiceOrder{}
		}
		return nil
	}
	var orders []InvoiceOrder
	if err := DB.Where("invoice_id IN ?", ids).Order("id ASC").Find(&orders).Error; err != nil {
		return err
	}
	moneyByTradeNo := make(map[string]float64, len(tradeNos))
	var topups []TopUp
	if err := DB.Where("trade_no IN ?", tradeNos).Find(&topups).Error; err != nil {
		return err
	}
	for _, topup := range topups {
		moneyByTradeNo[topup.TradeNo] = roundInvoiceAmount(topup.Money)
	}
	grouped := make(map[int][]InvoiceOrder, len(invoices))
	for _, order := range orders {
		order.Money = moneyByTradeNo[order.TradeNo]
		grouped[order.InvoiceId] = append(grouped[order.InvoiceId], order)
	}
	for _, invoice := range invoices {
		if orders, ok := grouped[invoice.Id]; ok {
			invoice.Orders = orders
			continue
		}
		invoice.Orders = []InvoiceOrder{}
	}
	return nil
}

// SearchUserInvoices 分页返回用户的开票申请。
func SearchUserInvoices(userId int, pageInfo *common.PageInfo) ([]Invoice, int64, error) {
	var invoices []Invoice
	var total int64
	query := DB.Model(&Invoice{}).Where("user_id = ?", userId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("id DESC").Offset(pageInfo.GetStartIdx()).Limit(pageInfo.GetPageSize()).Find(&invoices).Error
	if err != nil {
		return nil, 0, err
	}
	if err := fillInvoiceOrderAmounts(ptrInvoices(invoices)); err != nil {
		return nil, 0, err
	}
	return invoices, total, nil
}

func ptrInvoices(invoices []Invoice) []*Invoice {
	result := make([]*Invoice, 0, len(invoices))
	for i := range invoices {
		result = append(result, &invoices[i])
	}
	return result
}

// SearchAllInvoices 分页返回全部开票申请，支持按状态、用户与抬头搜索。
func SearchAllInvoices(keyword string, status string, userId int, pageInfo *common.PageInfo) ([]Invoice, int64, error) {
	var invoices []Invoice
	var total int64
	query := DB.Model(&Invoice{})
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if userId > 0 {
		query = query.Where("user_id = ?", userId)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("title LIKE ? OR username LIKE ? OR trade_nos LIKE ?", like, like, like)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("id DESC").Offset(pageInfo.GetStartIdx()).Limit(pageInfo.GetPageSize()).Find(&invoices).Error
	if err != nil {
		return nil, 0, err
	}
	if err := fillInvoiceOrderAmounts(ptrInvoices(invoices)); err != nil {
		return nil, 0, err
	}
	return invoices, total, nil
}

// GetInvoiceById 按主键查询申请，ownerId 大于 0 时同时限定归属。
func GetInvoiceById(id int, ownerId int) (*Invoice, error) {
	invoice := &Invoice{}
	query := DB.Where("id = ?", id)
	if ownerId > 0 {
		query = query.Where("user_id = ?", ownerId)
	}
	if err := query.First(invoice).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvoiceNotFound
		}
		return nil, err
	}
	return invoice, nil
}

// DeleteInvoice 删除申请及其订单占用；已开票/开票中/红冲中的申请不可删除。
func DeleteInvoice(id int, ownerId int) error {
	invoice, err := GetInvoiceById(id, ownerId)
	if err != nil {
		return err
	}
	switch invoice.Status {
	case InvoiceStatusApproved, InvoiceStatusInvoicing, InvoiceStatusRedFlushing:
		return ErrInvoiceNotDeletable
	}
	if invoice.RedInvoiceNo != "" {
		return ErrInvoiceNotDeletable
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("invoice_id = ?", invoice.Id).Delete(&InvoiceOrder{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", invoice.Id).Delete(&Invoice{}).Error
	})
}

// UpdateInvoiceStatus 更新申请状态（管理员）。
func UpdateInvoiceStatus(id int, status string, reason string) error {
	if !IsInvoiceStatusValid(status) {
		return ErrInvoiceStatusInvalid
	}
	invoice, err := GetInvoiceById(id, 0)
	if err != nil {
		return err
	}
	updates := map[string]any{
		"status":     status,
		"updated_at": nowUnix(),
	}
	if status == InvoiceStatusRejected {
		reason = strings.TrimSpace(reason)
		if reason == "" {
			reason = "不符合开票条件"
		}
		updates["reason"] = reason
	} else if invoice.Status == InvoiceStatusRejected {
		// 从拒绝状态重新流转时清空驳回原因
		updates["reason"] = ""
	}
	return DB.Model(&Invoice{}).Where("id = ?", id).Updates(updates).Error
}

// UpdateInvoiceInfo 管理员修改申请的开票信息。
func UpdateInvoiceInfo(id int, app InvoiceApplication) error {
	invoice, err := GetInvoiceById(id, 0)
	if err != nil {
		return err
	}
	if invoice.Status != InvoiceStatusPending {
		return ErrInvoiceStatusInvalid
	}
	return DB.Model(&Invoice{}).Where("id = ?", id).Updates(map[string]any{
		"type":               app.Type,
		"title_type":         app.TitleType,
		"title":              app.Title,
		"tax_id":             app.TaxId,
		"project_type":       app.ProjectType,
		"content":            app.Content,
		"buyer_bank_account": app.BuyerBankAccount,
		"buyer_tel":          app.BuyerTel,
		"buyer_addr":         app.BuyerAddr,
		"updated_at":         nowUnix(),
	}).Error
}

// BatchInvoicing 将待审核申请批量标记为开票中。
func BatchInvoicing(ids []int) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	result := DB.Model(&Invoice{}).
		Where("id IN ?", ids).
		Where("status = ?", InvoiceStatusPending).
		Where("red_invoice_no = ?", "").
		Updates(map[string]any{
			"status":     InvoiceStatusInvoicing,
			"updated_at": nowUnix(),
		})
	return result.RowsAffected, result.Error
}

// CountInvoicesInRange 统计时间段内已开票的笔数与金额（管理员）。
func CountInvoicesInRange(startTime int64, endTime int64) (int64, float64, error) {
	var count int64
	query := DB.Model(&Invoice{}).Where("status = ?", InvoiceStatusApproved)
	if startTime > 0 {
		query = query.Where("created_at >= ?", startTime)
	}
	if endTime > 0 {
		query = query.Where("created_at <= ?", endTime)
	}
	if err := query.Count(&count).Error; err != nil {
		return 0, 0, err
	}
	row := struct {
		Total float64
	}{}
	if err := query.Select("COALESCE(SUM(amount), 0) AS total").Scan(&row).Error; err != nil {
		return 0, 0, err
	}
	return count, roundInvoiceAmount(row.Total), nil
}

// UpdateTopUpInvoiced 标记单笔订单是否已开票（管理员）。
func UpdateTopUpInvoiced(id int, isInvoiced bool) error {
	result := DB.Model(&TopUp{}).Where("id = ?", id).Update("is_invoiced", isInvoiced)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrTopUpNotFound
	}
	return nil
}

// BatchUpdateTopUpInvoiced 批量标记订单是否已开票（管理员）。
func BatchUpdateTopUpInvoiced(ids []int, isInvoiced bool) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	result := DB.Model(&TopUp{}).Where("id IN ?", ids).Update("is_invoiced", isInvoiced)
	return result.RowsAffected, result.Error
}

// ClearInvalidTopUps 删除指定小时数之前仍未支付的订单（管理员）。
func ClearInvalidTopUps(hour int) (int64, error) {
	if hour <= 0 {
		hour = 48
	}
	cutoff := nowUnix() - int64(hour)*3600
	result := DB.Where("status = ? AND create_time < ?", common.TopUpStatusPending, cutoff).Delete(&TopUp{})
	return result.RowsAffected, result.Error
}

// GetTopUpInvoiceStatuses 返回订单号到开票状态的映射。
func GetTopUpInvoiceStatuses(tradeNos []string) (map[string]string, error) {
	statuses := make(map[string]string, len(tradeNos))
	if len(tradeNos) == 0 {
		return statuses, nil
	}
	var rows []struct {
		TradeNo string
		Status  string
	}
	err := DB.Table("invoice_orders").
		Select("invoice_orders.trade_no AS trade_no, invoices.status AS status").
		Joins("JOIN invoices ON invoices.id = invoice_orders.invoice_id").
		Where("invoice_orders.trade_no IN ?", tradeNos).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		statuses[row.TradeNo] = row.Status
	}
	return statuses, nil
}
