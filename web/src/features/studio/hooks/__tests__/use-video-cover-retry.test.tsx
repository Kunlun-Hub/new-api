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
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getGeneration,
  updateGeneration,
  useGenerations,
  type StudioGeneration,
} from '../../lib/generations'
import {
  generateStudioVideoCover,
  studioVideoHeaders,
} from '../../lib/studio-upload'
import { useVideoCoverRetry } from '../use-video-cover-retry'

vi.mock('../../lib/generations', () => ({
  getGeneration: vi.fn(),
  updateGeneration: vi.fn(),
  useGenerations: vi.fn(),
}))
vi.mock('../../lib/studio-upload', () => ({
  generateStudioVideoCover: vi.fn(),
  studioVideoHeaders: vi.fn(),
}))

const useGenerationsMock = vi.mocked(useGenerations)
const getGenerationMock = vi.mocked(getGeneration)
const updateMock = vi.mocked(updateGeneration)
const generateMock = vi.mocked(generateStudioVideoCover)
const headersMock = vi.mocked(studioVideoHeaders)

function video(patch: Partial<StudioGeneration> = {}): StudioGeneration {
  return {
    id: 'v-1',
    kind: 'video',
    status: 'done',
    prompt: 'a clip',
    model: 'kling',
    url: 'https://cdn.example.com/me/v.mp4',
    ...patch,
    createdAt: 1,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.requestIdleCallback = ((callback: IdleRequestCallback) => {
    callback({ didTimeout: false, timeRemaining: () => 50 })
    return 1
  }) as typeof window.requestIdleCallback
  headersMock.mockResolvedValue(undefined)
})

describe('useVideoCoverRetry', () => {
  it('fills in the missing cover of a finished video', async () => {
    const record = video()
    useGenerationsMock.mockReturnValue([record])
    getGenerationMock.mockReturnValue(record)
    generateMock.mockResolvedValue({
      coverUrl: 'https://cdn.example.com/me/cover.webp',
    })

    renderHook(() => useVideoCoverRetry())

    await waitFor(() => expect(generateMock).toHaveBeenCalledTimes(1))
    expect(generateMock).toHaveBeenCalledWith(record.url, {
      headers: undefined,
    })
    expect(updateMock).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({
        coverUrl: 'https://cdn.example.com/me/cover.webp',
      })
    )
  })

  it('stores the gateway copy of videos the server had to transfer', async () => {
    const record = video()
    useGenerationsMock.mockReturnValue([record])
    getGenerationMock.mockReturnValue(record)
    generateMock.mockResolvedValue({
      coverUrl: 'https://cdn.example.com/me/cover.webp',
      url: 'https://cdn.example.com/me/studio_video/v.mp4',
    })

    renderHook(() => useVideoCoverRetry())

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        record.id,
        expect.objectContaining({
          coverUrl: 'https://cdn.example.com/me/cover.webp',
          url: 'https://cdn.example.com/me/studio_video/v.mp4',
        })
      )
    )
  })

  it('schedules a backoff when cover generation fails', async () => {
    const record = video()
    useGenerationsMock.mockReturnValue([record])
    getGenerationMock.mockReturnValue(record)
    generateMock.mockRejectedValue(new Error('Video cover generation failed'))

    renderHook(() => useVideoCoverRetry())

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        record.id,
        expect.objectContaining({
          coverLastErrorCode: 'decode_failed',
          coverAttemptCount: 1,
        })
      )
    )
    const patch = updateMock.mock.calls.at(-1)?.[1] as {
      coverNextAttemptAt?: number
    }
    expect(patch.coverNextAttemptAt).toBeGreaterThan(Date.now())
  })

  it('skips videos that already have a cover or are disabled', async () => {
    useGenerationsMock.mockReturnValue([
      video({ id: 'v-cover', coverUrl: 'https://cdn.example.com/me/c.webp' }),
      video({ id: 'v-disabled', coverRetryDisabled: true }),
      video({ id: 'v-later', coverNextAttemptAt: Date.now() + 3_600_000 }),
      video({ id: 'v-running', status: 'running' }),
    ])

    renderHook(() => useVideoCoverRetry())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(generateMock).not.toHaveBeenCalled()
  })
})
