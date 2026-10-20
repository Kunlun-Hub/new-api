package setting

// 支付宝官方渠道配置。AlipayPayMode 选择开放平台已签约的产品：
//   - AlipayPayModePrecreate：当面付，生成二维码（alipay.trade.precreate）
//   - AlipayPayModePage：电脑网站支付，跳转收银台（alipay.trade.page.pay）
// AlipayPrivateKey/AlipayPublicKey 同时支持带 PEM 头和不带 PEM 头的 Base64 字符串。
const (
	AlipayPayModePrecreate = "precreate"
	AlipayPayModePage      = "page"
)

var (
	AlipayEnabled    = false
	AlipayAppId      = ""
	AlipayPrivateKey = ""
	AlipayPublicKey  = ""
	AlipayPayMode    = AlipayPayModePrecreate
	AlipaySandbox    = false
	AlipayMinTopUp   = 1
)
