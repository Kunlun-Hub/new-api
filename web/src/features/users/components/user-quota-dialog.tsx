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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DateTimePicker } from '@/components/datetime-picker'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import dayjs from '@/lib/dayjs'
import { formatQuota, parseQuotaFromDollars } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'

import { adjustUserQuota } from '../api'
import type { QuotaAdjustMode } from '../types'

type QuotaDialogVariant = 'balance' | 'gift'

interface UserQuotaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  currentQuota: number
  onSuccess: () => void
  /** 'gift' adjusts the gift credit pool instead of the wallet balance. */
  variant?: QuotaDialogVariant
}

export function UserQuotaDialog(props: UserQuotaDialogProps) {
  const { t } = useTranslation()
  const variant = props.variant ?? 'balance'
  const isGift = variant === 'gift'
  const [mode, setMode] = useState<QuotaAdjustMode>('add')
  const [amount, setAmount] = useState('')
  const [expireAt, setExpireAt] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'

  const amountValue = Number.parseFloat(amount) || 0
  const quotaValue = parseQuotaFromDollars(Math.abs(amountValue))

  const targetLabel = isGift ? t('Gift Credit') : t('Quota')

  const getPreviewText = () => {
    const current = props.currentQuota
    const val = quotaValue
    switch (mode) {
      case 'add':
        return `${targetLabel} · ${formatQuota(current)}  +${formatQuota(val)} = ${formatQuota(current + val)}`
      case 'subtract':
        return `${targetLabel} · ${formatQuota(current)}  -${formatQuota(val)} = ${formatQuota(current - val)}`
      case 'override': {
        const overrideQuota = parseQuotaFromDollars(amountValue)
        return `${targetLabel} · ${formatQuota(current)} → ${formatQuota(overrideQuota)}`
      }
      default:
        return ''
    }
  }

  const handleConfirm = async () => {
    if (!amount && mode !== 'override') return
    if (quotaValue <= 0 && mode !== 'override') return

    setLoading(true)
    try {
      const value =
        mode === 'override' ? parseQuotaFromDollars(amountValue) : quotaValue
      const result = await adjustUserQuota({
        id: props.userId,
        action: isGift ? 'add_gift_quota' : 'add_quota',
        mode,
        value: mode === 'override' ? value : Math.abs(value),
        expired_at: isGift
          ? Math.floor((expireAt?.getTime() ?? 0) / 1000)
          : undefined,
      })
      if (result.success) {
        toast.success(
          isGift
            ? t('Gift credit adjusted successfully')
            : t('Quota adjusted successfully')
        )
        resetState()
        props.onOpenChange(false)
        props.onSuccess()
      } else {
        handleServerError(
          result,
          isGift
            ? t('Failed to adjust gift credit')
            : t('Failed to adjust quota')
        )
      }
    } catch (e: unknown) {
      handleServerError(
        e,
        isGift ? t('Failed to adjust gift credit') : t('Failed to adjust quota')
      )
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setAmount('')
    setMode('add')
    setExpireAt(undefined)
  }

  const handleCancel = () => {
    resetState()
    props.onOpenChange(false)
  }

  const placeholder = tokensOnly
    ? t('Enter amount in tokens')
    : t('Enter amount in {{currency}}', { currency: currencyLabel })

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={isGift ? t('Adjust Gift Credit') : t('Adjust Quota')}
      description={t('Select an operation mode and enter the amount')}
      contentHeight='auto'
      bodyClassName='space-y-4'
      footer={
        <>
          <Button variant='outline' onClick={handleCancel}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? t('Processing...') : t('Confirm')}
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='text-muted-foreground text-sm'>{getPreviewText()}</div>

        <div className='space-y-2'>
          <Label>{t('Mode')}</Label>
          <div className='flex gap-1'>
            {(['add', 'subtract', 'override'] as const).map((m) => (
              <Button
                key={m}
                type='button'
                variant='outline'
                size='sm'
                className={cn(
                  mode === m &&
                    'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
                onClick={() => {
                  setMode(m)
                  setAmount('')
                }}
              >
                {m === 'add' && t('Add')}
                {!(m === 'add') && m === 'subtract' && t('Subtract')}
                {!(m === 'add') && !(m === 'subtract') && t('Override')}
              </Button>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label>
            {t('Amount')} ({currencyLabel})
          </Label>
          <Input
            type='number'
            step={tokensOnly ? 1 : 0.000001}
            min={mode === 'override' ? undefined : 0}
            placeholder={placeholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm()
            }}
          />
        </div>

        {isGift && (
          <div className='space-y-2'>
            <Label>{t('Expire time')}</Label>
            <div className='flex items-center gap-2'>
              <DateTimePicker
                value={expireAt}
                onChange={setExpireAt}
                placeholder={t('Never expires')}
                className='flex-1'
              />
              {expireAt && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setExpireAt(undefined)}
                >
                  {t('Never expires')}
                </Button>
              )}
            </div>
            <p className='text-muted-foreground text-xs'>
              {expireAt
                ? t('Gift credit expires at {{time}}', {
                    time: dayjs(expireAt).format('YYYY-MM-DD HH:mm'),
                  })
                : t(
                    'Leave empty for credit that never expires. Adding credit never shortens the current validity.'
                  )}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  )
}
