package controller

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

const ticketAttachmentMaxSize = 5 << 20 // 5 MiB, matching the console upload limit

// ticketAttachmentTypes mirrors the file picker accept list of the ticket
// composer. Only these extensions are accepted and stored.
var ticketAttachmentTypes = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".webp": "image/webp",
	".bmp":  "image/bmp",
	".avif": "image/avif",
	".pdf":  "application/pdf",
	".doc":  "application/msword",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

var ticketAttachmentNamePattern = regexp.MustCompile(`^[a-f0-9]{32}\.[a-z0-9]{2,5}$`)

// TicketAttachmentDir returns the directory holding one user's ticket files.
func TicketAttachmentDir(userId int) (string, error) {
	root := os.Getenv("TICKET_ATTACHMENT_DIR")
	if root == "" {
		root = filepath.Join("data", "ticket-attachments")
	}
	dir := filepath.Join(root, fmt.Sprintf("u%d", userId))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func randomTicketAttachmentName(ext string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + ext, nil
}

// UploadTicketAttachment stores a screenshot or document that the user wants to
// reference from a ticket message. The returned URL is embedded into the
// message markdown by the console.
func UploadTicketAttachment(c *gin.Context) {
	userId := c.GetInt("id")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		common.ApiErrorMsg(c, "Attachment file is required")
		return
	}
	if fileHeader.Size <= 0 || fileHeader.Size > ticketAttachmentMaxSize {
		common.ApiErrorMsg(c, "Attachment size must be between 1 byte and 5 MB")
		return
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	contentType, ok := ticketAttachmentTypes[ext]
	if !ok {
		common.ApiErrorMsg(c, "Unsupported attachment type")
		return
	}
	dir, err := TicketAttachmentDir(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	name, err := randomTicketAttachmentName(ext)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := c.SaveUploadedFile(fileHeader, filepath.Join(dir, name)); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"url":          fmt.Sprintf("/api/ticket/attachment/%d/%s", userId, name),
		"name":         filepath.Base(fileHeader.Filename),
		"content_type": contentType,
		"size":         fileHeader.Size,
		"is_image":     strings.HasPrefix(contentType, "image/"),
	})
}

// DownloadTicketAttachment serves a stored ticket file. The route is public
// because the console renders attachments with plain <img>/<a> tags that cannot
// carry the dashboard Authorization header. The URL itself is the capability:
// every file name is 128 bits of crypto/rand output, so a stored file can only
// be reached by someone the uploader shared the message with.
func DownloadTicketAttachment(c *gin.Context) {
	ownerId, err := strconv.Atoi(c.Param("userId"))
	if err != nil || ownerId <= 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Attachment not found"})
		return
	}
	name := c.Param("name")
	if !ticketAttachmentNamePattern.MatchString(name) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Attachment not found"})
		return
	}
	dir, err := TicketAttachmentDir(ownerId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	fullPath := filepath.Join(dir, name)
	if _, err := os.Stat(fullPath); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Attachment not found"})
		return
	}
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "private, max-age=3600")
	if strings.HasPrefix(ticketAttachmentTypes[strings.ToLower(filepath.Ext(name))], "image/") {
		c.Header("Content-Disposition", "inline")
	} else {
		c.Header("Content-Disposition", "attachment")
	}
	c.File(fullPath)
}
