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
import {
  INVOICE_PROJECT_LABELS,
  type InvoiceApplicationPayload,
  type InvoiceTitleType,
  type InvoiceType,
} from '../types'

export type InvoiceFormValue = {
  type: InvoiceType
  buyerKind: InvoiceTitleType
  title: string
  taxId: string
  projectType: number
  content: string
  buyerBankAccount: string
  buyerTel: string
  buyerAddr: string
}

export function createEmptyInvoiceForm(): InvoiceFormValue {
  return {
    type: 'normal',
    buyerKind: 'company',
    title: '',
    taxId: '',
    projectType: 0,
    content: '',
    buyerBankAccount: '',
    buyerTel: '',
    buyerAddr: '',
  }
}

/** 将表单值转换为接口载荷（个人抬头税号固定为 0，专票额外信息仅专票携带） */
export function invoiceFormToPayload(
  value: InvoiceFormValue
): InvoiceApplicationPayload {
  const isPersonal = value.buyerKind === 'personal'
  const isSpecial = value.type === 'special'
  return {
    type: value.type,
    title_type: value.buyerKind,
    title: value.title.trim(),
    tax_id: isPersonal ? '0' : value.taxId.trim(),
    project_type: value.projectType,
    content: value.content.trim(),
    buyer_addr: isSpecial ? value.buyerAddr.trim() : '',
    buyer_tel: isSpecial ? value.buyerTel.trim() : '',
    buyer_bank_account: isSpecial ? value.buyerBankAccount.trim() : '',
  }
}

export function invoiceProjectLabel(projectType?: number): string {
  if (projectType === undefined || projectType === null) return ''
  return INVOICE_PROJECT_LABELS[projectType] ?? ''
}

/** 记录在本地的开票抬头信息，下次申请时自动带出 */
export const INVOICE_COMPANY_STORAGE_KEY = 'invoice_company'
