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
import { Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'

import { getUserBillingHistory } from '../../api'
import type { QrPaymentOrder } from '../../types'

interface QrPaymentDialogProps {
  order: QrPaymentOrder | null
  title: string
  description: string
  qrCodeTitle: string
  onOpenChange: (open: boolean) => void
  onPaid: () => void
  /** 主动向支付网关查单，用于「我已支付」按钮补单；未提供时仅查本地订单。 */
  checkOrder?: (tradeNo: string) => Promise<boolean>
}

export function QrPaymentDialog(props: QrPaymentDialogProps) {
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const { order, checkOrder, onPaid } = props

  const checkStatus = useCallback(
    async (manual: boolean) => {
      if (!order) {
        return
      }
      setChecking(true)
      try {
        if (manual && checkOrder) {
          const paid = await checkOrder(order.tradeNo)
          if (paid) {
            toast.success(t('Payment successful'))
            onPaid()
            return
          }
        }
        const response = await getUserBillingHistory(1, 1, order.tradeNo)
        const record = response.data?.items?.[0]
        if (record?.trade_no === order.tradeNo && record.status === 'success') {
          toast.success(t('Payment successful'))
          onPaid()
          return
        }
        if (manual) {
          toast.info(t('Payment not received yet'))
        }
      } catch {
        if (manual) {
          toast.error(t('Failed to check payment status'))
        }
      } finally {
        setChecking(false)
      }
    },
    [checkOrder, onPaid, order, t]
  )

  useEffect(() => {
    if (!order) {
      return
    }
    const timer = window.setInterval(() => {
      void checkStatus(false)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [order, checkStatus])

  return (
    <Dialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) {
          props.onOpenChange(false)
        }
      }}
      title={props.title}
      description={props.description}
      contentClassName='sm:max-w-sm'
      footer={
        <>
          <Button
            variant='outline'
            onClick={() => props.onOpenChange(false)}
            disabled={checking}
          >
            {t('Cancel')}
          </Button>
          <Button onClick={() => void checkStatus(true)} disabled={checking}>
            {checking && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {t('I have paid')}
          </Button>
        </>
      }
    >
      <div className='flex flex-col items-center gap-4 py-2'>
        {order ? (
          <div className='rounded-lg border bg-white p-3'>
            <QRCodeSVG
              value={order.qrCode}
              size={208}
              title={props.qrCodeTitle}
            />
          </div>
        ) : null}
        <p className='text-muted-foreground text-center text-sm'>
          {t('Waiting for payment confirmation...')}
        </p>
        {order ? (
          <code className='text-muted-foreground text-xs'>{order.tradeNo}</code>
        ) : null}
      </div>
    </Dialog>
  )
}
