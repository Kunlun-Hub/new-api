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
along with this program. If not, see <http://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useCallback, useEffect, useRef } from 'react'

import {
  getGeneration,
  updateGeneration,
  useGenerations,
} from '../lib/generations'
import {
  generateStudioVideoCover,
  studioVideoHeaders,
} from '../lib/studio-upload'
import {
  clearedVideoCoverRetryState,
  videoCoverNextAttemptAt,
  videoCoverRetryDecision,
} from '../lib/video-cover-retry'

/** At most this many cover attempts run per session, like the reference. */
const VIDEO_COVER_ATTEMPT_BUDGET = 4

/** Yields to the browser so cover work never blocks rendering. */
function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 3000 })
      return
    }
    window.setTimeout(resolve, 750)
  })
}

/**
 * Retries the poster frame of finished videos that are still missing one.
 *
 * The reference queues them the same way: while the gallery renders, up to
 * four pending covers are picked up, generated one at a time during idle
 * time, and failures are rescheduled with a per-error backoff until the
 * record is disabled.
 */
export function useVideoCoverRetry() {
  const artworks = useGenerations()
  const queue = useRef(new Map<string, string>())
  const running = useRef(false)
  const attempts = useRef(0)

  const drain = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      await whenIdle()
      while (queue.current.size > 0) {
        const next = queue.current.entries().next().value
        if (!next) break
        const [id, url] = next
        queue.current.delete(id)
        let attemptCount: number | undefined
        let attemptedAt: number | undefined
        try {
          const item = getGeneration(id)
          const nextAttemptAt = item ? videoCoverNextAttemptAt(item) : undefined
          if (
            !item ||
            item.kind !== 'video' ||
            item.status !== 'done' ||
            !item.url ||
            item.coverUrl ||
            item.url !== url ||
            item.coverRetryDisabled
          ) {
            continue
          }
          if (nextAttemptAt != null && Date.now() < nextAttemptAt) continue
          attempts.current += 1
          attemptCount = (item.coverAttemptCount ?? 0) + 1
          attemptedAt = Date.now()
          await updateGeneration(id, {
            coverAttemptedAt: attemptedAt,
            coverAttemptCount: attemptCount,
            coverLastErrorCode: undefined,
          })
          const headers = await studioVideoHeaders(url, item.tokenId)
          const result = await generateStudioVideoCover(url, { headers })
          await updateGeneration(id, {
            coverUrl: result.coverUrl,
            ...(result.url ? { url: result.url } : {}),
            ...clearedVideoCoverRetryState(),
          })
        } catch (error) {
          if (attemptCount == null || attemptedAt == null) continue
          const item = getGeneration(id)
          if (item?.status !== 'done' || item.url !== url || item.coverUrl) {
            continue
          }
          const decision = videoCoverRetryDecision(error, attemptCount)
          await updateGeneration(id, {
            coverAttemptedAt: attemptedAt,
            coverAttemptCount: attemptCount,
            coverNextAttemptAt: decision.delayMs
              ? Date.now() + decision.delayMs
              : undefined,
            coverRetryDisabled: decision.disabled || undefined,
            coverLastErrorCode: decision.code,
          })
        }
      }
    } finally {
      running.current = false
    }
  }, [])

  useEffect(() => {
    const items = artworks ?? []
    const now = Date.now()
    for (const item of items) {
      if (attempts.current + queue.current.size >= VIDEO_COVER_ATTEMPT_BUDGET) {
        break
      }
      if (
        item.kind !== 'video' ||
        item.status !== 'done' ||
        !item.url ||
        item.coverUrl ||
        item.coverRetryDisabled
      ) {
        continue
      }
      const nextAttemptAt = videoCoverNextAttemptAt(item)
      if (nextAttemptAt != null && now < nextAttemptAt) continue
      if (!queue.current.has(item.id)) {
        queue.current.set(item.id, item.url)
      }
    }
    if (queue.current.size > 0) {
      void drain()
    }
  }, [artworks, drain])
}
