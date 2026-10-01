/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
// ============================================================================
// Profile Constants
// ============================================================================

/**
 * Default quota warning threshold (500,000 = $1)
 */
export const DEFAULT_QUOTA_WARNING_THRESHOLD = 500000

/**
 * Notification methods offered in the profile UI, in reference order.
 */
export const NOTIFICATION_METHODS = [
  { value: 'email' as const, label: 'Email' },
  { value: 'wecom' as const, label: 'WeCom' },
  { value: 'dingtalk' as const, label: 'DingTalk' },
  { value: 'feishu' as const, label: 'Feishu' },
  { value: 'telegram' as const, label: 'Telegram' },
  { value: 'webhook' as const, label: 'Webhook' },
] as const

/**
 * Robot webhook URL field for the channels that only need an endpoint.
 */
export const NOTIFICATION_WEBHOOK_FIELDS = {
  wecom: {
    label: 'WebHook URL',
    placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
  },
  dingtalk: {
    label: 'WebHook URL',
    placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
  },
  feishu: {
    label: 'WebHook URL',
    placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
  },
} as const

/**
 * Events a user can subscribe to. The quota warning event is locked on so the
 * channel that delivers balance alerts can never be switched off by accident.
 */
export const SUBSCRIPTION_EVENTS = [
  {
    field: 'subscribe_quota_insufficient',
    label: 'Account quota insufficient notice',
    locked: true,
  },
  { field: 'subscribe_discount', label: 'Discount campaign notice' },
  { field: 'subscribe_keepalive', label: 'Keepalive periodic notice' },
  { field: 'subscribe_system_notice', label: 'System announcement notice' },
  { field: 'subscribe_model_price_change', label: 'Model price change notice' },
] as const

/**
 * Quick picks for the quota warning amount, in the configured display currency.
 */
export const QUOTA_WARNING_PRESETS = [0.1, 0.2, 0.5, 1, 5, 10, 50, 100]
