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

/** Content collections the backend can publish. */
export type SiteContentKind =
  | 'doc'
  | 'blog'
  | 'faq'
  | 'tutorial'
  | 'tutorial_category'

/** One published content record as returned by `/api/content/:kind`. */
export interface SiteContentRecord<T> {
  id: number
  kind: SiteContentKind
  slug: string
  locale: string
  title: string
  description: string
  category: string
  status: string
  sort_order: number
  published_at: number
  updated_at: number
  data: T
}

interface ContentListResponse<T> {
  success: boolean
  data: { items: SiteContentRecord<T>[] }
}

/** Fetch the published records of one content kind. */
export async function fetchSiteContent<T>(
  kind: SiteContentKind
): Promise<SiteContentRecord<T>[]> {
  const res = await api.get<ContentListResponse<T>>(`/api/content/${kind}`)
  return res.data?.data?.items ?? []
}

export interface AdminContentListResponse<T> {
  success: boolean
  data: {
    page: number
    page_size: number
    total: number
    items: SiteContentRecord<T>[]
  }
}

export interface AdminContentPayload {
  slug: string
  locale?: string
  title: string
  description?: string
  category?: string
  status?: string
  sort_order?: number
  data: unknown
  published_at?: number
}

export async function adminListContent<T>(
  kind: SiteContentKind,
  options: { page?: number; pageSize?: number; keyword?: string; status?: string }
): Promise<AdminContentListResponse<T>['data']> {
  const params = new URLSearchParams({
    p: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 20),
  })
  if (options.keyword) params.set('keyword', options.keyword)
  if (options.status && options.status !== 'all') {
    params.set('status', options.status)
  }
  const res = await api.get<AdminContentListResponse<T>>(
    `/api/content/admin/${kind}?${params.toString()}`
  )
  return res.data.data
}

export async function adminCreateContent<T>(
  kind: SiteContentKind,
  payload: AdminContentPayload
): Promise<SiteContentRecord<T>> {
  const res = await api.post<{ success: boolean; data: SiteContentRecord<T> }>(
    `/api/content/admin/${kind}`,
    payload
  )
  return res.data.data
}

export async function adminUpdateContent<T>(
  kind: SiteContentKind,
  id: number,
  payload: AdminContentPayload
): Promise<SiteContentRecord<T>> {
  const res = await api.put<{ success: boolean; data: SiteContentRecord<T> }>(
    `/api/content/admin/${kind}/${id}`,
    payload
  )
  return res.data.data
}

export async function adminDeleteContent(
  kind: SiteContentKind,
  id: number
): Promise<void> {
  await api.delete(`/api/content/admin/${kind}/${id}`)
}

export async function adminImportContent(
  kind: SiteContentKind,
  items: AdminContentPayload[]
): Promise<number> {
  const res = await api.post<{ success: boolean; data: { imported: number } }>(
    `/api/content/admin/${kind}/import`,
    { items }
  )
  return res.data.data?.imported ?? 0
}
