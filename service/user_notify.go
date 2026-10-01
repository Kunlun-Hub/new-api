package service

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func NotifyRootUser(t string, subject string, content string) {
	user := model.GetRootUser().ToBaseUser()
	err := NotifyUser(user.Id, user.Email, user.GetSetting(), dto.NewNotify(t, subject, content, nil))
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to notify root user: %s", err.Error()))
	}
}

func NotifyUpstreamModelUpdateWatchers(subject string, content string) {
	var users []model.User
	if err := model.DB.
		Select("id", "email", "role", "status", "setting").
		Where("status = ? AND role >= ?", common.UserStatusEnabled, common.RoleAdminUser).
		Find(&users).Error; err != nil {
		common.SysLog(fmt.Sprintf("failed to query upstream update notification users: %s", err.Error()))
		return
	}

	notification := dto.NewNotify(dto.NotifyTypeChannelUpdate, subject, content, nil)
	sentCount := 0
	for _, user := range users {
		userSetting := user.GetSetting()
		if !userSetting.UpstreamModelUpdateNotifyEnabled {
			continue
		}
		if err := NotifyUser(user.Id, user.Email, userSetting, notification); err != nil {
			common.SysLog(fmt.Sprintf("failed to notify user %d for upstream model update: %s", user.Id, err.Error()))
			continue
		}
		sentCount++
	}
	common.SysLog(fmt.Sprintf("upstream model update notifications sent: %d", sentCount))
}

func NotifyUser(userId int, userEmail string, userSetting dto.UserSetting, data dto.Notify) error {
	notifyType := userSetting.NotifyType
	if notifyType == "" {
		notifyType = dto.NotifyTypeEmail
	}

	// Check notification limit
	canSend, err := CheckNotificationLimit(userId, data.Type)
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to check notification limit: %s", err.Error()))
		return err
	}
	if !canSend {
		return fmt.Errorf("notification limit exceeded for user %d with type %s", userId, notifyType)
	}

	if !isNotifySubscribed(userSetting, data.Type) {
		common.SysLog(fmt.Sprintf("user %d has disabled %s notifications, skip", userId, data.Type))
		return nil
	}

	switch notifyType {
	case dto.NotifyTypeEmail:
		// 优先使用设置中的通知邮箱，如果为空则使用用户的默认邮箱
		emailToUse := userSetting.NotificationEmail
		if emailToUse == "" {
			emailToUse = userEmail
		}
		if emailToUse == "" {
			common.SysLog(fmt.Sprintf("user %d has no email, skip sending email", userId))
			return nil
		}
		return sendEmailNotify(emailToUse, data)
	case dto.NotifyTypeWebhook:
		webhookURLStr := userSetting.WebhookUrl
		if webhookURLStr == "" {
			common.SysLog(fmt.Sprintf("user %d has no webhook url, skip sending webhook", userId))
			return nil
		}

		// 获取 webhook secret
		webhookSecret := userSetting.WebhookSecret
		return SendWebhookNotify(webhookURLStr, webhookSecret, data)
	case dto.NotifyTypeBark:
		barkURL := userSetting.BarkUrl
		if barkURL == "" {
			common.SysLog(fmt.Sprintf("user %d has no bark url, skip sending bark", userId))
			return nil
		}
		return sendBarkNotify(barkURL, data)
	case dto.NotifyTypeGotify:
		gotifyUrl := userSetting.GotifyUrl
		gotifyToken := userSetting.GotifyToken
		if gotifyUrl == "" || gotifyToken == "" {
			common.SysLog(fmt.Sprintf("user %d has no gotify url or token, skip sending gotify", userId))
			return nil
		}
		return sendGotifyNotify(gotifyUrl, gotifyToken, userSetting.GotifyPriority, data)
	case dto.NotifyTypeWecom:
		if userSetting.WecomUrl == "" {
			common.SysLog(fmt.Sprintf("user %d has no wecom url, skip sending wecom notification", userId))
			return nil
		}
		return sendWecomNotify(userSetting.WecomUrl, data)
	case dto.NotifyTypeDingtalk:
		if userSetting.DingtalkUrl == "" {
			common.SysLog(fmt.Sprintf("user %d has no dingtalk url, skip sending dingtalk notification", userId))
			return nil
		}
		return sendDingtalkNotify(userSetting.DingtalkUrl, data)
	case dto.NotifyTypeFeishu:
		if userSetting.FeishuUrl == "" {
			common.SysLog(fmt.Sprintf("user %d has no feishu url, skip sending feishu notification", userId))
			return nil
		}
		return sendFeishuNotify(userSetting.FeishuUrl, data)
	case dto.NotifyTypeTelegram:
		if userSetting.TelegramBotToken == "" || userSetting.TelegramChatId == "" {
			common.SysLog(fmt.Sprintf("user %d has no telegram token or chat id, skip sending telegram notification", userId))
			return nil
		}
		return sendTelegramNotify(userSetting.TelegramBotToken, userSetting.TelegramChatId, data)
	}
	return nil
}

