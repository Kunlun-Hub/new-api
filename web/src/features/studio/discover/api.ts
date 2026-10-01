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

import type {
  StudioShareArtwork,
  StudioShareKind,
  StudioShareItem,
  StudioSharePage,
} from './types'

export const STUDIO_SHARE_PAGE_SIZE = 24

/** Discover gallery: published works of the whole community. */
export async function getStudioShares(
  kind: StudioShareKind | undefined,
  cursor: string,
  includePending: boolean
): Promise<{ success: boolean; message?: string; data: StudioSharePage }> {
  const res = await api.get('/api/studio/share', {
    params: {
      cursor,
      ...(kind ? { kind } : {}),
      page_size: STUDIO_SHARE_PAGE_SIZE,
      ...(includePending ? { include_pending: 1 } : {}),
    },
  })
  return res.data
}

/** The caller's own submissions, pending ones included. */
export async function getMyStudioShares(
  kind: StudioShareKind,
  cursor: string
): Promise<{ success: boolean; message?: string; data: StudioSharePage }> {
  const res = await api.get('/api/studio/share/self', {
    params: { cursor, kind, page_size: STUDIO_SHARE_PAGE_SIZE },
  })
  return res.data
}

export async function getStudioShare(
  id: number
): Promise<{ success: boolean; message?: string; data: StudioShareItem }> {
  const res = await api.get(`/api/studio/share/${id}`)
  return res.data
}

export async function submitStudioShare(
  kind: StudioShareKind,
  data: StudioShareArtwork
): Promise<{ success: boolean; message?: string; data: StudioShareItem }> {
  const res = await api.post('/api/studio/share', { kind, data })
  return res.data
}

export async function deleteStudioShare(id: number) {
  const res = await api.delete(`/api/studio/share/${id}`)
  return res.data
}

export async function approveStudioShare(
  id: number
): Promise<{ success: boolean; message?: string; data: StudioShareItem }> {
  const res = await api.post(`/api/studio/share/${id}/approve`)
  return res.data
}

/** Stores media the gallery cannot load from its original address. */
export async function uploadStudioShareMedia(
  file: Blob,
  fileName: string
): Promise<{ success: boolean; message?: string; data: { url: string } }> {
  const form = new FormData()
  form.append('file', file, fileName)
  const res = await api.post('/api/studio/share/media', form)
  return res.data
}
