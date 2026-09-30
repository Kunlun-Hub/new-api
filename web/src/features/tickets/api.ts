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

import type { Ticket, TicketDetail, TicketPage, TicketReply } from './types'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export async function listTickets(
  status: string,
  page: number,
  pageSize: number
): Promise<TicketPage> {
  const res = await api.get<ApiResponse<TicketPage>>(
    `/api/ticket${query({ status, p: page, page_size: pageSize })}`
  )
  return res.data.data
}

export async function createTicket(input: {
  title: string
  category: string
  content: string
}): Promise<Ticket> {
  const res = await api.post<ApiResponse<Ticket>>('/api/ticket', input)
  return res.data.data
}

export async function getTicketDetail(id: number): Promise<TicketDetail> {
  const res = await api.get<ApiResponse<TicketDetail>>(`/api/ticket/${id}`)
  return res.data.data
}

export async function replyTicket(
  id: number,
  content: string
): Promise<TicketReply> {
  const res = await api.post<ApiResponse<TicketReply>>(
    `/api/ticket/${id}/reply`,
    { content }
  )
  return res.data.data
}

export async function closeTicket(id: number): Promise<Ticket> {
  const res = await api.post<ApiResponse<Ticket>>(`/api/ticket/${id}/close`)
  return res.data.data
}

export async function adminListTickets(
  status: string,
  page: number,
  pageSize: number
): Promise<TicketPage> {
  const res = await api.get<ApiResponse<TicketPage>>(
    `/api/ticket/admin${query({ status, p: page, page_size: pageSize })}`
  )
  return res.data.data
}

export async function adminGetTicket(id: number): Promise<TicketDetail> {
  const res = await api.get<ApiResponse<TicketDetail>>(
    `/api/ticket/admin/${id}`
  )
  return res.data.data
}

export async function adminReplyTicket(
  id: number,
  content: string
): Promise<TicketReply> {
  const res = await api.post<ApiResponse<TicketReply>>(
    `/api/ticket/admin/${id}/reply`,
    { content }
  )
  return res.data.data
}

export async function adminUpdateTicket(
  id: number,
  input: { status?: string; priority?: string }
): Promise<Ticket> {
  const res = await api.put<ApiResponse<Ticket>>(`/api/ticket/admin/${id}`, input)
  return res.data.data
}