// isNotifySubscribed reports whether the user still subscribes to the given event.
// Events without an explicit preference keep the previous behaviour (enabled).
func isNotifySubscribed(userSetting dto.UserSetting, notifyType string) bool {
	switch notifyType {
	case dto.NotifyTypeQuotaExceed:
		return dto.BoolDefault(userSetting.SubscribeQuotaInsufficient, true)
	case dto.NotifyTypeChannelUpdate:
		return dto.BoolDefault(userSetting.SubscribeModelPriceChange, true)
	}
	return true
}

// SendTestNotification delivers a test message through the configured channel.
func SendTestNotification(userSetting dto.UserSetting, userEmail string, data dto.Notify) error {
	notifyType := userSetting.NotifyType
	if notifyType == "" {
		notifyType = dto.NotifyTypeEmail
	}

	switch notifyType {
	case dto.NotifyTypeEmail:
		emailToUse := userSetting.NotificationEmail
		if emailToUse == "" {
			emailToUse = userEmail
		}
		if emailToUse == "" {
			return fmt.Errorf("no email address configured for notification")
		}
		return sendEmailNotify(emailToUse, data)
	case dto.NotifyTypeWebhook:
		if userSetting.WebhookUrl == "" {
			return fmt.Errorf("webhook url is empty")
		}
		return SendWebhookNotify(userSetting.WebhookUrl, userSetting.WebhookSecret, data)
	case dto.NotifyTypeBark:
		if userSetting.BarkUrl == "" {
			return fmt.Errorf("bark url is empty")
		}
		return sendBarkNotify(userSetting.BarkUrl, data)
	case dto.NotifyTypeGotify:
		if userSetting.GotifyUrl == "" || userSetting.GotifyToken == "" {
			return fmt.Errorf("gotify url or token is empty")
		}
		return sendGotifyNotify(userSetting.GotifyUrl, userSetting.GotifyToken, userSetting.GotifyPriority, data)
	case dto.NotifyTypeWecom:
		if userSetting.WecomUrl == "" {
			return fmt.Errorf("wecom url is empty")
		}
		return sendWecomNotify(userSetting.WecomUrl, data)
	case dto.NotifyTypeDingtalk:
		if userSetting.DingtalkUrl == "" {
			return fmt.Errorf("dingtalk url is empty")
		}
		return sendDingtalkNotify(userSetting.DingtalkUrl, data)
	case dto.NotifyTypeFeishu:
		if userSetting.FeishuUrl == "" {
			return fmt.Errorf("feishu url is empty")
		}
		return sendFeishuNotify(userSetting.FeishuUrl, data)
	case dto.NotifyTypeTelegram:
		if userSetting.TelegramBotToken == "" || userSetting.TelegramChatId == "" {
			return fmt.Errorf("telegram token or chat id is empty")
		}
		return sendTelegramNotify(userSetting.TelegramBotToken, userSetting.TelegramChatId, data)
	}
	return fmt.Errorf("unsupported notification type: %s", notifyType)
}

// resolveNotifyContent renders the notification template values.
func resolveNotifyContent(data dto.Notify) string {
	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}
	return content
}

// postNotifyJSON sends a JSON payload to a notification endpoint with SSRF protection.
func postNotifyJSON(targetURL string, payload []byte, userAgent string) error {
	var resp *http.Response
	var err error

	if system_setting.EnableWorker() {
		workerReq := &WorkerRequest{
			URL:    targetURL,
			Key:    system_setting.WorkerValidKey,
			Method: http.MethodPost,
			Headers: map[string]string{
				"Content-Type": "application/json; charset=utf-8",
				"User-Agent":   userAgent,
			},
			Body: payload,
		}
		resp, err = DoWorkerRequest(workerReq)
		if err != nil {
			return fmt.Errorf("failed to send notification request through worker: %v", err)
		}
	} else {
		if err := ValidateSSRFProtectedFetchURL(targetURL); err != nil {
			return fmt.Errorf("request reject: %v", err)
		}

		req, err := http.NewRequest(http.MethodPost, targetURL, bytes.NewBuffer(payload))
		if err != nil {
			return fmt.Errorf("failed to create notification request: %v", err)
		}
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		req.Header.Set("User-Agent", userAgent)

		resp, err = GetSSRFProtectedHTTPClient().Do(req)
		if err != nil {
			return fmt.Errorf("failed to send notification request: %v", err)
		}
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 32*1024))
	if err != nil {
		return fmt.Errorf("failed to read notification response: %v", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("notification request failed with status code: %d", resp.StatusCode)
	}
	return checkNotifyResponseBody(body)
}

