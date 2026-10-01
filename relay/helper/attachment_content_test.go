package helper

import (
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/gin-gonic/gin"
)

func TestMaterializeLocalAttachmentsInlinesGatewayUploads(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousMaxDownloadMB := constant.MaxFileDownloadMB
	constant.MaxFileDownloadMB = 64
	t.Cleanup(func() { constant.MaxFileDownloadMB = previousMaxDownloadMB })
	root := t.TempDir()
	t.Setenv("STUDIO_UPLOAD_DIR", root)

	textKey := "studio_chat/1790830736824_786ab12c.txt"
	imageKey := "studio_chat/1790830736825_786ab12d.png"
	require.NoError(t, os.MkdirAll(filepath.Join(root, "studio_chat"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, textKey), []byte("hello attachment"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, imageKey), []byte("fake png bytes"), 0o644))

	textURL := "http://gateway.local:3000/api/studio/oss/file/" + textKey
	imageURL := "http://gateway.local:3000/api/studio/oss/file/" + imageKey
	remoteURL := "https://files.example.com/report.pdf"

	request := &dto.GeneralOpenAIRequest{
		Messages: []dto.Message{
			{
				Role: "user",
				Content: []any{
					map[string]any{"type": "text", "text": "read this"},
					map[string]any{"type": "file", "file": map[string]any{"filename": "a.txt", "file_data": textURL}},
					map[string]any{"type": "image_url", "image_url": map[string]any{"url": imageURL}},
					map[string]any{"type": "file", "file": map[string]any{"filename": "remote.pdf", "file_url": remoteURL}},
				},
			},
		},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	require.NoError(t, MaterializeLocalAttachments(c, request))

	content := request.Messages[0].ParseContent()
	require.Len(t, content, 4)

	localFile := content[1].GetFile()
	require.NotNil(t, localFile)
	assert.Equal(t, "data:text/plain;base64,"+attachmentBase64, localFile.FileData)
	assert.Empty(t, localFile.FileUrl)

	localImage := content[2].GetImageMedia()
	require.NotNil(t, localImage)
	assert.True(t, strings.HasPrefix(localImage.Url, "data:image/png;base64,"), localImage.Url)

	remoteFile := content[3].GetFile()
	require.NotNil(t, remoteFile)
	assert.Equal(t, remoteURL, remoteFile.FileUrl)
	assert.Empty(t, remoteFile.FileData)
}

func TestInlineFileURLContentInlinesLocalFileURL(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousMaxDownloadMB := constant.MaxFileDownloadMB
	constant.MaxFileDownloadMB = 64
	t.Cleanup(func() { constant.MaxFileDownloadMB = previousMaxDownloadMB })
	root := t.TempDir()
	t.Setenv("STUDIO_UPLOAD_DIR", root)

	key := "studio_chat/1790830736826_786ab12e.txt"
	require.NoError(t, os.MkdirAll(filepath.Join(root, "studio_chat"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, key), []byte("hello attachment"), 0o644))

	request := &dto.GeneralOpenAIRequest{
		Messages: []dto.Message{
			{
				Role: "user",
				Content: []any{
					map[string]any{
						"type": "file",
						"file": map[string]any{
							"filename": "a.txt",
							"file_url": fmt.Sprintf("http://gateway.local:3000/api/studio/oss/file/%s", key),
						},
					},
				},
			},
		},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	require.NoError(t, InlineFileURLContent(c, request))

	file := request.Messages[0].ParseContent()[0].GetFile()
	require.NotNil(t, file)
	assert.Equal(t, "data:text/plain;base64,"+attachmentBase64, file.FileData)
}

const attachmentBase64 = "aGVsbG8gYXR0YWNobWVudA=="
