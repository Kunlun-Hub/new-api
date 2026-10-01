package controller

import (
	"io"
	"net/url"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

const (
	defaultStudioSharePageSize = 24
	maxStudioSharePageSize     = 60
)

// studioSharePageSize reads the page size of a studio gallery request.
func studioSharePageSize(c *gin.Context) int {
	pageSize, err := strconv.Atoi(c.DefaultQuery("page_size", strconv.Itoa(defaultStudioSharePageSize)))
	if err != nil || pageSize < 1 {
		return defaultStudioSharePageSize
	}
	if pageSize > maxStudioSharePageSize {
		return maxStudioSharePageSize
	}
	return pageSize
}

// studioShareKind reads and validates the optional media filter.
func studioShareKind(c *gin.Context) string {
	kind := c.Query("kind")
	if kind != model.StudioShareKindImage && kind != model.StudioShareKindVideo {
		return ""
	}
	return kind
}

// GetStudioShares returns the discover gallery: published works of the
// community plus finished Midjourney works of this installation.
func GetStudioShares(c *gin.Context) {
	viewerId := c.GetInt("id")
	includePending := c.Query("include_pending") == "1" || c.Query("include_pending") == "true"

	items, nextCursor, err := model.GetStudioShareFeed(
		studioShareKind(c),
		c.Query("cursor"),
		studioSharePageSize(c),
		viewerId,
		includePending,
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items":       items,
		"next_cursor": nextCursor,
	})
}

// GetMyStudioShares lists the caller's own submissions, newest first.
func GetMyStudioShares(c *gin.Context) {
	items, nextCursor, err := model.GetUserStudioShares(
		c.GetInt("id"),
		studioShareKind(c),
		c.Query("cursor"),
		studioSharePageSize(c),
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items":       items,
		"next_cursor": nextCursor,
	})
}

// GetStudioShare returns one work of the gallery. Pending submissions are only
// visible to their author and to administrators.
func GetStudioShare(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}

	share, err := model.GetStudioShareById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if share == nil {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}
	if share.Status != model.StudioShareStatusApproved && share.UserId != c.GetInt("id") && c.GetInt("role") < common.RoleAdminUser {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}

	detail, err := share.Detail(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, detail)
}

// studioShareSubmitRequest is the browser payload of a submission.
type studioShareSubmitRequest struct {
	Kind string                   `json:"kind"`
	Data model.StudioShareArtwork `json:"data"`
}

// validateStudioShareArtwork rejects snapshots that could not be rendered or
// that point at a media source the gallery cannot serve.
func validateStudioShareArtwork(artwork *model.StudioShareArtwork) string {
	if artwork.Status != "done" {
		return i18n.MsgStudioShareInvalid
	}
	if artwork.Kind != model.StudioShareKindImage && artwork.Kind != model.StudioShareKindVideo {
		return i18n.MsgStudioShareInvalid
	}
	if !studioShareMediaURL(artwork.Url) {
		return i18n.MsgStudioShareInvalidMedia
	}
	if artwork.Width < 0 || artwork.Height < 0 {
		return i18n.MsgStudioShareInvalid
	}
	if len(artwork.Prompt) > 4000 || len(artwork.Model) > 200 {
		return i18n.MsgStudioShareInvalid
	}
	return ""
}

// studioShareMediaURL accepts absolute http(s) URLs and site relative paths so
// a stored work never points at a scheme the gallery cannot render.
func studioShareMediaURL(raw string) bool {
	if raw == "" || strings.HasPrefix(raw, "//") {
		return false
	}
	if strings.HasPrefix(raw, "/") {
		return !strings.ContainsAny(raw, "\r\n\t ")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

// SubmitStudioShare stores one finished work for review.
func SubmitStudioShare(c *gin.Context) {
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, model.StudioShareDataMaxBytes+1))
	if err != nil || len(body) > model.StudioShareDataMaxBytes {
		common.ApiErrorI18n(c, i18n.MsgStudioShareInvalid)
		return
	}
	request := studioShareSubmitRequest{}
	if err := common.Unmarshal(body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgStudioShareInvalid)
		return
	}
	if request.Kind != model.StudioShareKindImage && request.Kind != model.StudioShareKindVideo {
		common.ApiErrorI18n(c, i18n.MsgStudioShareInvalid)
		return
	}
	request.Data.Kind = request.Kind
	if key := validateStudioShareArtwork(&request.Data); key != "" {
		common.ApiErrorI18n(c, key)
		return
	}

	share, err := model.CreateStudioShare(c.GetInt("id"), request.Kind, request.Data)
	if err != nil {
		if err == model.ErrStudioSharePendingLimit {
			common.ApiErrorI18n(c, i18n.MsgStudioSharePendingLimit)
			return
		}
		common.ApiError(c, err)
		return
	}

	detail, err := share.Detail(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, detail)
}

// DeleteStudioShare removes one of the caller's own submissions.
func DeleteStudioShare(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}
	share, err := model.GetStudioShareById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if share == nil || share.UserId != c.GetInt("id") {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}
	deleted, err := model.DeleteStudioShare(id, c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !deleted {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}
	if detail, detailErr := share.Detail(c.GetInt("id")); detailErr == nil {
		removeStudioShareMedia(detail.Data)
	}
	common.ApiSuccess(c, nil)
}

// ApproveStudioShare publishes one of the caller's pending submissions.
func ApproveStudioShare(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}
	share, err := model.ApproveStudioShare(id, c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if share == nil {
		common.ApiErrorI18n(c, i18n.MsgStudioShareNotFound)
		return
	}
	detail, err := share.Detail(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, detail)
}
