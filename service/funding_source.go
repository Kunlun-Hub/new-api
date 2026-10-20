package service

import (
	"errors"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

// ---------------------------------------------------------------------------
// FundingSource — 资金来源接口（钱包 or 订阅）
// ---------------------------------------------------------------------------

// FundingSource 抽象了预扣费的资金来源。
type FundingSource interface {
	// Source 返回资金来源标识："wallet" 或 "subscription"
	Source() string
	// PreConsume 从该资金来源预扣 amount 额度
	PreConsume(amount int) error
	// Settle 根据差额调整资金来源（正数补扣，负数退还）
	Settle(delta int) error
	// Refund 退还所有预扣费
	Refund() error
}

// ---------------------------------------------------------------------------
// WalletFunding — 钱包资金来源实现
// ---------------------------------------------------------------------------

// ErrInsufficientWalletQuota 钱包原子预扣失败（余额不足），未发生任何扣减。
// BillingSession 据此映射为 ErrorCodeInsufficientUserQuota，
// 使 wallet_first 等计费偏好可以回退到订阅。
var ErrInsufficientWalletQuota = errors.New("wallet quota insufficient")

type WalletFunding struct {
	userId   int
	consumed int // 实际预扣的用户额度（含礼赠金部分）
	// giftEligible 表示当前计费模型允许使用礼赠金；此时礼赠金优先扣减，
	// 余额承担剩余部分。
	giftEligible bool
	giftConsumed int // consumed 中由礼赠金承担的部分
}

func (w *WalletFunding) Source() string { return BillingSourceWallet }

// takeGiftQuota 尽可能从礼赠金扣除 amount，返回实际扣除的额度。
func (w *WalletFunding) takeGiftQuota(amount int) (int, error) {
	if !w.giftEligible || amount <= 0 {
		return 0, nil
	}
	reserved, err := model.TryReserveUserGiftQuota(w.userId, amount)
	if err != nil {
		return 0, err
	}
	w.giftConsumed += reserved
	return reserved, nil
}

func (w *WalletFunding) PreConsume(amount int) error {
	if amount <= 0 {
		return nil
	}
	gift, err := w.takeGiftQuota(amount)
	if err != nil {
		return err
	}
	rest := amount - gift
	if rest > 0 {
		reserved, err := model.TryReserveUserQuota(w.userId, rest)
		if err != nil || !reserved {
			// 余额不足时回滚已扣的礼赠金，保证失败请求不产生任何扣费。
			if gift > 0 {
				w.giftConsumed -= gift
				if rollbackErr := model.IncreaseUserGiftQuota(w.userId, gift); rollbackErr != nil {
					common.SysError("error rolling back gift quota pre-consume: " + rollbackErr.Error())
				}
			}
			if err != nil {
				return err
			}
			return ErrInsufficientWalletQuota
		}
	}
	w.consumed = amount
	return nil
}

// ConsumeAvailable 按礼赠金优先的顺序扣减 amount，剩余部分记为钱包支出。
// allowDebt 为 true 时允许余额欠费（结算补扣场景）。
func (w *WalletFunding) ConsumeAvailable(amount int) error {
	if amount <= 0 {
		return nil
	}
	gift, err := w.takeGiftQuota(amount)
	if err != nil {
		return err
	}
	rest := amount - gift
	if rest > 0 {
		if err := model.DecreaseUserQuota(w.userId, rest, false); err != nil {
			return err
		}
	}
	w.consumed += amount
	return nil
}

func (w *WalletFunding) Settle(delta int) error {
	if delta == 0 {
		return nil
	}
	if delta > 0 {
		// 补扣同样礼赠金优先；余额不足部分允许欠费，与原有结算语义一致。
		return w.ConsumeAvailable(delta)
	}
	refund := -delta
	giftRefund := 0
	if w.giftConsumed > 0 {
		giftRefund = min(refund, w.giftConsumed)
		if err := model.IncreaseUserGiftQuota(w.userId, giftRefund); err != nil {
			return err
		}
		w.giftConsumed -= giftRefund
	}
	if rest := refund - giftRefund; rest > 0 {
		return model.IncreaseUserQuota(w.userId, rest, false)
	}
	return nil
}

// RollbackReserve 撤销一次未完成的补充预扣（预扣失败补偿路径）。
func (w *WalletFunding) RollbackReserve(delta int) error {
	if delta <= 0 {
		return nil
	}
	giftRefund := 0
	if w.giftConsumed > 0 {
		giftRefund = min(delta, w.giftConsumed)
		if err := model.IncreaseUserGiftQuota(w.userId, giftRefund); err != nil {
			return err
		}
		w.giftConsumed -= giftRefund
	}
	if rest := delta - giftRefund; rest > 0 {
		if err := model.IncreaseUserQuota(w.userId, rest, false); err != nil {
			return err
		}
	}
	w.consumed -= delta
	return nil
}

func (w *WalletFunding) Refund() error {
	if w.consumed <= 0 {
		return nil
	}
	// IncreaseUserQuota 是 quota += N 的非幂等操作，不能重试，否则会多退额度。
	// 订阅的 RefundSubscriptionPreConsume 有 requestId 幂等保护所以可以重试。
	if w.giftConsumed > 0 {
		if err := model.IncreaseUserGiftQuota(w.userId, w.giftConsumed); err != nil {
			return err
		}
	}
	if rest := w.consumed - w.giftConsumed; rest > 0 {
		return model.IncreaseUserQuota(w.userId, rest, false)
	}
	w.consumed = 0
	w.giftConsumed = 0
	return nil
}

// ---------------------------------------------------------------------------
// SubscriptionFunding — 订阅资金来源实现
// ---------------------------------------------------------------------------

type SubscriptionFunding struct {
	requestId      string
	userId         int
	modelName      string
	amount         int64 // 预扣的订阅额度（subConsume）
	subscriptionId int
	preConsumed    int64
	// 以下字段在 PreConsume 成功后填充，供 RelayInfo 同步使用
	AmountTotal     int64
	AmountUsedAfter int64
	PlanId          int
	PlanTitle       string
}

func (s *SubscriptionFunding) Source() string { return BillingSourceSubscription }

func (s *SubscriptionFunding) PreConsume(_ int) error {
	// amount 参数被忽略，使用内部 s.amount（已在构造时根据 preConsumedQuota 计算）
	res, err := model.PreConsumeUserSubscription(s.requestId, s.userId, s.modelName, 0, s.amount)
	if err != nil {
		return err
	}
	s.subscriptionId = res.UserSubscriptionId
	s.preConsumed = res.PreConsumed
	s.AmountTotal = res.AmountTotal
	s.AmountUsedAfter = res.AmountUsedAfter
	// 获取订阅计划信息
	if planInfo, err := model.GetSubscriptionPlanInfoByUserSubscriptionId(res.UserSubscriptionId); err == nil && planInfo != nil {
		s.PlanId = planInfo.PlanId
		s.PlanTitle = planInfo.PlanTitle
	}
	return nil
}

func (s *SubscriptionFunding) Settle(delta int) error {
	if delta == 0 {
		return nil
	}
	return model.PostConsumeUserSubscriptionDelta(s.subscriptionId, int64(delta))
}

func (s *SubscriptionFunding) Refund() error {
	if s.preConsumed <= 0 {
		return nil
	}
	return refundWithRetry(func() error {
		return model.RefundSubscriptionPreConsume(s.requestId)
	})
}

// refundWithRetry 尝试多次执行退款操作以提高成功率，只能用于基于事务的退款函数！！！！！！
// try to refund with retries, only for refund functions based on transactions!!!
func refundWithRetry(fn func() error) error {
	if fn == nil {
		return nil
	}
	const maxAttempts = 3
	var lastErr error
	for i := range maxAttempts {
		if err := fn(); err == nil {
			return nil
		} else {
			lastErr = err
		}
		if i < maxAttempts-1 {
			time.Sleep(time.Duration(200*(i+1)) * time.Millisecond)
		}
	}
	return lastErr
}
