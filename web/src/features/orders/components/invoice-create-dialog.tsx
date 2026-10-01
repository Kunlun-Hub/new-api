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

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { handleServerError } from '@/lib/handle-server-error'

import { createInvoiceByAdmin } from '../api'
import {
  createEmptyInvoiceForm,
  invoiceFormToPayload,
  type InvoiceFormValue,
} from '../lib/invoice'
import { InvoiceForm } from './invoice-form'

type InvoiceCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function InvoiceCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: InvoiceCreateDialogProps) {
  const { t } = useTranslation()
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [form, setForm] = useState<InvoiceFormValue>(createEmptyInvoiceForm)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    const parsedUserId = Number(userId)
    if (!parsedUserId || parsedUserId <= 0) {
      toast.error(t('Please fill in the related user ID'))
      return
    }
    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error(t('The invoice amount must be greater than 0'))
      return
    }
    if (Math.round(parsedAmount * 100) !== parsedAmount * 100) {
      toast.error(t('The invoice amount supports at most two decimals'))
      return
    }
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
      await createInvoiceByAdmin({
        ...invoiceFormToPayload(form),
        user_id: parsedUserId,
        amount: parsedAmount,
      })
      toast.success(t('Invoice created'))
      onOpenChange(false)
      setUserId('')
      setAmount('')
      setForm(createEmptyInvoiceForm())
      onCreated()
    } catch (error) {
      handleServerError(error, t('Failed to create invoice'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto p-6 sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('Create invoice')}</DialogTitle>
          <DialogDescription>
            {t(
              'Administrators can create an invoice manually, for example for bank transfers without an order.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field>
              <FieldTitle>
                {t('Related user ID')}
                <span className='text-red-500'>*</span>
              </FieldTitle>
              <Input
                type='number'
                min={1}
                step={1}
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder={t('Platform user ID')}
                autoComplete='off'
              />
            </Field>
            <Field>
              <FieldTitle>
                {t('Invoice amount')}
                <span className='text-red-500'>*</span>
              </FieldTitle>
              <Input
                type='number'
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={t('Enter the invoice amount manually')}
                autoComplete='off'
              />
            </Field>
          </div>
          <InvoiceForm
            value={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
        </div>
        <DialogFooter>
          <Button
            variant='secondary'
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button disabled={saving} onClick={handleCreate}>
            {saving && <Spinner data-icon='inline-start' />}
            {t('Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
