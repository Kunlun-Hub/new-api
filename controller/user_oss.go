package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/service/objstore"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

// userOssUploadMaxBytes caps every attachment uploaded for studio scenes.
const userOssUploadMaxBytes = 32 << 20

// userOssScenePattern keeps the caller supplied scene inside a single,
// traversal-free path segment.
var userOssScenePattern = regexp.MustCompile(`^[a-z0-9_-]{1,32}$`)

// userOssExtPattern keeps the stored extension short and path-free.
var userOssExtPattern = regexp.MustCompile(`^\.[a-z0-9]{1,8}$`)

// UserOssUploadDir returns the directory holding attachments that are kept on
// the gateway because the caller has no personal bucket configured.
func UserOssUploadDir() (string, error) {
	return service.StudioUploadDir()
}

// GetUserOss reports whether the caller uploaded attachments to a personal
// bucket. The studio upload widgets use it to decide between the bucket and
// the gateway fallback.
func GetUserOss(c *gin.Context) {
	config, ok := studioStorageOf(c)
	if !ok {
		common.ApiSuccess(c, gin.H{"configured": false})
		return
	}
	common.ApiSuccess(c, gin.H{
		"configured":      true,
		"bucket":          config.Bucket,
		"public_base_url": config.PublicBaseURL,
	})
}

// UploadUserOss stores one studio attachment and returns the URL that must be
// sent to the model. Files go to the caller's personal bucket when it is
// configured, otherwise to the gateway's local upload directory.
func UploadUserOss(c *gin.Context) {
	scene := strings.ToLower(strings.TrimSpace(c.PostForm("scene")))
	if scene == "" {
		scene = "studio"
	}
	if !userOssScenePattern.MatchString(scene) {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}
	if fileHeader.Size <= 0 || fileHeader.Size > userOssUploadMaxBytes {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadTooLarge)
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !userOssExtPattern.MatchString(ext) {
		ext = ""
	}
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(ext)
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	file, err := fileHeader.Open()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	defer file.Close()

	url, key, storage, err := storeUserOssMedia(c, service.StudioMediaTarget{
		Scene:        scene,
		Ext:          ext,
		ContentType:  contentType,
		Size:         fileHeader.Size,
		LocalURLBase: studioLocalURLBase(c),
	}, file)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"url":          url,
		"key":          key,
		"name":         fileHeader.Filename,
		"size":         fileHeader.Size,
		"content_type": contentType,
		"storage":      storage,
	})
}

// userOssTransferRequest is the payload of POST /api/user/oss/object.
type userOssTransferRequest struct {
	URL   string `json:"url"`
	Scene string `json:"scene"`
}

// TransferUserOssObject copies media that already exists elsewhere (an
// upstream provider URL, another gateway endpoint) into the caller's storage,
// so gallery entries keep working after the upstream URL expires.
func TransferUserOssObject(c *gin.Context) {
	var request userOssTransferRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}
	scene := strings.ToLower(strings.TrimSpace(request.Scene))
	if scene == "" {
		scene = "studio_image"
	}
	if !userOssScenePattern.MatchString(scene) {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}
	source := strings.TrimSpace(request.URL)
	parsed, err := url.Parse(source)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}

	if config, ok := studioStorageOf(c); ok && strings.HasPrefix(source, objstore.PublicURL(config, "")) {
		common.ApiSuccess(c, gin.H{"url": source, "cover_url": "", "storage": "bucket"})
		return
	}
	if _, ok := service.StudioUploadLocalPath(source); ok {
		common.ApiSuccess(c, gin.H{"url": source, "cover_url": "", "storage": "local"})
		return
	}

	reader, size, contentType, ext, err := openUserOssTransferSource(c, parsed)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssTransferFailed, map[string]any{"Error": err.Error()})
		return
	}
	defer reader.Close()
	if size <= 0 || size > userOssUploadMaxBytes {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadTooLarge)
		return
	}

	url, key, storage, err := storeUserOssMedia(c, service.StudioMediaTarget{
		Scene:        scene,
		Ext:          ext,
		ContentType:  contentType,
		Size:         size,
		LocalURLBase: studioLocalURLBase(c),
	}, reader)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssTransferFailed, map[string]any{"Error": err.Error()})
		return
	}
	common.ApiSuccess(c, gin.H{
		"url":          url,
		"cover_url":    "",
		"key":          key,
		"size":         size,
		"content_type": contentType,
		"storage":      storage,
	})
}

// userOssVideoCoverRequest is the payload of POST /api/user/oss/video-cover.
type userOssVideoCoverRequest struct {
	URL string `json:"url"`
}

// userOssVideoCoverTimeout bounds one server side poster extraction.
const userOssVideoCoverTimeout = 60 * time.Second

