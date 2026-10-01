package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type PaymentSetting struct {
	AmountOptions  []int           `json:"amount_options"`
	AmountDiscount map[int]float64 `json:"amount_discount"` // 充值金额对应的折扣，例如 100 元 0.9 表示 100 元充值享受 9 折优惠

	// 充值页面支付方式下方的提示文案（例如：需要对公汇款请联系客服。），留空则不展示
	EpayTip string `json:"epay_tip"`

	// 充值页限时活动展示，留空表示不展示
	PromoTitle     string `json:"promo_title"`
	PromoEndTime   int64  `json:"promo_end_time"`   // 活动结束时间（Unix 秒）
	PromoBannerURL string `json:"promo_banner_url"` // 活动横幅图片地址（https）
	PromoLink      string `json:"promo_link"`       // 活动跳转地址（https）

	ComplianceConfirmed    bool   `json:"compliance_confirmed"`
	ComplianceTermsVersion string `json:"compliance_terms_version"`
	ComplianceConfirmedAt  int64  `json:"compliance_confirmed_at"`
	ComplianceConfirmedBy  int    `json:"compliance_confirmed_by"`
	ComplianceConfirmedIP  string `json:"compliance_confirmed_ip"`

	// 申请开票的最小未开票金额，单位与展示货币一致
	InvoiceMinAmount float64 `json:"invoice_min_amount"`
}

const CurrentComplianceTermsVersion = "v1"

// DefaultInvoiceMinAmount 是申请开票的默认起开金额
const DefaultInvoiceMinAmount = 100

// 默认配置
var paymentSetting = PaymentSetting{
	AmountOptions:    []int{10, 20, 50, 100, 200, 500},
	AmountDiscount:   map[int]float64{},
	InvoiceMinAmount: DefaultInvoiceMinAmount,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("payment_setting", &paymentSetting)
}

func GetPaymentSetting() *PaymentSetting {
	return &paymentSetting
}

// GetInvoiceMinAmount 返回起开金额，配置缺失时回退到默认值
func GetInvoiceMinAmount() float64 {
	if paymentSetting.InvoiceMinAmount <= 0 {
		return DefaultInvoiceMinAmount
	}
	return paymentSetting.InvoiceMinAmount
}

func IsPaymentComplianceConfirmed() bool {
	return paymentSetting.ComplianceConfirmed &&
		paymentSetting.ComplianceTermsVersion == CurrentComplianceTermsVersion
}
