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
import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatLocalCurrencyAmount } from '@/lib/currency'

import { invoiceProjectLabel } from '../lib/invoice'
import type { InvoiceRecord } from '../types'

const MONEY_FORMAT = { fixedFractionDigits: 2 } as const

type InvoiceDetailDialogProps = {
  invoice: InvoiceRecord | null
  onOpenChange: (open: boolean) => void
  formatTime: (timestamp: number) => string
}

export function InvoiceDetailDialog({
  invoice,
  onOpenChange,
  formatTime,
}: InvoiceDetailDialogProps) {
  const { t } = useTranslation()

  const rows: Array<{ label: string; value: string }> = []
  if (invoice) {
    rows.push({
      label: t('Invoice type'),
      value:
        invoice.type === 'special'
          ? t('VAT special invoice')
          : t('VAT ordinary invoice'),
    })
    rows.push({ label: t('Invoice title'), value: invoice.title })
    rows.push({
      label: t('Taxpayer identification number'),
      value:
        Number(invoice.tax_id) === 0
          ? t('Individual (no tax ID)')
          : invoice.tax_id,
    })
    rows.push({
      label: t('Invoice amount'),
      value: formatLocalCurrencyAmount(invoice.amount, MONEY_FORMAT),
    })
    rows.push({
      label: t('Item name'),
      value:
        invoiceProjectLabel(invoice.project_type) || invoice.content || '-',
    })
    if (invoice.type === 'special') {
      if (invoice.buyer_bank_account) {
        rows.push({
          label: t('Bank and account number'),
          value: invoice.buyer_bank_account,
        })
      }
      if (invoice.buyer_tel) {
        rows.push({ label: t('Phone'), value: invoice.buyer_tel })
      }
      if (invoice.buyer_addr) {
        rows.push({ label: t('Address'), value: invoice.buyer_addr })
      }
    }
    if (invoice.invoice_no) {
      rows.push({ label: t('Invoice number'), value: invoice.invoice_no })
    }
    if (invoice.red_invoice_no) {
      rows.push({
        label: t('Red invoice number'),
        value: invoice.red_invoice_no,
      })
    }
    if (invoice.orders && invoice.orders.length > 0) {
      rows.push({
        label: t('Invoice details'),
        value: invoice.orders
          .map((order) =>
            t('{{tradeNo}} · {{amount}}', {
              tradeNo: order.trade_no,
              amount: formatLocalCurrencyAmount(order.money, MONEY_FORMAT),
            })
          )
          .join('\n'),
      })
    }
    if (invoice.content) {
      rows.push({ label: t('Remark'), value: invoice.content })
    }
    if (invoice.reason) {
      rows.push({ label: t('Reject reason'), value: invoice.reason })
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{t('Application details')}</DialogTitle>
          <DialogDescription>
            {invoice
              ? t('Applied at: {{time}}', {
                  time: formatTime(invoice.created_at),
                })
              : ''}
          </DialogDescription>
        </DialogHeader>
        {invoice && (
          <dl className='space-y-2 text-sm'>
            {rows.map((row) => (
              <div key={row.label} className='flex gap-3'>
                <dt className='text-muted-foreground w-24 shrink-0'>
                  {row.label}
                </dt>
                <dd className='min-w-0 flex-1 break-words whitespace-pre-line'>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
