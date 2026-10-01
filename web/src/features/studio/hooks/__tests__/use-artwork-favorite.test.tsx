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
import { renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  toggleGenerationFavorite,
  updateGeneration,
  type StudioGeneration,
} from '../../lib/generations'
import {
  isStudioStoredMedia,
  persistStudioMedia,
  persistStudioVideo,
  studioVideoHeaders,
} from '../../lib/studio-upload'
import { useArtworkFavorite } from '../use-artwork-favorite'

vi.mock('../../lib/generations', () => ({
  toggleGenerationFavorite: vi.fn(),
  updateGeneration: vi.fn(),
}))
vi.mock('../../lib/studio-upload', () => ({
  isStudioStoredMedia: vi.fn(),
  persistStudioMedia: vi.fn(),
  persistStudioVideo: vi.fn(),
  studioVideoHeaders: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const toggleMock = vi.mocked(toggleGenerationFavorite)
const updateMock = vi.mocked(updateGeneration)
const storedMock = vi.mocked(isStudioStoredMedia)
const persistImageMock = vi.mocked(persistStudioMedia)
const persistVideoMock = vi.mocked(persistStudioVideo)
const headersMock = vi.mocked(studioVideoHeaders)
const toastMock = vi.mocked(toast.error)

function artwork(patch: Partial<StudioGeneration> = {}): StudioGeneration {
  return {
    id: 'g-1',
    kind: 'image',
    status: 'done',
    prompt: 'a cat',
    model: 'mj',
    createdAt: 1,
    url: 'https://upstream.example.com/a.png',
    ...patch,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  storedMock.mockResolvedValue(false)
})

describe('useArtworkFavorite', () => {
  it('removes an existing favorite without copying media', async () => {
    const { result } = renderHook(() => useArtworkFavorite('image'))

    await result.current.toggle(artwork({ favorite: true }))

    expect(toggleMock).toHaveBeenCalledTimes(1)
    expect(persistImageMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('keeps media that the caller storage already serves', async () => {
    storedMock.mockResolvedValue(true)
    const { result } = renderHook(() => useArtworkFavorite('image'))

    await result.current.toggle(artwork())

    expect(toggleMock).toHaveBeenCalledTimes(1)
    expect(persistImageMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('copies upstream image media into storage when favoriting', async () => {
    persistImageMock.mockResolvedValue('https://cdn.example.com/me/a.png')
    const { result } = renderHook(() => useArtworkFavorite('image'))

    await result.current.toggle(artwork())

    expect(persistImageMock).toHaveBeenCalledWith(
      'https://upstream.example.com/a.png',
      'studio_image'
    )
    expect(updateMock).toHaveBeenCalledWith('g-1', {
      url: 'https://cdn.example.com/me/a.png',
      coverUrl: undefined,
    })
  })

  it('copies a video with its cover and the owning token', async () => {
    headersMock.mockResolvedValue({ Authorization: 'Bearer sk-abc' })
    persistVideoMock.mockResolvedValue({
      url: 'https://cdn.example.com/me/v.mp4',
      coverUrl: 'https://cdn.example.com/me/cover.jpg',
    })
    const { result } = renderHook(() => useArtworkFavorite('video'))

    await result.current.toggle(
      artwork({ kind: 'video', url: '/v1/videos/t-1/content', tokenId: 7 })
    )

    expect(headersMock).toHaveBeenCalledWith('/v1/videos/t-1/content', 7)
    expect(persistVideoMock).toHaveBeenCalledWith('/v1/videos/t-1/content', {
      headers: { Authorization: 'Bearer sk-abc' },
    })
    expect(updateMock).toHaveBeenCalledWith('g-1', {
      url: 'https://cdn.example.com/me/v.mp4',
      coverUrl: 'https://cdn.example.com/me/cover.jpg',
    })
  })

  it('rolls the favorite back when every copy path fails', async () => {
    persistImageMock.mockResolvedValue('https://upstream.example.com/a.png')
    const { result } = renderHook(() => useArtworkFavorite('image'))

    await result.current.toggle(artwork())

    expect(updateMock).toHaveBeenCalledWith('g-1', { favorite: false })
    expect(toastMock).toHaveBeenCalledWith(
      'Failed to update favorites. Please try again later.'
    )
  })
})
