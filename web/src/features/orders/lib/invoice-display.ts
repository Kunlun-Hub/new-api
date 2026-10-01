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
import type { TFunction } from 'i18next'

import type { InvoiceRecord, InvoiceStatus } from '../types'
import { invoiceProjectLabel } from './invoice'

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; dotClass: string }
> = {
  approved: { label: 'Approved', dotClass: 'bg-green-500' },
  invoicing: { label: 'Invoicing', dotClass: 'bg-amber-500' },
  pending: { label: 'Pending review', dotClass: 'bg-amber-500' },
  rejected: { label: 'Rejected', dotClass: 'bg-red-500' },
  red_flushing: { label: 'Red-flushing', dotClass: 'bg-orange-500' },
}

export function invoiceStatusMeta(status: string) {
  return (
    INVOICE_STATUS_META[status as InvoiceStatus] ?? {
      label: 'Unknown',
      dotClass: 'bg-muted-foreground',
    }
  )
}

/** 复制开票信息（与参考站「复制信息」一致的多行文本） */
export function formatInvoiceCopyText(
  invoice: InvoiceRecord,
  t: TFunction,
  formatMoney: (amount: number) => string
): string {
  const lines: Array<{ label: string; value: string }> = [
    {
      label: t('Invoice type'),
      value:
        invoice.type === 'special'
          ? t('VAT special invoice')
          : t('VAT ordinary invoice'),
    },
    { label: t('Invoice title'), value: invoice.title },
    {
      label: t('Taxpayer identification number'),
      value:
        Number(invoice.tax_id) === 0
          ? t('Individual (no tax ID)')
          : invoice.tax_id,
    },
    { label: t('Invoice amount'), value: formatMoney(invoice.amount) },
    {
      label: t('Item name'),
      value: invoiceProjectLabel(invoice.project_type) || '-',
    },
  ]
  if (invoice.type === 'special') {
    if (invoice.buyer_bank_account) {
      lines.push({
        label: t('Bank and account number'),
        value: invoice.buyer_bank_account,
      })
    }
    if (invoice.buyer_tel) {
      lines.push({ label: t('Phone'), value: invoice.buyer_tel })
    }
    if (invoice.buyer_addr) {
      lines.push({ label: t('Address'), value: invoice.buyer_addr })
    }
  }
  if (invoice.invoice_no) {
    lines.push({ label: t('Invoice number'), value: invoice.invoice_no })
  }
  if (invoice.red_invoice_no) {
    lines.push({
      label: t('Red invoice number'),
      value: invoice.red_invoice_no,
    })
  }
  if (invoice.orders && invoice.orders.length > 0) {
    lines.push({
      label: t('Invoice details'),
      value: invoice.orders
        .map((order) => `${order.trade_no} · ${formatMoney(order.money)}`)
        .join('\n'),
    })
  }
  if (invoice.content) {
    lines.push({ label: t('Remark'), value: invoice.content })
  }
  return lines
    .map((line) =>
      line.value.includes('\n')
        ? `${line.label}：\n${line.value}`
        : `${line.label}：${line.value}`
    )
    .join('\n')
}
