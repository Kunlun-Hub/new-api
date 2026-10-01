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
import { useEffect, useState } from 'react'

import { fetchTokenKey } from '@/features/keys/api'

import type { StudioGeneration } from '../lib/generations'

const objectUrls = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

/** Gateway media endpoints require the token header; static files do not. */
function needsAuthorization(url: string) {
  // Share media is addressed by a random capability name and is public.
  if (url.startsWith('/api/studio/share/media/')) return false
  return url.startsWith('/v1/') || url.startsWith('/api/')
}

async function loadAuthorizedMedia(item: StudioGeneration, url: string) {
  const cached = objectUrls.get(url)
  if (cached) return cached
  const existing = inflight.get(url)
  if (existing) return existing
  const promise = (async () => {
    if (!item.tokenId) throw new Error('missing token')
    const keyRes = await fetchTokenKey(item.tokenId)
    const key = keyRes.data?.key
    if (!key) throw new Error(keyRes.message || 'missing token key')
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`media request failed: ${res.status}`)
    const objectUrl = URL.createObjectURL(await res.blob())
    objectUrls.set(url, objectUrl)
    return objectUrl
  })().finally(() => {
    inflight.delete(url)
  })
  inflight.set(url, promise)
  return promise
}

/**
 * Resolves the media source of a stored artwork.
 *
 * Absolute URLs (provider CDN, data or blob URLs) are used as is; relative
 * gateway paths are re-fetched with the token that created the artwork.
 */
export function useArtworkMediaSrc(item: StudioGeneration) {
  const url = item.url
  const [src, setSrc] = useState<string | undefined>(() =>
    url && !needsAuthorization(url) ? url : undefined
  )

  useEffect(() => {
    if (!url) {
      setSrc(undefined)
      return
    }
    if (!needsAuthorization(url)) {
      setSrc(url)
      return
    }
    let cancelled = false
    loadAuthorizedMedia(item, url)
      .then((resolved) => {
        if (!cancelled) setSrc(resolved)
      })
      .catch(() => {
        if (!cancelled) setSrc(undefined)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, item.tokenId])

  return src
}
