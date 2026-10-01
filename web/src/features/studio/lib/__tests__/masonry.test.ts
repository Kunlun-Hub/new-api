import { describe, expect, it } from 'vitest'

import { computeMasonryLayout } from '../masonry'

describe('computeMasonryLayout', () => {
  it('fills the shortest column and keeps the container height in sync', () => {
    const layout = computeMasonryLayout(
      [
        { id: 1, aspect_ratio: 1 },
        { id: 2, aspect_ratio: 0.5 },
        { id: 3, aspect_ratio: 2 },
        { id: 4, aspect_ratio: 1 },
      ],
      2,
      100
    )

    expect(layout.positions).toEqual([
      { x: 0, y: 0, height: 100 },
      { x: 112, y: 0, height: 200 },
      { x: 0, y: 112, height: 50 },
      { x: 0, y: 174, height: 100 },
    ])
    expect(layout.height).toBe(274)
  })

  it('prefers measured card heights over the aspect ratio estimate', () => {
    const layout = computeMasonryLayout(
      [
        { id: 1, aspect_ratio: 1 },
        { id: 2, aspect_ratio: 1 },
      ],
      1,
      100,
      new Map([[1, 40]])
    )

    expect(layout.positions[1].y).toBe(52)
    expect(layout.height).toBe(152)
  })

  it('returns an empty layout without columns or items', () => {
    expect(computeMasonryLayout([{ id: 1, aspect_ratio: 1 }], 0, 100)).toEqual({
      positions: [],
      height: 0,
    })
    expect(computeMasonryLayout([], 3, 100)).toEqual({
      positions: [],
      height: 0,
    })
  })
})
