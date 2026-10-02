import { describe, expect, it } from 'vitest'

import {
  STUDIO_VIDEO_VENDORS,
  buildVideoRequest,
  filterAvailableVideoVendors,
  videoSchemaById,
} from '../video-params'

function requireSchema(id: string) {
  const schema = videoSchemaById(id)
  if (!schema) throw new Error(`missing schema: ${id}`)
  return schema
}

describe('buildVideoRequest', () => {
  it('maps media submit keys onto metadata', () => {
    const schema = requireSchema('hailuo/image2video')

    const body = buildVideoRequest(
      schema,
      'MiniMax-Hailuo-2.3',
      { duration: '6', resolution: '1080P' },
      'a cat',
      [
        {
          id: 'media-1',
          field: 'firstFrameImage',
          kind: 'image',
          value: 'https://example.com/frame.png',
        },
      ]
    )

    expect(body.model).toBeUndefined()
    expect(body.prompt).toBe('a cat')
    expect(body.image).toBe('https://example.com/frame.png')
    expect(body.metadata).toMatchObject({
      first_frame_image: 'https://example.com/frame.png',
      duration: '6',
      resolution: '1080P',
    })
  })

  it('keeps multiple reference media as arrays', () => {
    const schema = requireSchema('hailuo/h3')

    const body = buildVideoRequest(
      schema,
      'MiniMax-H3',
      { duration: '5', resolution: '768P', ratio: '16:9' },
      'a cat',
      ['https://example.com/a.mp4', 'https://example.com/b.mp4'].map(
        (value, index) => ({
          id: `media-${index}`,
          field: 'referenceVideo',
          kind: 'video' as const,
          value,
        })
      )
    )

    expect(body.metadata).toMatchObject({
      reference_video: [
        'https://example.com/a.mp4',
        'https://example.com/b.mp4',
      ],
    })
  })
})

describe('filterAvailableVideoVendors', () => {
  it('keeps only models enabled on a channel', () => {
    const vendors = filterAvailableVideoVendors(
      STUDIO_VIDEO_VENDORS,
      new Set(['MiniMax-Hailuo-2.3', 'MiniMax-H3'])
    )

    expect(vendors.map((vendor) => vendor.id)).toEqual(['hailuo'])
    const models = vendors[0].schemas.map((schema) =>
      schema.models.map((model) => model.value)
    )
    expect(models).toEqual([
      ['MiniMax-Hailuo-2.3'],
      ['MiniMax-Hailuo-2.3'],
      ['MiniMax-H3'],
    ])
  })

  it('falls back to the full catalog only when the catalog is not loaded', () => {
    expect(filterAvailableVideoVendors(STUDIO_VIDEO_VENDORS, new Set())).toBe(
      STUDIO_VIDEO_VENDORS
    )
  })

  it('returns no vendor when the loaded catalog has no video model', () => {
    expect(
      filterAvailableVideoVendors(STUDIO_VIDEO_VENDORS, new Set(['unknown']))
    ).toEqual([])
  })
})
