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
export const MASONRY_GAP = 12

export type MasonryEntry = {
  id: string | number
  aspect_ratio: number
}

export type MasonryPosition = {
  x: number
  y: number
  height: number
}

export type MasonryLayout = {
  positions: MasonryPosition[]
  height: number
}

/**
 * Places every entry into the currently shortest column.
 *
 * Measured heights win over the aspect ratio estimate so cards whose media is
 * already loaded do not shift the following entries.
 */
export function computeMasonryLayout(
  items: MasonryEntry[],
  columns: number,
  columnWidth: number,
  measuredHeights: Map<string | number, number> = new Map()
): MasonryLayout {
  if (columns < 1 || columnWidth <= 0 || items.length === 0) {
    return { positions: [], height: 0 }
  }

  const columnHeights = Array.from({ length: columns }, () => 0)
  const positions = items.map((item) => {
    let column = 0
    for (let index = 1; index < columns; index += 1) {
      if (columnHeights[index] < columnHeights[column]) {
        column = index
      }
    }

    const measured = measuredHeights.get(item.id)
    const height =
      measured ?? columnWidth / (item.aspect_ratio > 0 ? item.aspect_ratio : 1)
    const position = {
      x: column * (columnWidth + MASONRY_GAP),
      y: columnHeights[column],
      height,
    }
    columnHeights[column] = position.y + height + MASONRY_GAP
    return position
  })

  return {
    positions,
    height: Math.max(...columnHeights) - MASONRY_GAP,
  }
}
