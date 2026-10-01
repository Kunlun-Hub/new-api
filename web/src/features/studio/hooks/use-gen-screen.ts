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
import { useCallback, useMemo, useRef, useState } from 'react'

import {
  useGenerations,
  type StudioGeneration,
  type StudioGenerationKind,
} from '../lib/generations'
import { isSharedArtwork } from '../lib/shares'

export type StudioGalleryTab = 'history' | 'favorites' | 'mine'

/**
 * Gallery state shared by the studio image and video screens.
 *
 * Mirrors the reference hook: one tab per source, a viewer id with previous /
 * next navigation, and the scroll container the masonry virtualizes against.
 */
export function useGenScreen(kind: StudioGenerationKind) {
  const all = useGenerations()
  const [tab, setTab] = useState<StudioGalleryTab>('history')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  /** Artworks this browser generated; mirrored submissions stay out. */
  const owned = useMemo(
    () =>
      (all ?? []).filter(
        (item) => item.kind === kind && !isSharedArtwork(item)
      ),
    [all, kind]
  )

  const ofKind = useMemo(
    () => (all ?? []).filter((item) => item.kind === kind),
    [all, kind]
  )

  const filtered = useMemo(() => {
    if (tab === 'favorites') return ofKind.filter((item) => item.favorite)
    if (tab === 'mine') return []
    return owned
  }, [ofKind, owned, tab])

  const playable = useMemo(
    () => filtered.filter((item) => item.status === 'done' && item.url),
    [filtered]
  )

  const viewing = viewingId
    ? ofKind.find((item) => item.id === viewingId)
    : undefined
  const index = viewing
    ? playable.findIndex((item) => item.id === viewing.id)
    : -1

  const onPrev = useCallback(() => {
    if (index <= 0) return
    setViewingId(playable[index - 1].id)
  }, [index, playable])

  const onNext = useCallback(() => {
    if (index < 0 || index >= playable.length - 1) return
    setViewingId(playable[index + 1].id)
  }, [index, playable])

  const closeViewer = useCallback(() => setViewingId(null), [])

  return {
    /** Artworks generated in this browser, newest first. */
    items: owned,
    /** Artworks currently visible for the active tab. */
    filtered,
    /** True while the gallery shows the author's submissions instead. */
    showShares: tab === 'mine',
    tab,
    setTab,
    viewing,
    openViewer: setViewingId,
    closeViewer,
    onPrev,
    onNext,
    hasPrev: index > 0,
    hasNext: index >= 0 && index < playable.length - 1,
    hasArtworks: owned.length > 0,
    scrollRef,
    loaded: all !== null,
  }
}

export type { StudioGeneration }
