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
import {
  DEFAULT_QUOTA_WARNING_THRESHOLD,
  NOTIFICATION_METHODS,
} from '../constants'
import type {
  NotificationMethod,
  NotifyType,
  UpdateUserSettingsRequest,
} from '../types'
import { parseUserSettings } from './format'

const NOTIFY_TYPES = new Set<string>([
  'email',
  'webhook',
  'wecom',
  'dingtalk',
  'feishu',
  'telegram',
  'bark',
  'gotify',
])

/** Keep every stored channel, including the legacy Bark/Gotify values. */
function toNotifyType(value: unknown): NotifyType {
  return typeof value === 'string' && NOTIFY_TYPES.has(value)
    ? (value as NotifyType)
    : 'email'
}

/**
 * Channel shown in the profile UI. Legacy channels fall back to email so the
 * radio group always has a selection.
 */
export function toNotificationMethod(value: unknown): NotificationMethod {
  const notifyType = toNotifyType(value)
  return (
    NOTIFICATION_METHODS.find((method) => method.value === notifyType)?.value ??
    'email'
  )
}

export function normalizeUserSettings(
  setting?: string
): Required<UpdateUserSettingsRequest> {
  const parsed = parseUserSettings(setting)
  return {
    notify_type: toNotifyType(parsed.notify_type),
    quota_warning_threshold:
      parsed.quota_warning_threshold ?? DEFAULT_QUOTA_WARNING_THRESHOLD,
    notification_email: parsed.notification_email ?? '',
    webhook_url: parsed.webhook_url ?? '',
    webhook_secret: parsed.webhook_secret ?? '',
    bark_url: parsed.bark_url ?? '',
    gotify_url: parsed.gotify_url ?? '',
    gotify_token: parsed.gotify_token ?? '',
    gotify_priority: parsed.gotify_priority ?? 5,
    accept_unset_model_ratio_model:
      parsed.accept_unset_model_ratio_model || false,
    record_ip_log: parsed.record_ip_log || false,
    upstream_model_update_notify_enabled:
      parsed.upstream_model_update_notify_enabled || false,
    wecom_url: parsed.wecom_url ?? '',
    dingtalk_url: parsed.dingtalk_url ?? '',
    feishu_url: parsed.feishu_url ?? '',
    telegram_bot_token: parsed.telegram_bot_token ?? '',
    telegram_chat_id: parsed.telegram_chat_id ?? '',
    subscribe_quota_insufficient: parsed.subscribe_quota_insufficient ?? true,
    subscribe_discount: parsed.subscribe_discount ?? true,
    subscribe_keepalive: parsed.subscribe_keepalive ?? true,
    subscribe_system_notice: parsed.subscribe_system_notice ?? false,
    subscribe_model_price_change: parsed.subscribe_model_price_change ?? true,
  }
}
