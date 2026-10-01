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
import { describe, expect, it } from 'vitest'

import type { StudioGeneration } from '../generations'
import {
  clearedVideoCoverRetryState,
  initialVideoCoverRetryState,
  videoCoverNextAttemptAt,
  videoCoverRetryDecision,
} from '../video-cover-retry'

const fixedRandom = () => 0.5

function video(patch: Partial<StudioGeneration> = {}): StudioGeneration {
  return {
    id: 'v-1',
    kind: 'video',
    status: 'done',
    prompt: 'a clip',
    model: 'kling',
    createdAt: 1,
    url: 'https://cdn.example.com/me/v.mp4',
    ...patch,
  }
}

describe('videoCoverNextAttemptAt', () => {
  it('prefers the scheduled moment and falls back to 24 hours', () => {
    expect(videoCoverNextAttemptAt(video())).toBeUndefined()
    expect(videoCoverNextAttemptAt(video({ coverAttemptedAt: 1_000 }))).toBe(
      1_000 + 24 * 3_600_000
    )
    expect(
      videoCoverNextAttemptAt(
        video({ coverAttemptedAt: 1_000, coverNextAttemptAt: 5_000 })
      )
    ).toBe(5_000)
  })
})

describe('videoCoverRetryState', () => {
  it('schedules the first retry half an hour later', () => {
    expect(initialVideoCoverRetryState(1_000)).toEqual({
      coverAttemptedAt: 1_000,
      coverAttemptCount: 1,
      coverNextAttemptAt: 1_000 + 30 * 60_000,
      coverRetryDisabled: undefined,
      coverLastErrorCode: undefined,
    })
  })

  it('clears every retry field', () => {
    expect(clearedVideoCoverRetryState()).toEqual({
      coverAttemptedAt: undefined,
      coverAttemptCount: undefined,
      coverNextAttemptAt: undefined,
      coverRetryDisabled: undefined,
      coverLastErrorCode: undefined,
    })
  })
})

describe('videoCoverRetryDecision', () => {
  it('retries rate limits quickly', () => {
    const decision = videoCoverRetryDecision(
      { response: { status: 429 } },
      1,
      fixedRandom
    )
    expect(decision).toEqual({
      code: 'rate_limited',
      disabled: false,
      delayMs: 90_000,
    })
  })

  it('disables sources that can never succeed', () => {
    expect(
      videoCoverRetryDecision(new Error('HTTP status 413'), 1, fixedRandom)
    ).toEqual({ code: 'source_too_large', disabled: true })
    expect(
      videoCoverRetryDecision(new Error('HTTP status 404'), 1, fixedRandom)
    ).toEqual({ code: 'source_not_found', disabled: true })
    expect(
      videoCoverRetryDecision(new Error('不允许的协议'), 1, fixedRandom)
    ).toEqual({ code: 'invalid_source_url', disabled: true })
    expect(
      videoCoverRetryDecision(new Error('no video stream'), 1, fixedRandom)
    ).toEqual({ code: 'no_video_stream', disabled: true })
  })

  it('retries decode failures twice before giving up', () => {
    expect(
      videoCoverRetryDecision(
        new Error('Video cover generation failed'),
        1,
        fixedRandom
      )
    ).toEqual({
      code: 'decode_failed',
      disabled: false,
      delayMs: 2 * 3_600_000,
    })
    expect(
      videoCoverRetryDecision(
        new Error('Video cover generation failed'),
        3,
        fixedRandom
      )
    ).toEqual({ code: 'decode_failed', disabled: true })
  })

  it('backs transient failures off on a fixed ladder', () => {
    expect(videoCoverRetryDecision(new Error('boom'), 1, fixedRandom)).toEqual({
      code: 'transient_failure',
      disabled: false,
      delayMs: 5 * 60_000,
    })
    expect(videoCoverRetryDecision(new Error('boom'), 4, fixedRandom)).toEqual({
      code: 'transient_failure',
      disabled: false,
      delayMs: 24 * 3_600_000,
    })
    expect(
      videoCoverRetryDecision({ response: { status: 503 } }, 1, fixedRandom)
    ).toEqual({
      code: 'service_unavailable',
      disabled: false,
      delayMs: 5 * 60_000,
    })
  })

  it('retries timeouts and storage incidents later', () => {
    expect(
      videoCoverRetryDecision(new Error('request timeout'), 1, fixedRandom)
    ).toEqual({
      code: 'timeout',
      disabled: false,
      delayMs: 5 * 60_000,
    })
    expect(
      videoCoverRetryDecision(new Error('bucket upload failed'), 1, fixedRandom)
    ).toEqual({
      code: 'storage_unavailable',
      disabled: false,
      delayMs: 24 * 3_600_000,
    })
  })

  it('keeps authorization problems retryable', () => {
    expect(videoCoverRetryDecision({ status: 401 }, 1, fixedRandom)).toEqual({
      code: 'authorization',
      disabled: false,
      delayMs: 3_600_000,
    })
  })

  it('keeps gateways without ffmpeg on a slow retry schedule', () => {
    expect(
      videoCoverRetryDecision(
        new Error(
          'Server side cover generation is unavailable: ffmpeg is not installed'
        ),
        1,
        fixedRandom
      )
    ).toEqual({
      code: 'server_cover_unavailable',
      disabled: false,
      delayMs: 24 * 3_600_000,
    })
    expect(
      videoCoverRetryDecision(
        new Error('服务端封面生成不可用：服务器未安装 ffmpeg'),
        1,
        fixedRandom
      )
    ).toEqual({
      code: 'server_cover_unavailable',
      disabled: false,
      delayMs: 24 * 3_600_000,
    })
  })

  it('treats gateway download failures as fatal sources', () => {
    expect(
      videoCoverRetryDecision(
        new Error(
          'Video cover generation failed: download failed with HTTP status 404'
        ),
        1,
        fixedRandom
      )
    ).toEqual({ code: 'source_not_found', disabled: true })
  })
})
