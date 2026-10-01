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
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

const (
	studioShareImageMaxSize = 10 << 20
	studioShareVideoMaxSize = 64 << 20
)

// studioShareMediaTypes maps the accepted extensions to their content type.
var studioShareMediaTypes = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif":  "image/gif",
	".avif": "image/avif",
	".mp4":  "video/mp4",
	".webm": "video/webm",
	".mov":  "video/quicktime",
}

var studioShareMediaNamePattern = regexp.MustCompile(`^[a-f0-9]{32}\.[a-z0-9]{2,5}$`)

// StudioShareMediaDir returns the directory holding one author's share media.
func StudioShareMediaDir(userId int) (string, error) {
	root := os.Getenv("STUDIO_SHARE_MEDIA_DIR")
	if root == "" {
		root = filepath.Join("data", "studio-share-media")
	}
	dir := filepath.Join(root, fmt.Sprintf("u%d", userId))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func randomStudioShareMediaName(ext string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + ext, nil
}

// UploadStudioShareMedia stores the media of a work whose source URL cannot be
// served publicly (a browser object URL or an inline data URL). The gallery
// then renders the returned capability URL.
func UploadStudioShareMedia(c *gin.Context) {
	userId := c.GetInt("id")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgStudioShareMediaInvalid)
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	contentType, ok := studioShareMediaTypes[ext]
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgStudioShareMediaInvalid)
		return
	}
	limit := int64(studioShareVideoMaxSize)
	if strings.HasPrefix(contentType, "image/") {
		limit = studioShareImageMaxSize
	}
	if fileHeader.Size <= 0 || fileHeader.Size > limit {
		common.ApiErrorI18n(c, i18n.MsgStudioShareMediaTooLarge)
		return
	}

	dir, err := StudioShareMediaDir(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	name, err := randomStudioShareMediaName(ext)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := c.SaveUploadedFile(fileHeader, filepath.Join(dir, name)); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"url":          fmt.Sprintf("/api/studio/share/media/%d/%s", userId, name),
		"content_type": contentType,
		"size":         fileHeader.Size,
	})
}

// removeStudioShareMedia deletes the locally stored media of a removed share.
// Media served from elsewhere is left untouched.
func removeStudioShareMedia(artwork model.StudioShareArtwork) {
	url := artwork.Url
	prefix := "/api/studio/share/media/"
	if !strings.HasPrefix(url, prefix) {
		return
	}
	parts := strings.Split(strings.TrimPrefix(url, prefix), "/")
	if len(parts) != 2 {
		return
	}
	ownerId, err := strconv.Atoi(parts[0])
	if err != nil || ownerId <= 0 || !studioShareMediaNamePattern.MatchString(parts[1]) {
		return
	}
	dir, err := StudioShareMediaDir(ownerId)
	if err != nil {
		return
	}
	_ = os.Remove(filepath.Join(dir, parts[1]))
}

// DownloadStudioShareMedia serves stored share media. The route is public
// because gallery images cannot carry the dashboard Authorization header: the
// random file name is the capability, exactly like ticket attachments.
func DownloadStudioShareMedia(c *gin.Context) {
	ownerId, err := strconv.Atoi(c.Param("userId"))
	if err != nil || ownerId <= 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Media not found"})
		return
	}
	name := c.Param("name")
	if !studioShareMediaNamePattern.MatchString(name) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Media not found"})
		return
	}
	dir, err := StudioShareMediaDir(ownerId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	fullPath := filepath.Join(dir, name)
	if _, err := os.Stat(fullPath); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Media not found"})
		return
	}
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "public, max-age=86400")
	c.File(fullPath)
}
