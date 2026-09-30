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
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type TicketCategory = 'billing' | 'technical' | 'account' | 'other'

export interface Ticket {
  id: number
  user_id: number
  title: string
  category: string
  priority: string
  status: TicketStatus
  created_at: number
  updated_at: number
}

export interface TicketReply {
  id: number
  ticket_id: number
  user_id: number
  is_staff: boolean
  content: string
  created_at: number
}

export interface TicketDetail {
  ticket: Ticket
  replies: TicketReply[]
}

export interface TicketPage {
  page: number
  page_size: number
  total: number
  items: Ticket[]
}
