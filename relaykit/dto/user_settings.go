package dto

type UserSetting struct {
	NotifyType                       string             `json:"notify_type,omitempty"`                          // QuotaWarningType 额度预警类型
	QuotaWarningThreshold            float64            `json:"quota_warning_threshold,omitempty"`              // QuotaWarningThreshold 额度预警阈值
	WebhookUrl                       string             `json:"webhook_url,omitempty"`                          // WebhookUrl webhook地址
	WebhookSecret                    string             `json:"webhook_secret,omitempty"`                       // WebhookSecret webhook密钥
	NotificationEmail                string             `json:"notification_email,omitempty"`                   // NotificationEmail 通知邮箱地址
	BarkUrl                          string             `json:"bark_url,omitempty"`                             // BarkUrl Bark推送URL
	GotifyUrl                        string             `json:"gotify_url,omitempty"`                           // GotifyUrl Gotify服务器地址
	GotifyToken                      string             `json:"gotify_token,omitempty"`                         // GotifyToken Gotify应用令牌
	GotifyPriority                   int                `json:"gotify_priority"`                                // GotifyPriority Gotify消息优先级
	UpstreamModelUpdateNotifyEnabled bool               `json:"upstream_model_update_notify_enabled,omitempty"` // 是否接收上游模型更新定时检测通知（仅管理员）
	AcceptUnsetRatioModel            bool               `json:"accept_unset_model_ratio_model,omitempty"`       // AcceptUnsetRatioModel 是否接受未设置价格的模型
	RecordIpLog                      bool               `json:"record_ip_log,omitempty"`                        // 是否记录请求和错误日志IP
	SidebarModules                   string             `json:"sidebar_modules,omitempty"`                      // SidebarModules 左侧边栏模块配置
	BillingPreference                string             `json:"billing_preference,omitempty"`                   // BillingPreference 扣费策略（订阅/钱包）
	Language                         string             `json:"language,omitempty"`                             // Language 用户语言偏好 (zh, en)
	WecomUrl                         string             `json:"wecom_url,omitempty"`                            // WecomUrl 企业微信机器人地址
	DingtalkUrl                      string             `json:"dingtalk_url,omitempty"`                         // DingtalkUrl 钉钉机器人地址
	FeishuUrl                        string             `json:"feishu_url,omitempty"`                           // FeishuUrl 飞书机器人地址
	TelegramBotToken                 string             `json:"telegram_bot_token,omitempty"`                   // TelegramBotToken Telegram 机器人令牌
	TelegramChatId                   string             `json:"telegram_chat_id,omitempty"`                     // TelegramChatId Telegram 会话 ID
	SubscribeQuotaInsufficient       *bool              `json:"subscribe_quota_insufficient,omitempty"`         // 账户额度不足通知
	SubscribeDiscount                *bool              `json:"subscribe_discount,omitempty"`                   // 打折活动通知
	SubscribeKeepalive               *bool              `json:"subscribe_keepalive,omitempty"`                  // 防失联-定期通知
	SubscribeSystemNotice            *bool              `json:"subscribe_system_notice,omitempty"`              // 系统公告通知
	SubscribeModelPriceChange        *bool              `json:"subscribe_model_price_change,omitempty"`         // 模型调价通知
	UserStorage                      *UserStorageConfig `json:"user_storage,omitempty"`                         // UserStorage 用户个人 S3 存储桶配置
}

// UserStorageConfig is a user's personal S3-compatible bucket configuration.
// Secrets are stored with the rest of the user settings and are never
// returned to the client.
type UserStorageConfig struct {
	Endpoint      string `json:"endpoint,omitempty"`
	Bucket        string `json:"bucket,omitempty"`
	Region        string `json:"region,omitempty"`
	AccessKeyID   string `json:"access_key_id,omitempty"`
	SecretKey     string `json:"secret_key,omitempty"`
	PublicBaseURL string `json:"public_base_url,omitempty"`
}

var (
	NotifyTypeEmail    = "email"    // Email 邮件
	NotifyTypeWebhook  = "webhook"  // Webhook
	NotifyTypeBark     = "bark"     // Bark 推送
	NotifyTypeGotify   = "gotify"   // Gotify 推送
	NotifyTypeWecom    = "wecom"    // Wecom 企业微信机器人
	NotifyTypeDingtalk = "dingtalk" // Dingtalk 钉钉机器人
	NotifyTypeFeishu   = "feishu"   // Feishu 飞书机器人
	NotifyTypeTelegram = "telegram" // Telegram 机器人
)

// NotifyTypes lists every supported notification channel.
var NotifyTypes = []string{
	NotifyTypeEmail,
	NotifyTypeWebhook,
	NotifyTypeBark,
	NotifyTypeGotify,
	NotifyTypeWecom,
	NotifyTypeDingtalk,
	NotifyTypeFeishu,
	NotifyTypeTelegram,
}

// IsNotifyType reports whether the given channel is supported.
func IsNotifyType(t string) bool {
	for _, item := range NotifyTypes {
		if item == t {
			return true
		}
	}
	return false
}

// BoolDefault resolves an optional boolean preference with a fallback.
func BoolDefault(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}