// checkNotifyResponseBody surfaces provider level failures that are returned with HTTP 200.
func checkNotifyResponseBody(body []byte) error {
	if len(body) == 0 {
		return nil
	}

	var parsed struct {
		Ok          *bool  `json:"ok"`
		ErrCode     *int   `json:"errcode"`
		Code        *int   `json:"code"`
		StatusCode  *int   `json:"StatusCode"`
		Msg         string `json:"msg"`
		Message     string `json:"message"`
		ErrMsg      string `json:"errmsg"`
		StatusMsg   string `json:"status_msg"`
		Description string `json:"description"`
	}
	if err := common.Unmarshal(body, &parsed); err != nil {
		return nil
	}

	reason := func(fallback string) string {
		return firstNonEmptyString(parsed.ErrMsg, parsed.Msg, parsed.Message, parsed.StatusMsg, parsed.Description, fallback)
	}

	if parsed.Ok != nil && !*parsed.Ok {
		return fmt.Errorf("notification provider rejected the message: %s", reason("ok=false"))
	}
	if parsed.ErrCode != nil && *parsed.ErrCode != 0 {
		return fmt.Errorf("notification provider rejected the message: code %d %s", *parsed.ErrCode, reason(""))
	}
	if parsed.Code != nil && *parsed.Code != 0 {
		return fmt.Errorf("notification provider rejected the message: code %d %s", *parsed.Code, reason(""))
	}
	if parsed.StatusCode != nil && *parsed.StatusCode != 0 {
		return fmt.Errorf("notification provider rejected the message: code %d %s", *parsed.StatusCode, reason(""))
	}
	return nil
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func sendWecomNotify(wecomUrl string, data dto.Notify) error {
	content := resolveNotifyContent(data)
	payload, err := common.Marshal(map[string]any{
		"msgtype": "markdown",
		"markdown": map[string]any{
			"content": fmt.Sprintf("**%s**\n%s", data.Title, content),
		},
	})
	if err != nil {
		return fmt.Errorf("failed to marshal wecom payload: %v", err)
	}
	return postNotifyJSON(wecomUrl, payload, "NewAPI-Wecom-Notify/1.0")
}

func sendDingtalkNotify(dingtalkUrl string, data dto.Notify) error {
	content := resolveNotifyContent(data)
	payload, err := common.Marshal(map[string]any{
		"msgtype": "markdown",
		"markdown": map[string]any{
			"title": data.Title,
			"text":  fmt.Sprintf("### %s\n\n%s", data.Title, content),
		},
	})
	if err != nil {
		return fmt.Errorf("failed to marshal dingtalk payload: %v", err)
	}
	return postNotifyJSON(dingtalkUrl, payload, "NewAPI-Dingtalk-Notify/1.0")
}

func sendFeishuNotify(feishuUrl string, data dto.Notify) error {
	content := resolveNotifyContent(data)
	payload, err := common.Marshal(map[string]any{
		"msg_type": "text",
		"content": map[string]any{
			"text": fmt.Sprintf("%s\n%s", data.Title, content),
		},
	})
	if err != nil {
		return fmt.Errorf("failed to marshal feishu payload: %v", err)
	}
	return postNotifyJSON(feishuUrl, payload, "NewAPI-Feishu-Notify/1.0")
}

func sendTelegramNotify(botToken string, chatId string, data dto.Notify) error {
	content := resolveNotifyContent(data)
	payload, err := common.Marshal(map[string]any{
		"chat_id": chatId,
		"text":    fmt.Sprintf("%s\n%s", data.Title, content),
	})
	if err != nil {
		return fmt.Errorf("failed to marshal telegram payload: %v", err)
	}
	targetURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	return postNotifyJSON(targetURL, payload, "NewAPI-Telegram-Notify/1.0")
}

func sendEmailNotify(userEmail string, data dto.Notify) error {
	// make email content
	content := data.Content
	// 处理占位符
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}
	return common.SendEmail(data.Title, userEmail, content)
}

