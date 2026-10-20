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

import { requestAlipayPayment, isApiSuccess } from '../api'
import { PAYMENT_TYPES } from '../constants'
import type { QrPaymentOrder } from '../types'

/**
 * Hook for handling the native Alipay gateway (official precreate QR code).
 * The pending order is kept in state so the wallet page can render the QR
 * dialog until the asynchronous notify credits the top-up.
 */
export function useAlipayPayment() {
  const [processing, setProcessing] = useState(false)
  const [order, setOrder] = useState<QrPaymentOrder | null>(null)

  const processAlipayPayment = useCallback(async (topupAmount: number) => {
    setProcessing(true)

    try {
      const response = await requestAlipayPayment({
        amount: Math.floor(topupAmount),
        payment_method: PAYMENT_TYPES.ALIPAY_OFFICIAL,
      })

      if (isApiSuccess(response) && response.data?.pay_url) {
        // 电脑网站支付：跳转到支付宝收银台，支付完成后由 return_url 回到钱包页。
        window.location.assign(response.data.pay_url)
        return true
      }

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

  const closeAlipayOrder = useCallback(() => {
    setOrder(null)
  }, [])

  return { processing, order, processAlipayPayment, closeAlipayOrder }
}
