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
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatQuotaFixed } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { applyWithdrawal, transferAffiliateQuota } from '../api'
import type { InviteStatus } from '../types'

export type InviteActionMode = 'transfer' | 'withdraw'

interface InviteActionDialogProps {
  mode: InviteActionMode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  status?: InviteStatus
  onSuccess: () => void
}

function UsdAmountInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: number
  onChange: (value: number) => void
  placeholder: string
  invalid: boolean
}) {
  return (
    <div className='relative'>
      <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2'>
        $
      </span>
      <Input
        type='number'
        min={0}
        step='0.01'
        className='pl-6'
        aria-invalid={invalid}
        value={value > 0 ? value : ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? 0 : Number(event.target.value))
        }
        placeholder={placeholder}
      />
    </div>
  )
}

export function InviteActionDialog({
  mode,
  open,
  onOpenChange,
  status,
  onSuccess,
}: InviteActionDialogProps) {
  const { t } = useTranslation()
  const currencyConfig = useSystemConfigStore((state) => state.config.currency)
  const quotaPerUnit =
    currencyConfig.quotaPerUnit > 0
      ? currencyConfig.quotaPerUnit
      : DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  const isWithdraw = mode === 'withdraw'
  const availableQuota = status?.aff_quota ?? 0
  const availableAmount = availableQuota / quotaPerUnit
  const minTransferAmount = quotaPerUnit / quotaPerUnit
  const minWithdrawAmount = (status?.withdrawal.min_quota ?? 0) / quotaPerUnit
  const ratio = status?.withdrawal.ratio ?? 0

  const transferSchema = useMemo(
    () =>
      z.object({
        amount: z
          .number()
          .refine((value) => Number.isFinite(value) && value > 0, {
            message: t('This field is required'),
          })
          .refine(
            (value) => value >= minTransferAmount && value <= availableAmount,
            { message: t('Amount is out of the allowed range') }
          ),
      }),
    [availableAmount, minTransferAmount, t]
  )

  const withdrawSchema = useMemo(
    () =>
      z.object({
        amount: z
          .number()
          .refine((value) => Number.isFinite(value) && value > 0, {
            message: t('This field is required'),
          })
          .refine(
            (value) => value >= minWithdrawAmount && value <= availableAmount,
            { message: t('Amount is out of the allowed range') }
          ),
        real_name: z.string().min(1, t('This field is required')),
        account: z.string().min(1, t('This field is required')),
      }),
    [availableAmount, minWithdrawAmount, t]
  )

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { amount: 0 },
  })
  const withdrawForm = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { amount: 0, real_name: '', account: '' },
  })

  useEffect(() => {
    if (!open) return
    transferForm.reset({ amount: 0 })
    withdrawForm.reset({ amount: 0, real_name: '', account: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  const handleTransfer = async (values: { amount: number }) => {
    try {
      await transferAffiliateQuota(Math.round(values.amount * quotaPerUnit))
      toast.success(t('Transferred successfully'))
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      handleServerError(error, t('Transfer failed'))
    }
  }

  const handleWithdraw = async (values: {
    amount: number
    real_name: string
    account: string
  }) => {
    try {
      await applyWithdrawal(values)
      toast.success(t('Application submitted!'), {
        description: t(
          'Your reward balance has been held. We will process your withdrawal within 1-3 business days.'
        ),
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      handleServerError(error, t('Failed to submit the application'))
    }
  }

  const withdrawAmount = withdrawForm.watch('amount')
  const submitLabel = isWithdraw ? t('Cash Out') : t('Transfer Now')
  const isSubmitting = isWithdraw
    ? withdrawForm.formState.isSubmitting
    : transferForm.formState.isSubmitting

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isWithdraw ? t('Cash Out') : t('Transfer to Balance')}
      showCloseButton
      contentClassName='sm:max-w-xl'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      <div className='text-center text-lg font-semibold'>
        {isWithdraw
          ? t('Available to cash out {{amount}}', {
              amount: formatQuotaFixed(availableQuota),
            })
          : t('Available to transfer {{amount}}', {
              amount: formatQuotaFixed(availableQuota),
            })}
      </div>

      {isWithdraw ? (
        <form
          onSubmit={withdrawForm.handleSubmit(handleWithdraw)}
          className='space-y-4'
        >
          <p className='text-muted-foreground text-sm'>
            {t('Cash out to Alipay, current rate {{ratio}}', { ratio })}
          </p>
          <Controller
            name='amount'
            control={withdrawForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldTitle>{t('Withdrawal Amount')}</FieldTitle>
                <UsdAmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('Enter amount to withdraw, in USD')}
                  invalid={fieldState.invalid}
                />
                <p className='text-muted-foreground text-xs'>
                  {t('Minimum withdrawal {{amount}}', {
                    amount: formatQuotaFixed(status?.withdrawal.min_quota ?? 0),
                  })}
                  {withdrawAmount > 0 && ratio > 0 && (
                    <span className='ml-1 font-medium text-red-500'>
                      {t('You receive ¥{{cny}}', {
                        cny: (ratio * withdrawAmount).toFixed(2),
                      })}
                    </span>
                  )}
                </p>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name='real_name'
            control={withdrawForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldTitle>{t('Real Name')}</FieldTitle>
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('Enter the real name of the Alipay account')}
                  autoComplete='off'
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name='account'
            control={withdrawForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldTitle>{t('Alipay Account')}</FieldTitle>
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('Enter your Alipay account')}
                  autoComplete='off'
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() =>
                withdrawForm.reset({ amount: 0, real_name: '', account: '' })
              }
            >
              {t('Reset')}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Loader2 className='animate-spin' />}
              {submitLabel}
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={transferForm.handleSubmit(handleTransfer)}
          className='space-y-4'
        >
          <p className='text-muted-foreground text-sm'>
            {t('Transfer your reward earnings into your account balance')}
          </p>
          <Controller
            name='amount'
            control={transferForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldTitle>{t('Transfer Amount')}</FieldTitle>
                <UsdAmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('Enter amount to transfer, in USD')}
                  invalid={fieldState.invalid}
                />
                <p className='text-muted-foreground text-xs'>
                  {t('Minimum transfer {{amount}}', {
                    amount: formatQuotaFixed(quotaPerUnit),
                  })}
                </p>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => transferForm.reset({ amount: 0 })}
            >
              {t('Reset')}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Loader2 className='animate-spin' />}
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
