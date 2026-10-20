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
import i18next from 'i18next'
import { useState, useCallback } from 'react'

import { handleServerError } from '@/lib/handle-server-error'

import { requestWechatPayment, isApiSuccess } from '../api'
import { PAYMENT_TYPES } from '../constants'
import type { QrPaymentOrder } from '../types'

/**
 * Hook for the native WeChat Pay gateway (API v3 Native QR code).
 * The pending order stays in state until the async notify credits the top-up.
 */
export function useWechatPayment() {
  const [processing, setProcessing] = useState(false)
  const [order, setOrder] = useState<QrPaymentOrder | null>(null)

  const processWechatPayment = useCallback(async (topupAmount: number) => {
    setProcessing(true)

    try {
      const response = await requestWechatPayment({
        amount: Math.floor(topupAmount),
        payment_method: PAYMENT_TYPES.WECHAT_OFFICIAL,
      })

      if (isApiSuccess(response) && response.data?.qr_code) {
        setOrder({
          tradeNo: response.data.trade_no,
          qrCode: response.data.qr_code,
        })
        return true
      }

      handleServerError(response, i18next.t('Payment request failed'))
      return false
    } catch (error) {
      handleServerError(error, i18next.t('Payment request failed'))
      return false
    } finally {
      setProcessing(false)
    }
  }, [])

  const closeWechatOrder = useCallback(() => {
    setOrder(null)
  }, [])

  return { processing, order, processWechatPayment, closeWechatOrder }
}
