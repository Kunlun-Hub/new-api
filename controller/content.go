package controller

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type contentItemRequest struct {
	Slug        string          `json:"slug"`
	Locale      string          `json:"locale"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Category    string          `json:"category"`
	Status      string          `json:"status"`
	SortOrder   int             `json:"sort_order"`
	Data        json.RawMessage `json:"data"`
	PublishedAt int64           `json:"published_at"`
}

type contentItemDTO struct {
	model.ContentItem
	Data json.RawMessage `json:"data"`
}

type contentImportRequest struct {
	Items []contentItemRequest `json:"items"`
}

func toContentItemDTO(item model.ContentItem) contentItemDTO {
	dto := contentItemDTO{ContentItem: item, Data: json.RawMessage(item.Data)}
	if len(dto.Data) == 0 || !json.Valid(dto.Data) {
		dto.Data = json.RawMessage("{}")
	}
	return dto
}

func contentIdParam(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Invalid content id"})
		return 0, false
	}
	return id, true
}

func contentKindParam(c *gin.Context) (string, bool) {
	kind := strings.TrimSpace(c.Param("kind"))
	if !model.IsContentKind(kind) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Invalid content kind"})
		return "", false
	}
	return kind, true
}

// contentModuleEnabled reports whether the header-nav module that owns a
// content kind is switched on.
func contentModuleEnabled(kind string) bool {
	module, ok := model.ContentKindModules[kind]
	if !ok {
		return true
	}
	return middleware.HeaderNavModuleEnabled(module)
}

// GetContentList returns the published items of one content kind.
func GetContentList(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	if !contentModuleEnabled(kind) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "This content module is disabled"})
		return
	}
	items, err := model.ListPublishedContent(kind, strings.TrimSpace(c.Query("locale")))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	dtos := make([]contentItemDTO, 0, len(items))
	for _, item := range items {
		dtos = append(dtos, toContentItemDTO(item))
	}
	common.ApiSuccess(c, gin.H{"items": dtos})
}

// GetContentDetail returns one published item selected by its slug.
func GetContentDetail(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	if !contentModuleEnabled(kind) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "This content module is disabled"})
		return
	}
	slug := strings.TrimSpace(c.Param("slug"))
	item, err := model.GetPublishedContentBySlug(kind, slug, strings.TrimSpace(c.Query("locale")))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Content not found"})
		return
	}
	common.ApiSuccess(c, toContentItemDTO(*item))
}

// AdminListContent lists every item of a kind, including drafts.
func AdminListContent(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	pageInfo := common.GetPageQuery(c)
	items, total, err := model.ListContentItems(kind, c.Query("status"), c.Query("keyword"), pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	dtos := make([]contentItemDTO, 0, len(items))
	for _, item := range items {
		dtos = append(dtos, toContentItemDTO(item))
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(dtos)
	common.ApiSuccess(c, pageInfo)
}

func applyContentRequest(item *model.ContentItem, req contentItemRequest) {
	item.Slug = req.Slug
	item.Locale = req.Locale
	item.Title = req.Title
	item.Description = req.Description
	item.Category = req.Category
	item.Status = req.Status
	item.SortOrder = req.SortOrder
	item.PublishedAt = req.PublishedAt
	if len(req.Data) > 0 {
		item.Data = string(req.Data)
	}
}

// AdminUpsertContent creates one content item, or replaces the item with the
// same kind/locale/slug when it already exists.
func AdminUpsertContent(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	req := contentItemRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	item := &model.ContentItem{Kind: kind}
	applyContentRequest(item, req)
	model.NormalizeContentItem(item)
	if item.Slug == "" || item.Title == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Title and slug are required"})
		return
	}
	if strings.ContainsAny(item.Slug, " \t/?#") {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Slug cannot contain spaces, slashes or URL symbols"})
		return
	}
	saved, err := model.UpsertContentItem(item)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, toContentItemDTO(*saved))
}

// AdminUpdateContent updates one content item selected by id.
func AdminUpdateContent(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	id, ok := contentIdParam(c)
	if !ok {
		return
	}
	existing, err := model.GetContentItemById(id)
	if err != nil || existing.Kind != kind {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Content not found"})
		return
	}
	req := contentItemRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	applyContentRequest(existing, req)
	model.NormalizeContentItem(existing)
	if existing.Slug == "" || existing.Title == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Title and slug are required"})
		return
	}
	if strings.ContainsAny(existing.Slug, " \t/?#") {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Slug cannot contain spaces, slashes or URL symbols"})
		return
	}
	saved, err := model.UpsertContentItem(existing)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, toContentItemDTO(*saved))
}

// AdminDeleteContent removes one content item.
func AdminDeleteContent(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	id, ok := contentIdParam(c)
	if !ok {
		return
	}
	existing, err := model.GetContentItemById(id)
	if err != nil || existing.Kind != kind {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Content not found"})
		return
	}
	if err := model.DeleteContentItem(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// AdminImportContent bulk-imports items into one content kind. Existing
// kind/locale/slug combinations are replaced, which is how the built-in content
// of a fresh deployment is moved into the database.
func AdminImportContent(c *gin.Context) {
	kind, ok := contentKindParam(c)
	if !ok {
		return
	}
	req := contentImportRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Nothing to import"})
		return
	}
	if len(req.Items) > 500 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Too many items in one import"})
		return
	}
	imported := 0
	for i := range req.Items {
		item := &model.ContentItem{Kind: kind}
		applyContentRequest(item, req.Items[i])
		model.NormalizeContentItem(item)
		if item.Slug == "" || item.Title == "" || strings.ContainsAny(item.Slug, " \t/?#") {
			continue
		}
		if _, err := model.UpsertContentItem(item); err != nil {
			common.ApiError(c, err)
			return
		}
		imported++
	}
	common.ApiSuccess(c, gin.H{"imported": imported})
}
