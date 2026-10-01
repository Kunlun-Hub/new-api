package controller

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/objstore"

	"github.com/gin-gonic/gin"
)

// studioBackupObjectKey is the single object that holds a studio backup, so a
// new upload always replaces the previous one.
const studioBackupObjectKey = "studio/backup.json"

// maxStudioBackupBytes caps both the upload and the download of a backup.
const maxStudioBackupBytes = 32 << 20

type studioBackupStatus struct {
	Configured bool  `json:"configured"`
	Exists     bool  `json:"exists"`
	UpdatedAt  int64 `json:"updated_at"`
	Size       int64 `json:"size"`
}

// studioStorageOf loads the caller's personal bucket settings, reporting
// whether a usable bucket is configured.
func studioStorageOf(c *gin.Context) (objstore.Config, bool) {
	user, err := model.GetUserById(c.GetInt("id"), true)
	if err != nil {
		return objstore.Config{}, false
	}
	config := objstore.FromDTO(user.GetSetting().UserStorage)
	if config.Validate() != nil {
		return objstore.Config{}, false
	}
	return config, true
}

// GetStudioBackup reports whether the caller's bucket already holds a backup.
func GetStudioBackup(c *gin.Context) {
	config, ok := studioStorageOf(c)
	if !ok {
		common.ApiSuccess(c, studioBackupStatus{})
		return
	}

	info, err := objstore.Head(c.Request.Context(), config, studioBackupObjectKey)
	if errors.Is(err, objstore.ErrNotFound) {
		common.ApiSuccess(c, studioBackupStatus{Configured: true})
		return
	}
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgStudioBackupReadFailed, map[string]any{"Error": err.Error()})
		return
	}

	common.ApiSuccess(c, studioBackupStatus{
		Configured: true,
		Exists:     true,
		UpdatedAt:  info.LastModified.Unix(),
		Size:       info.Size,
	})
}

// PutStudioBackup stores the browser payload as a private object.
func PutStudioBackup(c *gin.Context) {
	config, ok := studioStorageOf(c)
	if !ok {
		common.ApiErrorI18n(c, i18n.MsgSettingStorageInvalid, map[string]any{"Error": "storage not configured"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxStudioBackupBytes+1))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgStudioBackupWriteFailed, map[string]any{"Error": err.Error()})
		return
	}
	if len(body) > maxStudioBackupBytes {
		common.ApiErrorI18n(c, i18n.MsgStudioBackupWriteFailed, map[string]any{"Error": "backup exceeds the size limit"})
		return
	}
	if common.GetJsonType(json.RawMessage(body)) != "object" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	if _, err := objstore.Put(c.Request.Context(), config, studioBackupObjectKey, "application/json", bytes.NewReader(body), int64(len(body))); err != nil {
		common.ApiErrorI18n(c, i18n.MsgStudioBackupWriteFailed, map[string]any{"Error": err.Error()})
		return
	}

	common.ApiSuccess(c, nil)
}

// DownloadStudioBackup streams the stored backup back to the browser.
func DownloadStudioBackup(c *gin.Context) {
	config, ok := studioStorageOf(c)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "storage not configured"})
		return
	}

	body, info, err := objstore.Get(c.Request.Context(), config, studioBackupObjectKey)
	if errors.Is(err, objstore.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "backup not found"})
		return
	}
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgStudioBackupReadFailed, map[string]any{"Error": err.Error()})
		return
	}
	defer body.Close()

	if info.Size > maxStudioBackupBytes {
		common.ApiErrorI18n(c, i18n.MsgStudioBackupReadFailed, map[string]any{"Error": "backup exceeds the size limit"})
		return
	}

	c.Header("Content-Type", "application/json; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=\"studio-backup.json\"")
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, io.LimitReader(body, maxStudioBackupBytes))
}
