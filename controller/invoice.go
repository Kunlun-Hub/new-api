package controller

import (
	"errors"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

type applyInvoiceRequest struct {
	TradeNos         []string `json:"trade_nos"`
	OrderIds         []int    `json:"order_ids"`
	Type             string   `json:"type"`
	TitleType        string   `json:"title_type"`
	Title            string   `json:"title"`
	TaxId            string   `json:"tax_id"`
	ProjectType      int      `json:"project_type"`
	Content          string   `json:"content"`
	Remark           string   `json:"remark"`
	BuyerBankAccount string   `json:"buyer_bank_account"`
	BuyerTel         string   `json:"buyer_tel"`
	BuyerAddr        string   `json:"buyer_addr"`
}

type adminCreateInvoiceRequest struct {
	UserId int     `json:"user_id" binding:"required"`
	Amount float64 `json:"amount" binding:"required"`
	applyInvoiceRequest
}

type reviewInvoiceRequest struct {
	Status string `json:"status" binding:"required"`
	Reason string `json:"reason"`
}

type batchInvoicingRequest struct {
	Ids []int `json:"ids"`
}

func invoiceIdParam(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "invalid invoice id")
		return 0, false
	}
	return id, true
}

// normalizeInvoiceApplication 归一化开票信息并校验必填项。
func normalizeInvoiceApplication(req *applyInvoiceRequest) bool {
	req.Title = strings.TrimSpace(req.Title)
	req.TaxId = strings.TrimSpace(req.TaxId)
	req.Content = strings.TrimSpace(req.Content)
	req.Remark = strings.TrimSpace(req.Remark)
	req.BuyerBankAccount = strings.TrimSpace(req.BuyerBankAccount)
	req.BuyerTel = strings.TrimSpace(req.BuyerTel)
	req.BuyerAddr = strings.TrimSpace(req.BuyerAddr)
	if req.Title == "" {
		return false
	}
	if req.Type != model.InvoiceTypeSpecial {
		req.Type = model.InvoiceTypeNormal
	}
	if req.TitleType != model.InvoiceTitlePersonal {
		req.TitleType = model.InvoiceTitleCompany
	}
	if req.TitleType == model.InvoiceTitlePersonal {
		req.TaxId = "0"
		req.Type = model.InvoiceTypeNormal
	}
	if req.TitleType == model.InvoiceTitleCompany && req.TaxId == "" {
		return false
	}
	if req.ProjectType < 0 || req.ProjectType > 4 {
		req.ProjectType = 0
	}
	return true
}

func invoiceApplicationFromRequest(req applyInvoiceRequest, userId int, username string) model.InvoiceApplication {
	return model.InvoiceApplication{
		UserId:           userId,
		Username:         username,
		TradeNos:         req.TradeNos,
		Type:             req.Type,
		TitleType:        req.TitleType,
		Title:            req.Title,
		TaxId:            req.TaxId,
		ProjectType:      req.ProjectType,
		Content:          req.Content,
		Remark:           req.Remark,
		BuyerBankAccount: req.BuyerBankAccount,
		BuyerTel:         req.BuyerTel,
		BuyerAddr:        req.BuyerAddr,
	}
}

// resolveOrderIds 将订单主键转换为订单号。
func resolveOrderIds(userId int, orderIds []int) ([]string, error) {
	if len(orderIds) == 0 {
		return nil, nil
	}
	topups, err := model.GetInvoiceableTopUps(userId)
	if err != nil {
		return nil, err
	}
	picked := make(map[int]bool, len(orderIds))
	for _, id := range orderIds {
		picked[id] = true
	}
	tradeNos := make([]string, 0, len(orderIds))
	for _, topup := range topups {
		if picked[topup.Id] {
			tradeNos = append(tradeNos, topup.TradeNo)
		}
	}
	return tradeNos, nil
}

