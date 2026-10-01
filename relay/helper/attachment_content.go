package helper

import (
	"strings"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// MaterializeLocalAttachments inlines attachments that the gateway stores on
// its own disk into data URLs. Upstreams cannot fetch a URL that only resolves
// on the gateway itself, so those parts must travel inside the request body.
func MaterializeLocalAttachments(c *gin.Context, request *dto.GeneralOpenAIRequest) error {
	if request == nil {
		return nil
	}

	for i := range request.Messages {
		message := &request.Messages[i]
		content := message.ParseContent()
		rewritten := false
		for j := range content {
			if file := content[j].GetFile(); file != nil {
				fileUrl := file.FileUrl
				if fileUrl == "" && strings.HasPrefix(file.FileData, "http") {
					fileUrl = file.FileData
				}
				if fileUrl == "" {
					continue
				}
				if _, ok := service.StudioUploadLocalPath(fileUrl); !ok {
					continue
				}
				dataURL, err := attachmentDataURL(c, types.NewURLFileSource(fileUrl))
				if err != nil {
					return err
				}
				file.FileData = dataURL
				file.FileUrl = ""
				content[j].File = file
				rewritten = true
				continue
			}

			image := content[j].GetImageMedia()
			if image == nil || image.Url == "" {
				continue
			}
			if _, ok := service.StudioUploadLocalPath(image.Url); !ok {
				continue
			}
			dataURL, err := attachmentDataURL(c, types.NewURLFileSource(image.Url))
			if err != nil {
				return err
			}
			image.Url = dataURL
			content[j].ImageUrl = image
			rewritten = true
		}
		if rewritten {
			message.SetMediaContent(content)
		}
	}
	return nil
}

// InlineFileURLContent rewrites URL based `file` parts into inline base64
// `file_data`. OpenAI compatible upstreams have no way to fetch a file URL, so
// the content must be sent with the request.
func InlineFileURLContent(c *gin.Context, request *dto.GeneralOpenAIRequest) error {
	if request == nil {
		return nil
	}

	for i := range request.Messages {
		message := &request.Messages[i]
		content := message.ParseContent()
		rewritten := false
		for j := range content {
			file := content[j].GetFile()
			if file == nil || file.FileData != "" || file.FileUrl == "" {
				continue
			}
			dataURL, err := attachmentDataURL(c, content[j].ToFileSource())
			if err != nil {
				return err
			}
			file.FileData = dataURL
			content[j].File = file
			rewritten = true
		}
		if rewritten {
			message.SetMediaContent(content)
		}
	}
	return nil
}

// attachmentDataURL resolves a file source into a base64 data URL.
func attachmentDataURL(c *gin.Context, source types.FileSource) (string, error) {
	cachedData, err := service.LoadFileSource(c, source, "file_attachment")
	if err != nil {
		return "", err
	}
	base64Data, err := cachedData.GetBase64Data()
	if err != nil {
		return "", err
	}
	mimeType := cachedData.MimeType
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	return "data:" + mimeType + ";base64," + base64Data, nil
}
