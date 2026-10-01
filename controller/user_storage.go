package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/service/objstore"

	"github.com/gin-gonic/gin"
)

// userStorageRequest is the payload of the "verify and save" action. An empty
// secret key keeps the secret that is already stored.
type userStorageRequest struct {
	Endpoint      string `json:"endpoint"`
	Bucket        string `json:"bucket"`
	Region        string `json:"region"`
	AccessKeyID   string `json:"access_key_id"`
	SecretKey     string `json:"secret_key"`
	PublicBaseURL string `json:"public_base_url"`
}

// userStorageResponse deliberately omits the secret access key.
type userStorageResponse struct {
	Configured    bool   `json:"configured"`
	Endpoint      string `json:"endpoint"`
	Bucket        string `json:"bucket"`
	Region        string `json:"region"`
	AccessKeyID   string `json:"access_key_id"`
	PublicBaseURL string `json:"public_base_url"`
}

func buildUserStorageResponse(config *dto.UserStorageConfig) userStorageResponse {
	if config == nil {
		return userStorageResponse{}
	}
	return userStorageResponse{
		Configured:    true,
		Endpoint:      config.Endpoint,
		Bucket:        config.Bucket,
		Region:        config.Region,
		AccessKeyID:   config.AccessKeyID,
		PublicBaseURL: config.PublicBaseURL,
	}
}

// GetUserStorage returns the caller's personal bucket settings without secrets.
func GetUserStorage(c *gin.Context) {
	user, err := model.GetUserById(c.GetInt("id"), true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	settings := user.GetSetting()
	common.ApiSuccessI18n(c, i18n.MsgOperationSuccess, buildUserStorageResponse(settings.UserStorage))
}

// UpdateUserStorage verifies the bucket with a test write and saves it only
// after the round trip succeeded.
func UpdateUserStorage(c *gin.Context) {
	var req userStorageRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	user, err := model.GetUserById(c.GetInt("id"), true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	settings := user.GetSetting()

	secretKey := req.SecretKey
	if secretKey == "" {
		// The client never receives the stored secret, so an empty field means
		// "keep the existing credential".
		stored := objstore.FromDTO(settings.UserStorage)
		if stored.Endpoint == req.Endpoint && stored.Bucket == req.Bucket && stored.AccessKeyID == req.AccessKeyID {
			secretKey = stored.SecretKey
		}
	}

	config := objstore.Config{
		Endpoint:      req.Endpoint,
		Bucket:        req.Bucket,
		Region:        req.Region,
		AccessKeyID:   req.AccessKeyID,
		SecretKey:     secretKey,
		PublicBaseURL: req.PublicBaseURL,
	}
	if err := config.Validate(); err != nil {
		common.ApiErrorI18n(c, i18n.MsgSettingStorageInvalid, map[string]any{"Error": err.Error()})
		return
	}
	if err := objstore.Verify(c.Request.Context(), config); err != nil {
		common.ApiErrorI18n(c, i18n.MsgSettingStorageVerifyFailed, map[string]any{"Error": err.Error()})
		return
	}

	settings.UserStorage = &dto.UserStorageConfig{
		Endpoint:      config.Endpoint,
		Bucket:        config.Bucket,
		Region:        config.Region,
		AccessKeyID:   config.AccessKeyID,
		SecretKey:     config.SecretKey,
		PublicBaseURL: config.PublicBaseURL,
	}
	if err := model.UpdateUserSetting(user.Id, settings); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccessI18n(c, i18n.MsgSettingStorageSaved, buildUserStorageResponse(settings.UserStorage))
}

// DeleteUserStorage removes the caller's personal bucket configuration.
func DeleteUserStorage(c *gin.Context) {
	user, err := model.GetUserById(c.GetInt("id"), true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	settings := user.GetSetting()
	settings.UserStorage = nil
	if err := model.UpdateUserSetting(user.Id, settings); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccessI18n(c, i18n.MsgSettingStorageRemoved, nil)
}