// GenerateUserOssVideoCover renders a poster frame for a video the caller
// already stored. Browsers cannot decode every codec they play, so when the
// studio fails to capture a frame itself it asks the gateway to run ffmpeg.
// Gateways without an ffmpeg binary answer with MsgUserOssVideoCoverUnavailable
// so the studio stops retrying that artwork.
func GenerateUserOssVideoCover(c *gin.Context) {
	var request userOssVideoCoverRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}
	source := strings.TrimSpace(request.URL)
	parsed, err := url.Parse(source)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		common.ApiErrorI18n(c, i18n.MsgUserOssUploadInvalid)
		return
	}

	videoPath, cleanup, err := studioVideoCoverSource(c, parsed)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssVideoCoverFailed, map[string]any{"Error": err.Error()})
		return
	}
	defer cleanup()

	ctx, cancel := context.WithTimeout(c.Request.Context(), userOssVideoCoverTimeout)
	defer cancel()
	cover, err := service.GenerateStudioVideoCover(ctx, videoPath)
	if errors.Is(err, service.ErrStudioVideoCoverUnavailable) {
		common.ApiErrorI18n(c, i18n.MsgUserOssVideoCoverUnavailable)
		return
	}
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssVideoCoverFailed, map[string]any{"Error": err.Error()})
		return
	}

	url, _, storage, err := storeUserOssMedia(c, service.StudioMediaTarget{
		Scene:        "studio_video",
		Ext:          cover.Ext,
		ContentType:  cover.ContentType,
		Size:         int64(len(cover.Data)),
		LocalURLBase: studioLocalURLBase(c),
	}, bytes.NewReader(cover.Data))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserOssTransferFailed, map[string]any{"Error": err.Error()})
		return
	}
	common.ApiSuccess(c, gin.H{
		"url":       source,
		"cover_url": url,
		"storage":   storage,
	})
}

// studioVideoCoverSource hands ffmpeg a seekable local file: gateway
// attachments are used in place, everything else is downloaded into a temp
// file that the caller must clean up.
func studioVideoCoverSource(c *gin.Context, parsed *url.URL) (string, func(), error) {
	if localPath, ok := service.StudioUploadLocalPath(parsed.String()); ok {
		return localPath, func() {}, nil
	}

	reader, size, _, ext, err := openUserOssTransferSource(c, parsed)
	if err != nil {
		return "", nil, err
	}
	defer reader.Close()
	if size > userOssUploadMaxBytes {
		return "", nil, errors.New("video exceeds the size limit")
	}

	file, err := os.CreateTemp("", "studio-video-cover-*"+ext)
	if err != nil {
		return "", nil, err
	}
	cleanup := func() {
		os.Remove(file.Name())
	}
	written, err := io.Copy(file, io.LimitReader(reader, userOssUploadMaxBytes+1))
	if err != nil {
		file.Close()
		cleanup()
		return "", nil, err
	}
	if err := file.Close(); err != nil {
		cleanup()
		return "", nil, err
	}
	if written <= 0 || written > userOssUploadMaxBytes {
		cleanup()
		return "", nil, errors.New("video exceeds the size limit")
	}
	return file.Name(), cleanup, nil
}

// openUserOssTransferSource opens the media behind an http(s) URL. Gateway
// uploads are read from disk, everything else goes through the SSRF protected
// downloader.
func openUserOssTransferSource(c *gin.Context, parsed *url.URL) (io.ReadCloser, int64, string, string, error) {
	if localPath, ok := service.StudioUploadLocalPath(parsed.String()); ok {
		file, err := os.Open(localPath)
		if err != nil {
			return nil, 0, "", "", err
		}
		info, err := file.Stat()
		if err != nil {
			file.Close()
			return nil, 0, "", "", err
		}
		ext := strings.ToLower(filepath.Ext(localPath))
		if !userOssExtPattern.MatchString(ext) {
			ext = ""
		}
		contentType := mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		return file, info.Size(), contentType, ext, nil
	}

	resp, err := service.DoDownloadRequest(parsed.String(), "studio_transfer")
	if err != nil {
		return nil, 0, "", "", err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, 0, "", "", fmt.Errorf("download failed with HTTP status %d", resp.StatusCode)
	}
	ext := strings.ToLower(path.Ext(parsed.Path))
	if !userOssExtPattern.MatchString(ext) {
		ext = ""
	}
	contentType := strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])
	if contentType == "" {
		contentType = mime.TypeByExtension(ext)
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	return resp.Body, resp.ContentLength, contentType, ext, nil
}

// storeUserOssMedia writes the media to the caller's bucket or to the gateway
// upload directory and reports which one was used.
func storeUserOssMedia(c *gin.Context, target service.StudioMediaTarget, data io.Reader) (string, string, string, error) {
	config, ok := studioStorageOf(c)
	if ok {
		target.Config = &config
	}
	url, key, err := service.StoreStudioMedia(c.Request.Context(), target, data)
	if err != nil {
		return "", "", "", err
	}
	storage := "local"
	if ok {
		storage = "bucket"
	}
	return url, key, storage, nil
}

// studioLocalURLBase is the origin used for gateway stored media.
func studioLocalURLBase(c *gin.Context) string {
	if base := strings.TrimSuffix(system_setting.ServerAddress, "/"); base != "" {
		return base
	}
	scheme := "http"
	if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}

// DownloadUserOssFile serves attachments kept on the gateway. The route is
// public because models must fetch these URLs, and the random object name is
// the capability, exactly like studio share media.
func DownloadUserOssFile(c *gin.Context) {
	key := strings.TrimPrefix(c.Param("key"), "/")
	if !service.IsStudioUploadKey(key) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "File not found"})
		return
	}
	dir, err := UserOssUploadDir()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	fullPath := filepath.Join(dir, filepath.FromSlash(key))
	if _, err := os.Stat(fullPath); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "File not found"})
		return
	}
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "public, max-age=86400")
	c.File(fullPath)
}
