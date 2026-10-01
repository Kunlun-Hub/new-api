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
export type InvoiceType = 'normal' | 'special'

export type InvoiceTitleType = 'company' | 'personal'

export type InvoiceStatus =
  | 'pending'
  | 'invoicing'
  | 'approved'
  | 'rejected'
  | 'red_flushing'

/** 开票项目名称（与参考站一致） */
export const INVOICE_PROJECT_TYPES = [
  { value: 1, label: '*生产生活服务*信息系统服务' },
  { value: 0, label: '*生产生活服务*信息技术服务费' },
  { value: 3, label: '*生产生活服务*API技术服务' },
  { value: 4, label: '*生产生活服务*技术服务' },
  { value: 2, label: '*生产生活服务*软件测试服务' },
] as const

export const INVOICE_PROJECT_LABELS: Record<number, string> = {
  0: '*生产生活服务*信息技术服务费',
  1: '*生产生活服务*信息系统服务',
  2: '*生产生活服务*软件测试服务',
  3: '*生产生活服务*API技术服务',
  4: '*生产生活服务*技术服务',
}

export interface InvoiceOrderItem {
  id: number
  invoice_id: number
  trade_no: string
  amount: number
  money: number
}

export interface InvoiceRecord {
  id: number
  user_id: number
  username: string
  type: InvoiceType
  title_type: InvoiceTitleType
  title: string
  tax_id: string
  project_type: number
  content: string
  remark: string
  buyer_bank_account: string
  buyer_tel: string
  buyer_addr: string
  amount: number
  trade_nos: string
  status: InvoiceStatus
  reason: string
  file_url: string
  invoice_no: string
  red_invoice_no: string
  created_at: number
  updated_at: number
  orders?: InvoiceOrderItem[]
}

export interface InvoiceEligibility {
  amount: number
  min_amount: number
  can_apply: boolean
  invoiceable_amount: number
  pending_count: number
  rejected_count: number
}

export interface InvoiceApplicationPayload {
  trade_nos?: string[]
  order_ids?: number[]
  type: InvoiceType
  title_type: InvoiceTitleType
  title: string
  tax_id?: string
  project_type?: number
  content?: string
  remark?: string
  buyer_bank_account?: string
  buyer_tel?: string
  buyer_addr?: string
}

export interface AdminCreateInvoicePayload extends InvoiceApplicationPayload {
  user_id: number
  amount: number
}

export interface InvoiceListResponse {
  items: InvoiceRecord[]
  total: number
}

export interface InvoiceAmountStats {
  count: number
  total_amount: number
}
