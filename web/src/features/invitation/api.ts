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
  AffiliateLogItem,
  InviteStatus,
  PagedRecords,
  WithdrawalRecord,
} from './types'

interface ServerResponse<T> {
  success: boolean
  message?: string
  data: T
}

export async function getInviteStatus(): Promise<InviteStatus> {
  const res = await api.get<ServerResponse<InviteStatus>>(
    '/api/user/invite/status'
  )
  return requireServerSuccess(res.data)?.data
}

export async function getAffiliateLogs(
  page: number,
  pageSize: number,
  all: boolean
): Promise<PagedRecords<AffiliateLogItem>> {
  const params = new URLSearchParams({
    p: page.toString(),
    page_size: pageSize.toString(),
  })
  const res = await api.get<ServerResponse<PagedRecords<AffiliateLogItem>>>(
    `${all ? '/api/afflog' : '/api/afflog/self'}?${params.toString()}`
  )
  return (
    requireServerSuccess(res.data)?.data ?? {
      page,
      page_size: pageSize,
      total: 0,
      items: [],
    }
  )
}

export async function transferAffiliateQuota(quota: number): Promise<void> {
  const res = await api.post('/api/user/aff_transfer', { quota })
  requireServerSuccess(res.data)
}

export async function getWithdrawals(
  page: number,
  pageSize: number,
  all: boolean
): Promise<PagedRecords<WithdrawalRecord>> {
  const params = new URLSearchParams({
    p: page.toString(),
    page_size: pageSize.toString(),
  })
  const res = await api.get<ServerResponse<PagedRecords<WithdrawalRecord>>>(
    `${all ? '/api/withdrawal' : '/api/withdrawal/self'}?${params.toString()}`
  )
  return (
    requireServerSuccess(res.data)?.data ?? {
      page,
      page_size: pageSize,
      total: 0,
      items: [],
    }
  )
}

export async function applyWithdrawal(payload: {
  amount: number
  real_name: string
  account: string
}): Promise<void> {
  const res = await api.post('/api/withdrawal/self', payload)
  requireServerSuccess(res.data)
}

export async function updateWithdrawalStatus(
  id: number,
  status: number
): Promise<void> {
  const res = await api.put('/api/withdrawal', { id, status })
  requireServerSuccess(res.data)
}