// GetUserInvoices 返回当前用户的开票申请记录
func GetUserInvoices(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	invoices, total, err := model.SearchUserInvoices(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(invoices)
	common.ApiSuccess(c, pageInfo)
}

// GetInvoiceEligibility 返回开票条件与未开票金额，可按选中订单计算。
func GetInvoiceEligibility(c *gin.Context) {
	userId := c.GetInt("id")
	orderIds := parseInvoiceOrderIds(c.Query("order_ids"))
	amount := 0.0
	var err error
	if len(orderIds) > 0 {
		tradeNos, resolveErr := resolveOrderIds(userId, orderIds)
		if resolveErr != nil {
			common.ApiError(c, resolveErr)
			return
		}
		amount, err = model.GetInvoiceableAmountForTradeNos(userId, tradeNos)
	} else {
		amount, err = model.GetInvoiceableAmount(userId)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pending, err := model.CountUserInvoices(userId, []string{model.InvoiceStatusPending})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	rejected, err := model.CountUserInvoices(userId, []string{model.InvoiceStatusRejected})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	minAmount := operation_setting.GetInvoiceMinAmount()
	canApply := amount >= minAmount && pending == 0 && rejected == 0 && amount > 0
	common.ApiSuccess(c, gin.H{
		"min_amount":         minAmount,
		"invoiceable_amount": amount,
		"amount":             amount,
		"pending_count":      pending,
		"rejected_count":     rejected,
		"can_apply":          canApply,
	})
}

func parseInvoiceOrderIds(raw string) []int {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	result := make([]int, 0)
	for _, item := range strings.Split(raw, ",") {
		id, err := strconv.Atoi(strings.TrimSpace(item))
		if err != nil || id <= 0 {
			continue
		}
		result = append(result, id)
	}
	return result
}

// ApplyInvoice 提交开票申请
func ApplyInvoice(c *gin.Context) {
	userId := c.GetInt("id")
	req := applyInvoiceRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if !normalizeInvoiceApplication(&req) {
		common.ApiErrorMsg(c, "invoice title is required")
		return
	}
	tradeNos, err := resolveOrderIds(userId, req.OrderIds)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(tradeNos) > 0 {
		req.TradeNos = tradeNos
	}
	app := invoiceApplicationFromRequest(req, userId, c.GetString("username"))
	invoice, err := model.CreateInvoice(app)
	if err != nil {
		if errors.Is(err, model.ErrInvoiceAmountNotEnough) {
			common.ApiErrorMsg(c, "invoiceable amount is below the minimum")
			return
		}
		if errors.Is(err, model.ErrInvoicePendingExists) {
			common.ApiErrorMsg(c, "pending invoice application exists")
			return
		}
		if errors.Is(err, model.ErrInvoiceNoOrder) {
			common.ApiErrorMsg(c, "no invoiceable order")
			return
		}
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, invoice)
}

// DeleteInvoice 撤销或删除开票申请（管理员可删除任意申请）
func DeleteInvoice(c *gin.Context) {
	id, ok := invoiceIdParam(c)
	if !ok {
		return
	}
	ownerId := c.GetInt("id")
	if c.GetInt("role") >= common.RoleAdminUser {
		ownerId = 0
	}
	if err := model.DeleteInvoice(id, ownerId); err != nil {
		if errors.Is(err, model.ErrInvoiceNotDeletable) {
			common.ApiErrorMsg(c, "invoice can not be deleted")
			return
		}
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// GetAllInvoices 管理员查看全部开票申请
func GetAllInvoices(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")
	status := c.Query("status")
	userId, _ := strconv.Atoi(c.Query("user_id"))
	invoices, total, err := model.SearchAllInvoices(keyword, status, userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(invoices)
	common.ApiSuccess(c, pageInfo)
}

// AdminUpdateInvoiceStatus 管理员更新开票申请状态（标记已开票/开票中/待审核/拒绝）
func AdminUpdateInvoiceStatus(c *gin.Context) {
	id, ok := invoiceIdParam(c)
	if !ok {
		return
	}
	req := reviewInvoiceRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateInvoiceStatus(id, req.Status, req.Reason); err != nil {
		if errors.Is(err, model.ErrInvoiceStatusInvalid) {
			common.ApiErrorMsg(c, "invalid invoice status")
			return
		}
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// AdminUpdateInvoiceInfo 管理员编辑待审核申请的开票信息
func AdminUpdateInvoiceInfo(c *gin.Context) {
	id, ok := invoiceIdParam(c)
	if !ok {
		return
	}
	req := applyInvoiceRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if !normalizeInvoiceApplication(&req) {
		common.ApiErrorMsg(c, "invoice title is required")
		return
	}
	app := invoiceApplicationFromRequest(req, 0, "")
	if err := model.UpdateInvoiceInfo(id, app); err != nil {
		if errors.Is(err, model.ErrInvoiceStatusInvalid) {
			common.ApiErrorMsg(c, "only pending invoices can be edited")
			return
		}
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// AdminBatchInvoicing 批量将待审核申请标记为开票中
func AdminBatchInvoicing(c *gin.Context) {
	req := batchInvoicingRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	updated, err := model.BatchInvoicing(req.Ids)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"updated": updated})
}

// AdminCreateInvoice 管理员手动创建发票（对公转账等无订单场景）
func AdminCreateInvoice(c *gin.Context) {
	req := adminCreateInvoiceRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	user, err := model.GetUserById(req.UserId, false)
	if err != nil {
		common.ApiErrorMsg(c, "user not found")
		return
	}
	form := req.applyInvoiceRequest
	if !normalizeInvoiceApplication(&form) {
		common.ApiErrorMsg(c, "invoice title is required")
		return
	}
	app := invoiceApplicationFromRequest(form, req.UserId, user.Username)
	app.Manual = true
	app.Amount = req.Amount
	app.TradeNos = nil
	invoice, err := model.CreateInvoice(app)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, invoice)
}

// AdminInvoiceAmount 统计时间段内已开票的笔数与金额
func AdminInvoiceAmount(c *gin.Context) {
	startTime, _ := strconv.ParseInt(c.Query("start_time"), 10, 64)
	endTime, _ := strconv.ParseInt(c.Query("end_time"), 10, 64)
	count, total, err := model.CountInvoicesInRange(startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"count": count, "total_amount": total})
}

// attachInvoiceStatus 为订单列表补充开票状态，便于前端直接展示。
func attachInvoiceStatus(topups []*model.TopUp) {
	if len(topups) == 0 {
		return
	}
	tradeNos := make([]string, 0, len(topups))
	for _, topup := range topups {
		tradeNos = append(tradeNos, topup.TradeNo)
	}
	statuses, err := model.GetTopUpInvoiceStatuses(tradeNos)
	if err != nil {
		return
	}
	for _, topup := range topups {
		topup.InvoiceStatus = statuses[topup.TradeNo]
	}
}