func sendBarkNotify(barkURL string, data dto.Notify) error {
	// 处理占位符
	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}

	// 替换模板变量
	finalURL := strings.ReplaceAll(barkURL, "{{title}}", url.QueryEscape(data.Title))
	finalURL = strings.ReplaceAll(finalURL, "{{content}}", url.QueryEscape(content))

	// 发送GET请求到Bark
	var req *http.Request
	var resp *http.Response
	var err error

	if system_setting.EnableWorker() {
		// 使用worker发送请求
		workerReq := &WorkerRequest{
			URL:    finalURL,
			Key:    system_setting.WorkerValidKey,
			Method: http.MethodGet,
			Headers: map[string]string{
				"User-Agent": "OneAPI-Bark-Notify/1.0",
			},
		}

		resp, err = DoWorkerRequest(workerReq)
		if err != nil {
			return fmt.Errorf("failed to send bark request through worker: %v", err)
		}
		defer resp.Body.Close()

		// 检查响应状态
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("bark request failed with status code: %d", resp.StatusCode)
		}
	} else {
		// SSRF防护：验证Bark URL（非Worker模式）
		if err := ValidateSSRFProtectedFetchURL(finalURL); err != nil {
			return fmt.Errorf("request reject: %v", err)
		}

		// 直接发送请求
		req, err = http.NewRequest(http.MethodGet, finalURL, nil)
		if err != nil {
			return fmt.Errorf("failed to create bark request: %v", err)
		}

		// 设置User-Agent
		req.Header.Set("User-Agent", "OneAPI-Bark-Notify/1.0")

		// 发送请求
		client := GetSSRFProtectedHTTPClient()
		resp, err = client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to send bark request: %v", err)
		}
		defer resp.Body.Close()

		// 检查响应状态
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("bark request failed with status code: %d", resp.StatusCode)
		}
	}

	return nil
}

func sendGotifyNotify(gotifyUrl string, gotifyToken string, priority int, data dto.Notify) error {
	// 处理占位符
	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}

	// 构建完整的 Gotify API URL
	// 确保 URL 以 /message 结尾
	finalURL := strings.TrimSuffix(gotifyUrl, "/") + "/message?token=" + url.QueryEscape(gotifyToken)

	// Gotify优先级范围0-10，如果超出范围则使用默认值5
	if priority < 0 || priority > 10 {
		priority = 5
	}

	// 构建 JSON payload
	type GotifyMessage struct {
		Title    string `json:"title"`
		Message  string `json:"message"`
		Priority int    `json:"priority"`
	}

	payload := GotifyMessage{
		Title:    data.Title,
		Message:  content,
		Priority: priority,
	}

	// 序列化为 JSON
	payloadBytes, err := common.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal gotify payload: %v", err)
	}

	var req *http.Request
	var resp *http.Response

	if system_setting.EnableWorker() {
		// 使用worker发送请求
		workerReq := &WorkerRequest{
			URL:    finalURL,
			Key:    system_setting.WorkerValidKey,
			Method: http.MethodPost,
			Headers: map[string]string{
				"Content-Type": "application/json; charset=utf-8",
				"User-Agent":   "OneAPI-Gotify-Notify/1.0",
			},
			Body: payloadBytes,
		}

		resp, err = DoWorkerRequest(workerReq)
		if err != nil {
			return fmt.Errorf("failed to send gotify request through worker: %v", err)
		}
		defer resp.Body.Close()

		// 检查响应状态
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("gotify request failed with status code: %d", resp.StatusCode)
		}
	} else {
		// SSRF防护：验证Gotify URL（非Worker模式）
		if err := ValidateSSRFProtectedFetchURL(finalURL); err != nil {
			return fmt.Errorf("request reject: %v", err)
		}

		// 直接发送请求
		req, err = http.NewRequest(http.MethodPost, finalURL, bytes.NewBuffer(payloadBytes))
		if err != nil {
			return fmt.Errorf("failed to create gotify request: %v", err)
		}

		// 设置请求头
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		req.Header.Set("User-Agent", "NewAPI-Gotify-Notify/1.0")

		// 发送请求
		client := GetSSRFProtectedHTTPClient()
		resp, err = client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to send gotify request: %v", err)
		}
		defer resp.Body.Close()

		// 检查响应状态
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("gotify request failed with status code: %d", resp.StatusCode)
		}
	}

	return nil
}
