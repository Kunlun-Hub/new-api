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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { handleServerError } from '@/lib/handle-server-error'

import { updateInvoiceInfo } from '../api'
import {
  createEmptyInvoiceForm,
  invoiceFormToPayload,
  type InvoiceFormValue,
} from '../lib/invoice'
import type { InvoiceRecord } from '../types'
import { InvoiceForm } from './invoice-form'

type InvoiceEditDialogProps = {
  invoice: InvoiceRecord | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function InvoiceEditDialog({
  invoice,
  onOpenChange,
  onSaved,
}: InvoiceEditDialogProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<InvoiceFormValue>(createEmptyInvoiceForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!invoice) return
    setForm({
      type: invoice.type,
      buyerKind: invoice.title_type,
      title: invoice.title ?? '',
      taxId: Number(invoice.tax_id) === 0 ? '' : (invoice.tax_id ?? ''),
      projectType: invoice.project_type ?? 0,
      content: invoice.content ?? '',
      buyerBankAccount: invoice.buyer_bank_account ?? '',
      buyerTel: invoice.buyer_tel ?? '',
      buyerAddr: invoice.buyer_addr ?? '',
    })
  }, [invoice])

  const handleSave = async () => {
    if (!invoice) return
    if (!form.title.trim()) {
      toast.error(t('Please fill in the invoice title'))
      return
    }
    if (form.buyerKind === 'company' && !form.taxId.trim()) {
      toast.error(t('Please fill in the tax identification number'))
      return
    }
    setSaving(true)
    try {
      await updateInvoiceInfo(invoice.id, invoiceFormToPayload(form))
      toast.success(t('Invoice information updated'))
      onOpenChange(false)
      onSaved()
    } catch (error) {
      handleServerError(error, t('Failed to save invoice information'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto p-6 sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('Edit invoice information')}</DialogTitle>
          <DialogDescription>
            {t(
              'Only pending invoices can be edited. The new information will be used to issue the invoice.'
            )}
          </DialogDescription>
        </DialogHeader>
        <InvoiceForm
          value={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        />
        <DialogFooter>
          <Button
            variant='secondary'
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving && <Spinner data-icon='inline-start' />}
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
