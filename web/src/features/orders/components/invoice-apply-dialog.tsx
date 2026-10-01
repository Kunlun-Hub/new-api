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
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { handleServerError } from '@/lib/handle-server-error'

import { applyInvoice, getInvoiceEligibility } from '../api'
import {
  createEmptyInvoiceForm,
  INVOICE_COMPANY_STORAGE_KEY,
  invoiceFormToPayload,
  type InvoiceFormValue,
} from '../lib/invoice'
import type { InvoiceEligibility } from '../types'
import { InvoiceForm } from './invoice-form'

const MONEY_FORMAT = { fixedFractionDigits: 2 } as const

const SPECIAL_INVOICE_ENABLED = true

type InvoiceApplyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 选中的订单主键，为空表示对全部可开票订单申请 */
  orderIds: number[]
  onApplied: () => void
}

export function InvoiceApplyDialog({
  open,
  onOpenChange,
  orderIds,
  onApplied,
}: InvoiceApplyDialogProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<InvoiceFormValue>(createEmptyInvoiceForm)
  const [eligibility, setEligibility] = useState<InvoiceEligibility | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const scope = orderIds.length > 0 ? 'selected' : 'all'

  useEffect(() => {
    if (!open) return
    try {
      const cached = localStorage.getItem(INVOICE_COMPANY_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<{
          title: string
          taxId: string
          buyerAddr: string
          buyerTel: string
          buyerBankAccount: string
        }>
        setForm((prev) => ({
          ...prev,
          title: parsed.title ?? prev.title,
          taxId: parsed.taxId ?? prev.taxId,
          buyerAddr: parsed.buyerAddr ?? prev.buyerAddr,
          buyerTel: parsed.buyerTel ?? prev.buyerTel,
          buyerBankAccount: parsed.buyerBankAccount ?? prev.buyerBankAccount,
        }))
      }
    } catch {
      // 缓存解析失败时忽略，使用空表单
    }
    let active = true
    setLoading(true)
    void getInvoiceEligibility(orderIds.length > 0 ? orderIds : undefined)
      .then((data) => {
        if (active) setEligibility(data)
      })
      .catch((error) => {
        if (active) {
          handleServerError(error, t('Failed to load invoiceable amount'))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderIds.join(',')])

  const canApply = eligibility?.can_apply === true

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && submitting) return
      onOpenChange(next)
    },
    [onOpenChange, submitting]
  )

  const handleSubmit = async () => {
    if (!canApply) return
    if (!form.title.trim()) {
      toast.error(t('Please fill in the invoice title'))
      return
    }
    if (form.buyerKind === 'company' && !form.taxId.trim()) {
      toast.error(t('Please fill in the tax identification number'))
      return
    }
    setSubmitting(true)
    try {
      const payload = invoiceFormToPayload(form)
      await applyInvoice({
        ...payload,
        order_ids: orderIds.length > 0 ? orderIds : undefined,
      })
      localStorage.setItem(
        INVOICE_COMPANY_STORAGE_KEY,
        JSON.stringify({
          title: payload.title,
          taxId: payload.tax_id,
          buyerAddr: payload.buyer_addr,
          buyerTel: payload.buyer_tel,
          buyerBankAccount: payload.buyer_bank_account,
        })
      )
      toast.success(t('Invoice application submitted'))
      onOpenChange(false)
      onApplied()
    } catch (error) {
      handleServerError(error, t('Failed to submit invoice application'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto p-6 sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {scope === 'selected'
              ? t('Apply for invoice (selected orders)')
              : t('Apply for invoice')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='flex justify-center py-12'>
            <Spinner />
          </div>
        ) : (
          <div className='space-y-4'>
            {canApply ? (
              <Alert className='border-green-500/20 bg-green-500/6 text-green-800'>
                <CheckCircle2 />
                <AlertTitle className='mb-1'>
                  {t('Invoice application available')}
                </AlertTitle>
                <AlertDescription>
                  {scope === 'selected'
                    ? t(
                        'You can apply for an invoice for the {{count}} selected orders.',
                        { count: orderIds.length }
                      )
                    : t(
                        'You can apply for an invoice for all eligible orders.'
                      )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className='border-red-500/20 bg-red-500/6 text-red-800'>
                <CircleAlert />
                <AlertTitle className='mb-2'>
                  {t('Online invoicing requirements are not met yet')}
                </AlertTitle>
                <AlertDescription>
                  {scope === 'selected'
                    ? t(
                        'The selected orders must reach {{amount}} to apply for an invoice.',
                        {
                          amount: formatLocalCurrencyAmount(
                            eligibility?.min_amount ?? 0,
                            MONEY_FORMAT
                          ),
                        }
                      )
                    : t('Uninvoiced order amount reaches {{amount}}.', {
                        amount: formatLocalCurrencyAmount(
                          eligibility?.min_amount ?? 0,
                          MONEY_FORMAT
                        ),
                      })}
                  <br />
                  {t(
                    'Applications cannot be submitted while another application is pending or rejected.'
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className='text-sm'>
              {scope === 'selected'
                ? t('Invoiceable amount of selected orders')
                : t('Uninvoiced amount')}
              ：
              <b className='text-base text-red-500'>
                {formatLocalCurrencyAmount(
                  eligibility?.amount ?? 0,
                  MONEY_FORMAT
                )}
              </b>
            </div>

            <InvoiceForm
              value={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              allowSpecial={SPECIAL_INVOICE_ENABLED}
              disabled={!canApply}
            />
          </div>
        )}

        <DialogFooter className='border-border/40 bg-transparent'>
          <Button
            variant='secondary'
            disabled={!canApply || loading}
            onClick={() => setForm(createEmptyInvoiceForm())}
          >
            {t('Reset')}
          </Button>
          <Button
            disabled={!canApply || loading || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Spinner data-icon='inline-start' />}
            {t('Submit application')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
