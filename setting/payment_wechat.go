package setting

// 微信支付官方渠道（API v3 Native 扫码支付）配置。
// WechatEnabled 为显式总开关；开启后还需商户号、AppID、商户私钥、
// 证书序列号与 APIv3 密钥齐全才会对用户展示。
// WechatPrivateKey 为 apiclient_key.pem 内容，支持带/不带 PEM 头。
var (
	WechatEnabled             = false
	WechatMchId               = ""
	WechatAppId               = ""
	WechatPrivateKey          = ""
	WechatCertSerial          = ""
	WechatApiV3Key            = ""
	WechatPlatformPublicKey   = ""
	WechatPlatformPublicKeyId = ""
	WechatMinTopUp            = 1
)
