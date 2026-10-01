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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  computeMasonryLayout,
  MASONRY_GAP,
  type MasonryEntry,
} from '../lib/masonry'

const MASONRY_OVERSCAN = 1000

type StudioMasonryHelpers = {
  /** Cards report the aspect ratio measured from the real media element. */
  onAspectRatioChange: (aspectRatio: number) => void
}

type StudioMasonryProps<T extends MasonryEntry> = {
  items: T[]
  /** Scroll container that owns the gallery, used for windowing. */
  scrollElement: HTMLElement | null
  renderItem: (item: T, helpers: StudioMasonryHelpers) => ReactNode
}

/** Column count of the reference gallery: 2 / 3 / 4 by viewport width. */
function useMasonryColumns(): number {
  const [columns, setColumns] = useState(2)

  useEffect(() => {
    const medium = window.matchMedia('(min-width: 640px)')
    const large = window.matchMedia('(min-width: 1024px)')
    const update = () => {
      if (large.matches) setColumns(4)
      else if (medium.matches) setColumns(3)
      else setColumns(2)
    }
    update()
    medium.addEventListener('change', update)
    large.addEventListener('change', update)
    return () => {
      medium.removeEventListener('change', update)
      large.removeEventListener('change', update)
    }
  }, [])

  return columns
}

/**
 * Absolutely positioned masonry gallery.
 *
 * Mirrors the reference layout: cards are placed into the shortest column and
 * only the items near the viewport are mounted.
 */
export function StudioMasonry<T extends MasonryEntry>(
  props: StudioMasonryProps<T>
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const measuredHeights = useRef(new Map<string | number, number>())
  const [containerWidth, setContainerWidth] = useState(0)
  const [measuredVersion, setMeasuredVersion] = useState(0)
  const [viewport, setViewport] = useState({ top: 0, height: 0 })
  const columns = useMasonryColumns()

  const reportHeight = useCallback((id: string | number, height: number) => {
    const measured = measuredHeights.current.get(id)
    if (measured !== undefined && Math.abs(measured - height) < 0.5) return
    measuredHeights.current.set(id, height)
    setMeasuredVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    setContainerWidth(container.clientWidth)
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setContainerWidth((current) =>
        Math.abs(current - width) < 0.5 ? current : width
      )
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scrollElement = props.scrollElement
    if (!scrollElement) return

    const update = () => {
      setViewport((current) => {
        const next = {
          top: scrollElement.scrollTop,
          height: scrollElement.clientHeight,
        }
        return current.top === next.top && current.height === next.height
          ? current
          : next
      })
    }
    update()
    scrollElement.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scrollElement.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [props.scrollElement])

  const columnWidth =
    containerWidth > 0
      ? (containerWidth - MASONRY_GAP * (columns - 1)) / columns
      : 0

  const layout = useMemo(
    () =>
      computeMasonryLayout(
        props.items,
        columns,
        columnWidth,
        measuredHeights.current
      ),
    // Recompute after every measured card height update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.items, columns, columnWidth, measuredVersion]
  )

  const viewportHeight = viewport.height || layout.height
  const start = viewport.top - MASONRY_OVERSCAN
  const end = viewport.top + viewportHeight + MASONRY_OVERSCAN

  return (
    <div
      ref={containerRef}
      className='relative w-full'
      style={layout.height > 0 ? { height: layout.height } : undefined}
    >
      {props.items.map((item, index) => {
        const position = layout.positions[index]
        if (!position) {
          return null
        }
        if (position.y + position.height < start || position.y > end) {
          return null
        }

        return (
          <div
            key={item.id}
            className='absolute top-0 left-0'
            style={{
              width: columnWidth > 0 ? columnWidth : undefined,
              left: position.x,
              transform: `translate3d(0px, ${position.y}px, 0px)`,
            }}
          >
            <div
              ref={(element) => {
                if (element) {
                  reportHeight(item.id, element.getBoundingClientRect().height)
                }
              }}
            >
              {props.renderItem(item, {
                onAspectRatioChange: (aspectRatio: number) => {
                  if (aspectRatio <= 0 || columnWidth <= 0) return
                  reportHeight(item.id, columnWidth / aspectRatio)
                },
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
