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
import { Textarea } from '@/components/ui/textarea'
import { handleServerError } from '@/lib/handle-server-error'

import { updateInvoiceStatus } from '../api'
import type { InvoiceRecord } from '../types'

type InvoiceRejectDialogProps = {
  invoice: InvoiceRecord | null
  onOpenChange: (open: boolean) => void
  onRejected: () => void
}

export function InvoiceRejectDialog({
  invoice,
  onOpenChange,
  onRejected,
}: InvoiceRejectDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (invoice) setReason('')
  }, [invoice])

  const handleReject = async () => {
    if (!invoice) return
    setSubmitting(true)
    try {
      await updateInvoiceStatus(
        invoice.id,
        'rejected',
        reason.trim() || t('Does not meet the invoicing requirements')
      )
      toast.success(t('Invoice rejected'))
      onOpenChange(false)
      onRejected()
    } catch (error) {
      handleServerError(error, t('Failed to update invoice status'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Reject application')}</DialogTitle>
          <DialogDescription>
            {t(
              'The reject reason will be visible to the user on their invoice record.'
            )}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder={t('Enter the reject reason')}
        />
        <DialogFooter>
          <Button
            variant='secondary'
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant='destructive'
            disabled={submitting}
            onClick={handleReject}
          >
            {submitting && <Spinner data-icon='inline-start' />}
            {t('Reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
