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
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import type {
  AdminCreateInvoicePayload,
  InvoiceAmountStats,
  InvoiceApplicationPayload,
  InvoiceEligibility,
  InvoiceListResponse,
  InvoiceRecord,
  InvoiceStatus,
} from './types'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export async function getInvoiceEligibility(
  orderIds?: number[]
): Promise<InvoiceEligibility> {
  const params = new URLSearchParams()
  if (orderIds && orderIds.length > 0) {
    params.set('order_ids', orderIds.join(','))
  }
  const query = params.toString()
  const res = await api.get<ApiResponse<InvoiceEligibility>>(
    `/api/invoice/eligible${query ? `?${query}` : ''}`
  )
  return requireServerSuccess(res.data).data
}

export async function getUserInvoices(
  page: number,
  pageSize: number
): Promise<InvoiceListResponse> {
  const params = new URLSearchParams({
    p: page.toString(),
    page_size: pageSize.toString(),
  })
  const res = await api.get<ApiResponse<InvoiceListResponse>>(
    `/api/invoice?${params.toString()}`
  )
  return requireServerSuccess(res.data).data
}

export async function getAllInvoices(options: {
  page: number
  pageSize: number
  userId?: string
  keyword?: string
  status?: string
}): Promise<InvoiceListResponse> {
  const params = new URLSearchParams({
    p: options.page.toString(),
    page_size: options.pageSize.toString(),
  })
  if (options.userId) params.set('user_id', options.userId)
  if (options.keyword) params.set('keyword', options.keyword)
  if (options.status && options.status !== 'all') {
    params.set('status', options.status)
  }
  const res = await api.get<ApiResponse<InvoiceListResponse>>(
    `/api/invoice/admin?${params.toString()}`
  )
  return requireServerSuccess(res.data).data
}

export async function applyInvoice(
  payload: InvoiceApplicationPayload
): Promise<InvoiceRecord> {
  const res = await api.post<ApiResponse<InvoiceRecord>>(
    '/api/invoice',
    payload
  )
  return requireServerSuccess(res.data).data
}

export async function createInvoiceByAdmin(
  payload: AdminCreateInvoicePayload
): Promise<InvoiceRecord> {
  const res = await api.post<ApiResponse<InvoiceRecord>>(
    '/api/invoice/admin',
    payload
  )
  return requireServerSuccess(res.data).data
}

export async function updateInvoiceStatus(
  id: number,
  status: InvoiceStatus,
  reason?: string
): Promise<void> {
  const res = await api.put<ApiResponse<null>>(`/api/invoice/admin/${id}`, {
    status,
    reason,
  })
  requireServerSuccess(res.data)
}

export async function updateInvoiceInfo(
  id: number,
  payload: InvoiceApplicationPayload
): Promise<void> {
  const res = await api.put<ApiResponse<null>>(
    `/api/invoice/admin/${id}/info`,
    payload
  )
  requireServerSuccess(res.data)
}

export async function batchInvoicing(ids: number[]): Promise<number> {
  const res = await api.put<ApiResponse<{ updated: number }>>(
    '/api/invoice/invoicing',
    { ids }
  )
  return requireServerSuccess(res.data).data?.updated ?? 0
}

export async function getInvoiceAmountStats(
  startTime: number,
  endTime: number
): Promise<InvoiceAmountStats> {
  const params = new URLSearchParams({
    start_time: startTime.toString(),
    end_time: endTime.toString(),
  })
  const res = await api.get<ApiResponse<InvoiceAmountStats>>(
    `/api/invoice/amount?${params.toString()}`
  )
  return requireServerSuccess(res.data).data
}

export async function deleteInvoice(id: number): Promise<void> {
  const res = await api.delete<ApiResponse<null>>(`/api/invoice/${id}`)
  requireServerSuccess(res.data)
}

export async function markTopUpInvoiced(id: number): Promise<void> {
  const res = await api.put<ApiResponse<null>>('/api/user/topup/invoice', {
    id,
    is_invoiced: true,
  })
  requireServerSuccess(res.data)
}

export async function batchMarkTopUpInvoiced(ids: number[]): Promise<number> {
  const res = await api.put<ApiResponse<{ updated: number }>>(
    '/api/user/topup/invoice/batch',
    { ids, is_invoiced: true }
  )
  return requireServerSuccess(res.data).data?.updated ?? 0
}

export async function clearInvalidTopUps(hour = 48): Promise<number> {
  const res = await api.delete<ApiResponse<{ deleted: number }>>(
    `/api/user/topup/clear?hour=${hour}`
  )
  return requireServerSuccess(res.data).data?.deleted ?? 0
}
