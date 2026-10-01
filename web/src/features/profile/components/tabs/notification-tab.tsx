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
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getCurrencyDisplay } from '@/lib/currency'
import {
  formatNumber,
  getEditableQuotaStep,
  parseQuotaFromDollars,
  quotaUnitsToEditableAmount,
} from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import {
  getNotificationLimitMinutes,
  statusQueryOptions,
} from '@/lib/status-query'

import { updateUserSettings } from '../../api'
import {
  NOTIFICATION_METHODS,
  NOTIFICATION_WEBHOOK_FIELDS,
  QUOTA_WARNING_PRESETS,
  SUBSCRIPTION_EVENTS,
} from '../../constants'
import {
  normalizeUserSettings,
  toNotificationMethod,
} from '../../lib/user-settings'
import type { NotificationMethod, UserProfile } from '../../types'

interface NotificationTabProps {
  profile: UserProfile | null
  onUpdate: () => void
}

export function NotificationTab({ profile, onUpdate }: NotificationTabProps) {
  const { t } = useTranslation()
  const { data: status } = useQuery(statusQueryOptions)
  const limitMinutes = getNotificationLimitMinutes(status)
  const { meta } = getCurrencyDisplay()
  const currencySymbol = 'symbol' in meta ? meta.symbol : ''

  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState(() => normalizeUserSettings())
  const [threshold, setThreshold] = useState(() =>
    String(
      quotaUnitsToEditableAmount(
        normalizeUserSettings().quota_warning_threshold
      )
    )
  )

  useEffect(() => {
    if (!profile?.setting) return
    const next = normalizeUserSettings(profile.setting)
    setSettings(next)
    setThreshold(
      String(quotaUnitsToEditableAmount(next.quota_warning_threshold))
    )
  }, [profile])

  const updateField = useCallback(
    <K extends keyof typeof settings>(
      field: K,
      value: (typeof settings)[K]
    ) => {
      setSettings((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const notifyType = toNotificationMethod(settings.notify_type)

  const handleSave = async () => {
    const amount = Number(threshold)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('Enter a warning amount greater than 0'))
      return
    }
    try {
      setLoading(true)
      const { record_ip_log: _recordIpLog, ...notificationSettings } = settings
      const response = await updateUserSettings({
        ...notificationSettings,
        notify_type: notifyType,
        // The quota warning channel is locked on, matching the reference form.
        subscribe_quota_insufficient: true,
        quota_warning_threshold: parseQuotaFromDollars(amount),
      })

      if (response.success) {
        toast.success(t('Settings updated successfully'))
        onUpdate()
      } else {
        handleServerError(response, t('Failed to update settings'))
      }
    } catch (error) {
      handleServerError(error, t('Failed to update settings'))
    } finally {
      setLoading(false)
    }
  }

  const enteredAmount = Number(threshold)
  const displayedAmount = Number.isFinite(enteredAmount)
    ? formatNumber(enteredAmount)
    : threshold
  // The warning amount keeps the currency symbol after the value, matching the
  // suffix shown in the amount input.
  const warningAmount = `${displayedAmount}${currencySymbol}`
  let warningDescription: string
  if (limitMinutes <= 0) {
    warningDescription = t(
      'You will receive a warning notification when your balance falls below {{amount}}',
      { amount: warningAmount }
    )
  } else if (limitMinutes >= 60 && limitMinutes % 60 === 0) {
    warningDescription = t(
      'You will receive a warning notification when your balance falls below {{amount}} (at most one notification every {{hours}} hours)',
      { amount: warningAmount, hours: limitMinutes / 60 }
    )
  } else {
    warningDescription = t(
      'You will receive a warning notification when your balance falls below {{amount}} (at most one notification every {{minutes}} minutes)',
      { amount: warningAmount, minutes: limitMinutes }
    )
  }

  return (
    <div>
      <form
        className='border-border/40 space-y-6 rounded-xl border p-5'
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
      >
        <Field>
          <FieldLabel>{t('Subscription Events')}</FieldLabel>
          <div className='flex flex-wrap gap-4 pt-1'>
            {SUBSCRIPTION_EVENTS.map((event) => {
              const locked = 'locked' in event && event.locked
              const checked = locked || Boolean(settings[event.field])
              return (
                <label
                  key={event.field}
                  className='flex items-center gap-2 text-sm'
                  data-locked={locked ? 'true' : undefined}
                >
                  <Checkbox
                    checked={checked}
                    disabled={locked}
                    className={
                      locked ? 'pointer-events-none opacity-60' : undefined
                    }
                    onCheckedChange={(value) =>
                      updateField(event.field, Boolean(value))
                    }
                  />
                  <span
                    className={locked ? 'text-muted-foreground' : undefined}
                  >
                    {t(event.label)}
                  </span>
                </label>
              )
            })}
          </div>
        </Field>

        <Field>
          <FieldLabel>{t('Notification Method')}</FieldLabel>
          <RadioGroup
            value={notifyType}
            onValueChange={(value) =>
              updateField('notify_type', value as NotificationMethod)
            }
            className='flex w-full flex-wrap gap-x-5 gap-y-2 pt-1'
          >
            {NOTIFICATION_METHODS.map((method) => (
              <label
                key={method.value}
                className='flex items-center gap-2 text-sm'
              >
                <RadioGroupItem value={method.value} />
                {t(method.label)}
              </label>
            ))}
          </RadioGroup>
          <FieldDescription>
            {notifyType === 'email'
              ? t('Receive all subscribed notifications')
              : t(
                  'Only quota warnings use this channel; other subscriptions go to your account email.'
                )}
          </FieldDescription>
        </Field>

        {notifyType === 'email' && (
          <Field>
            <FieldLabel htmlFor='notificationEmail'>
              {t('Notification Email')}
              <span className='text-muted-foreground ml-1 text-xs'>
                ({t('Optional')})
              </span>
            </FieldLabel>
            <Input
              id='notificationEmail'
              type='email'
              className='max-w-md'
              value={settings.notification_email}
              onChange={(e) =>
                updateField('notification_email', e.target.value)
              }
              placeholder={t('Leave empty to notify your account email')}
            />
          </Field>
        )}

        {(notifyType === 'wecom' ||
          notifyType === 'dingtalk' ||
          notifyType === 'feishu') && (
          <Field>
            <FieldLabel htmlFor='robotWebhookUrl'>
              {t(NOTIFICATION_WEBHOOK_FIELDS[notifyType].label)}
            </FieldLabel>
            <Input
              id='robotWebhookUrl'
              value={settings[`${notifyType}_url`]}
              onChange={(e) => updateField(`${notifyType}_url`, e.target.value)}
              placeholder={NOTIFICATION_WEBHOOK_FIELDS[notifyType].placeholder}
            />
          </Field>
        )}

        {notifyType === 'telegram' && (
          <>
            <Field>
              <FieldLabel htmlFor='telegramChatId'>{t('Chat ID')}</FieldLabel>
              <Input
                id='telegramChatId'
                value={settings.telegram_chat_id}
                onChange={(e) =>
                  updateField('telegram_chat_id', e.target.value)
                }
                placeholder='chat id or @username'
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='telegramBotToken'>
                {t('Bot Token')}
              </FieldLabel>
              <PasswordInput
                id='telegramBotToken'
                value={settings.telegram_bot_token}
                onChange={(e) =>
                  updateField('telegram_bot_token', e.target.value)
                }
                placeholder='123456789:ABCDEF1234ghIklzyx57W2v1u123e'
              />
            </Field>
          </>
        )}

        {notifyType === 'webhook' && (
          <>
            <Field>
              <FieldLabel htmlFor='webhookUrl'>{t('Webhook URL')}</FieldLabel>
              <Input
                id='webhookUrl'
                value={settings.webhook_url}
                onChange={(e) => updateField('webhook_url', e.target.value)}
                placeholder={t('https://example.com/webhook')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='webhookSecret'>
                {t('Token')}
                <span className='text-muted-foreground ml-1 text-xs'>
                  ({t('Optional')})
                </span>
              </FieldLabel>
              <PasswordInput
                id='webhookSecret'
                value={settings.webhook_secret}
                onChange={(e) => updateField('webhook_secret', e.target.value)}
                placeholder={t(
                  'Passed through the Header Bearer for verification'
                )}
              />
            </Field>
          </>
        )}

        <Field>
          <FieldLabel htmlFor='quotaWarningThreshold'>
            {t('Quota Warning Threshold')}
          </FieldLabel>
          <InputGroup className='max-w-xs'>
            <InputGroupInput
              id='quotaWarningThreshold'
              type='number'
              min='0'
              step={getEditableQuotaStep()}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={t('Enter warning amount')}
            />
            {currencySymbol ? (
              <InputGroupAddon align='inline-end'>
                <InputGroupText>{currencySymbol}</InputGroupText>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <div className='flex flex-wrap gap-1.5 pt-1'>
            {QUOTA_WARNING_PRESETS.map((preset) => (
              <Button
                key={preset}
                type='button'
                variant='outline'
                size='xs'
                className='border-border/60'
                onClick={() => setThreshold(String(preset))}
              >
                {currencySymbol}
                {preset}
              </Button>
            ))}
          </div>
          <FieldDescription>{warningDescription}</FieldDescription>
        </Field>

        <div>
          <Button type='submit' disabled={loading}>
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {loading ? t('Saving...') : t('Save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
