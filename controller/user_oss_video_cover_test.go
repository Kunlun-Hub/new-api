package controller

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const studioCoverTestVideoKey = "studio_video/1790839083498_485c89c4.mp4"

// setupStudioCoverTest wires a SQLite user plus an isolated gateway upload
// directory and returns the caller id.
func setupStudioCoverTest(t *testing.T) int {
	t.Helper()
	require.NoError(t, i18n.Init())
	previousDB := model.DB
	db, _ := newAuditTestDatabase(t, "sqlite", "")
	model.DB = db
	require.NoError(t, db.AutoMigrate(&model.User{}))
	uploadDir := t.TempDir()
	t.Setenv("STUDIO_UPLOAD_DIR", uploadDir)
	t.Cleanup(func() {
		model.DB = previousDB
	})

	user := model.User{
		Username: "studio-cover-user",
		Password: "password",
		Role:     common.RoleCommonUser,
		Status:   common.UserStatusEnabled,
		Group:    "default",
	}
	require.NoError(t, db.Create(&user).Error)

	dir, err := service.StudioUploadDir()
	require.NoError(t, err)
	fullPath := filepath.Join(dir, filepath.FromSlash(studioCoverTestVideoKey))
	require.NoError(t, os.MkdirAll(filepath.Dir(fullPath), 0o755))
	require.NoError(t, os.WriteFile(fullPath, []byte("video-bytes"), 0o644))
	return user.Id
}

// writeStudioCoverStub installs a fake ffmpeg that writes a fixed frame to the
// output argument handed to it.
func writeStudioCoverStub(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "ffmpeg")
	script := "#!/bin/sh\nfor last in \"$@\"; do :; done\nhead -c 2048 /dev/zero | tr '\\0' 'x' > \"$last\"\n"
	require.NoError(t, os.WriteFile(path, []byte(script), 0o755))
	return path
}

func performStudioCoverRequest(t *testing.T, userID int, body string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/oss/video-cover", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Request.Header.Set("Accept-Language", "en-US")
	c.Set("id", userID)
	GenerateUserOssVideoCover(c)
	return recorder
}

func TestGenerateUserOssVideoCoverStoresRenderedFrame(t *testing.T) {
	userID := setupStudioCoverTest(t)
	t.Setenv("STUDIO_FFMPEG_PATH", writeStudioCoverStub(t))

	recorder := performStudioCoverRequest(t, userID, `{"url":"http://example.com/api/studio/oss/file/`+studioCoverTestVideoKey+`"}`)
	require.Equal(t, http.StatusOK, recorder.Code)
	body := recorder.Body.String()
	assert.Contains(t, body, `"success":true`)
	assert.Contains(t, body, "/api/studio/oss/file/studio_video/")
	assert.Regexp(t, `"cover_url":"[^"]+/api/studio/oss/file/studio_video/[^"]+\.webp"`, body)

	dir, err := service.StudioUploadDir()
	require.NoError(t, err)
	entries, err := os.ReadDir(filepath.Join(dir, "studio_video"))
	require.NoError(t, err)
	var coverPath string
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".webp") {
			coverPath = filepath.Join(dir, "studio_video", entry.Name())
		}
	}
	require.NotEmpty(t, coverPath, "the rendered frame must be stored next to the video")
	data, err := os.ReadFile(coverPath)
	require.NoError(t, err)
	assert.Len(t, data, 2048)
}

func TestGenerateUserOssVideoCoverReportsMissingFFmpeg(t *testing.T) {
	userID := setupStudioCoverTest(t)
	t.Setenv("STUDIO_FFMPEG_PATH", filepath.Join(t.TempDir(), "missing-ffmpeg"))

	recorder := performStudioCoverRequest(t, userID, `{"url":"http://example.com/api/studio/oss/file/`+studioCoverTestVideoKey+`"}`)
	require.Equal(t, http.StatusOK, recorder.Code)
	body := recorder.Body.String()
	assert.Contains(t, body, `"success":false`)
	assert.Contains(t, body, "ffmpeg is not installed")
}

func TestGenerateUserOssVideoCoverRejectsInvalidSource(t *testing.T) {
	userID := setupStudioCoverTest(t)

	recorder := performStudioCoverRequest(t, userID, `{"url":"file:///etc/passwd"}`)
	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"success":false`)
}
