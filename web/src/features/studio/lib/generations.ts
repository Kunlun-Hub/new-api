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
import { useEffect, useSyncExternalStore } from 'react'

import type { StudioMjButton } from './mj-actions'
import { STUDIO_GENERATIONS_STORE, openStudioDatabase } from './studio-store'

export type StudioGenerationKind = 'image' | 'video'
export type StudioGenerationStatus = 'running' | 'done' | 'error'

export type StudioGenerationParam = string | number

/** One generated artwork kept in the visitor's browser. */
export type StudioGeneration = {
  id: string
  kind: StudioGenerationKind
  status: StudioGenerationStatus
  url?: string
  width?: number
  height?: number
  prompt: string
  model: string
  provider?: string
  schemaId?: string
  /** Submit endpoint of the artwork, shown in the viewer. */
  endpoint?: string
  params?: Record<string, StudioGenerationParam>
  values?: Record<string, string>
  tokenId?: number
  tokenName?: string
  taskId?: string
  /** Upstream reported task status, e.g. processing, SUBMITTED. */
  taskStatus?: string
  /** Action buttons of a finished Midjourney task. */
  buttons?: StudioMjButton[]
  /** Midjourney task this artwork was derived from (U/V, reroll, zoom ...). */
  mjSource?: { taskId: string; customId: string; zoom?: number }
  /** Final prompt reported by Midjourney after expanding the parameters. */
  finalPrompt?: string
  /** Upstream reported task progress in percent (0-100). */
  progress?: number
  /** Poster frame of a video artwork, when the upstream returns one. */
  coverUrl?: string
  /** Last time a cover was requested for this video. */
  coverAttemptedAt?: number
  /** Number of cover attempts made so far. */
  coverAttemptCount?: number
  /** Earliest moment the next cover attempt may run. */
  coverNextAttemptAt?: number
  /** Set when retrying cannot succeed, e.g. an unsupported source video. */
  coverRetryDisabled?: boolean
  /** Failure code of the last cover attempt, for diagnostics. */
  coverLastErrorCode?: string
  /** Reference images used to generate this artwork. */
  refImages?: string[]
  favorite?: boolean
  error?: string
  createdAt: number
  /** Set when this record mirrors a gallery submission instead of a local one. */
  sourceShareId?: number
  /** Submission created from this artwork, kept to hide the share action. */
  submittedShareId?: number
}

const listeners = new Set<() => void>()
let generations: StudioGeneration[] | null = null
let loading: Promise<void> | null = null

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot() {
  return generations
}

async function readAll(): Promise<StudioGeneration[]> {
  const database = await openStudioDatabase()
  const items = await new Promise<StudioGeneration[]>((resolve, reject) => {
    const request = database
      .transaction(STUDIO_GENERATIONS_STORE, 'readonly')
      .objectStore(STUDIO_GENERATIONS_STORE)
      .getAll()
    request.addEventListener('success', () =>
      resolve(request.result as StudioGeneration[])
    )
    request.addEventListener('error', () => reject(request.error))
  })
  return items.sort((left, right) => right.createdAt - left.createdAt)
}

async function refresh() {
  generations = await readAll()
  notify()
}

/** Loads the store once and keeps every mounted gallery in sync. */
export async function ensureGenerationsLoaded() {
  if (generations !== null) return
  if (!loading) {
    loading = refresh()
      .catch(() => {
        generations = []
        notify()
      })
      .finally(() => {
        loading = null
      })
  }
  await loading
}

/** Browser-local artworks, newest first; `null` until the store is loaded. */
export function useGenerations(): StudioGeneration[] | null {
  const value = useSyncExternalStore(subscribe, snapshot, () => null)
  useEffect(() => {
    void ensureGenerationsLoaded()
  }, [])
  return value
}

/** Reads one artwork from the current snapshot, like the reference store. */
export function getGeneration(id: string): StudioGeneration | undefined {
  return generations?.find((item) => item.id === id)
}

export function newGenerationId(kind: StudioGenerationKind) {
  return `${kind}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export async function saveGeneration(record: StudioGeneration) {
  const database = await openStudioDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STUDIO_GENERATIONS_STORE,
      'readwrite'
    )
    transaction.objectStore(STUDIO_GENERATIONS_STORE).put(record)
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('error', () => reject(transaction.error))
    transaction.addEventListener('abort', () => reject(transaction.error))
  })
  await refresh()
}

export async function updateGeneration(
  id: string,
  patch: Partial<StudioGeneration>
) {
  const database = await openStudioDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STUDIO_GENERATIONS_STORE,
      'readwrite'
    )
    const store = transaction.objectStore(STUDIO_GENERATIONS_STORE)
    const request = store.get(id)
    request.addEventListener('success', () => {
      const current = request.result as StudioGeneration | undefined
      if (current) store.put({ ...current, ...patch })
    })
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('error', () => reject(transaction.error))
    transaction.addEventListener('abort', () => reject(transaction.error))
  })
  await refresh()
}

export async function deleteGeneration(id: string) {
  const database = await openStudioDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STUDIO_GENERATIONS_STORE,
      'readwrite'
    )
    transaction.objectStore(STUDIO_GENERATIONS_STORE).delete(id)
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('error', () => reject(transaction.error))
    transaction.addEventListener('abort', () => reject(transaction.error))
  })
  await refresh()
}

export async function toggleGenerationFavorite(item: StudioGeneration) {
  await updateGeneration(item.id, { favorite: !item.favorite })
}

/** Aspect ratio used by the masonry before the media reports its own size. */
export function generationAspectRatio(item: StudioGeneration) {
  if (item.width && item.height && item.width > 0 && item.height > 0) {
    return item.width / item.height
  }
  const ratio = item.values?.aspectRatio ?? item.values?.aspect_ratio
  if (typeof ratio === 'string') {
    const [width, height] = ratio.split(':').map(Number)
    if (width > 0 && height > 0) return width / height
  }
  return item.kind === 'video' ? 16 / 9 : 1
}

/** Downloads an artwork; cross-origin media opens in a new tab instead. */
export function downloadGeneration(item: StudioGeneration) {
  if (!item.url) return
  const extension = item.kind === 'video' ? 'mp4' : 'png'
  const link = document.createElement('a')
  link.href = item.url
  link.download = `${item.id}.${extension}`
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}
