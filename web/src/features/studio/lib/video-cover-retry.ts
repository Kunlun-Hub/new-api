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
import type { StudioGeneration } from './generations'

/** Backoff applied to transient cover failures, in milliseconds. */
const TRANSIENT_BACKOFF_MS = [
  5 * 60_000,
  30 * 60_000,
  2 * 3_600_000,
  24 * 3_600_000,
]

/** A short retry gives rate limits and upstream hiccups time to recover. */
const RATE_LIMITED_DELAY_MS = 90_000
/** Authentication problems usually need the caller to fix a token. */
const AUTHORIZATION_DELAY_MS = 3_600_000
/** Storage incidents are retried on a slower schedule. */
const STORAGE_DELAY_MS = 24 * 3_600_000
/** Decoding failures are worth one slow retry before giving up. */
const DECODE_RETRY_DELAY_MS = 2 * 3_600_000

export type VideoCoverRetryDecision = {
  code: string
  disabled: boolean
  delayMs?: number
}

/** Clears every cover retry field, e.g. after a cover was stored. */
export function clearedVideoCoverRetryState(): Partial<StudioGeneration> {
  return {
    coverAttemptedAt: undefined,
    coverAttemptCount: undefined,
    coverNextAttemptAt: undefined,
    coverRetryDisabled: undefined,
    coverLastErrorCode: undefined,
  }
}

/** State written when a cover was obtained during generation. */
export function initialVideoCoverRetryState(
  now = Date.now()
): Partial<StudioGeneration> {
  return {
    coverAttemptedAt: now,
    coverAttemptCount: 1,
    coverNextAttemptAt: now + 30 * 60_000,
    coverRetryDisabled: undefined,
    coverLastErrorCode: undefined,
  }
}

/** Earliest moment the next cover attempt may run, 24h after the last one. */
export function videoCoverNextAttemptAt(
  item: StudioGeneration
): number | undefined {
  if (item.coverNextAttemptAt != null) {
    return item.coverNextAttemptAt
  }
  if (item.coverAttemptedAt != null) {
    return item.coverAttemptedAt + 24 * 3_600_000
  }
  return undefined
}

/** Collects every message an error may carry for text classification. */
function errorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error ?? '')
  }
  const parts = [error.message]
  const data = (error as { data?: unknown; response?: { data?: unknown } }).data
  const responseData = (error as { response?: { data?: unknown } }).response
    ?.data
  for (const payload of [data, responseData]) {
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>
      if (typeof record.message === 'string') {
        parts.push(record.message)
      }
      const nested = record.error
      if (nested && typeof nested === 'object') {
        const nestedMessage = (nested as Record<string, unknown>).message
        if (typeof nestedMessage === 'string') {
          parts.push(nestedMessage)
        }
      }
    }
  }
  return parts.join(' ').toLowerCase()
}

/** HTTP status reported by an error, 0 when the failure was local. */
function errorStatus(error: unknown): number {
  const candidate = error as {
    status?: unknown
    response?: { status?: unknown }
  }
  for (const value of [candidate?.status, candidate?.response?.status]) {
    if (typeof value === 'number') {
      return value
    }
  }
  const match = /http\s*(?:status\s*)?(\d{3})\b/i.exec(errorText(error))
  if (match) {
    return Number(match[1])
  }
  return 0
}

function retry(
  code: string,
  delayMs: number,
  random: () => number
): VideoCoverRetryDecision {
  return {
    code,
    disabled: false,
    delayMs: Math.max(60_000, Math.round(delayMs * (0.9 + 0.2 * random()))),
  }
}

function giveUp(code: string): VideoCoverRetryDecision {
  return { code, disabled: true }
}

/**
 * Classifies a failed cover attempt exactly like the reference studio: fatal
 * sources are disabled, transient failures back off, and rate limits retry
 * quickly.
 */
export function videoCoverRetryDecision(
  error: unknown,
  attemptCount: number,
  random: () => number = Math.random
): VideoCoverRetryDecision {
  const status = errorStatus(error)
  const text = errorText(error)
  const attemptIndex = Math.min(Math.max(attemptCount - 1, 0), 3)
  if (
    status === 429 ||
    /(?:\b429\b|too many requests|rate.?limit|请求过于频繁|限流)/i.test(text)
  ) {
    return retry('rate_limited', RATE_LIMITED_DELAY_MS, random)
  }
  if (
    status === 413 ||
    /(?:file|文件|源文件).*(?:too large|过大|超过)|(?:too large|超过).*(?:30\s*mb|限制)/i.test(
      text
    )
  ) {
    return giveUp('source_too_large')
  }
  if (
    /(?:invalid|非法|无效).*(?:url|地址)|(?:url|地址).*(?:invalid|非法|无效)|不允许的.*协议|unsupported protocol/i.test(
      text
    )
  ) {
    return giveUp('invalid_source_url')
  }
  if (
    /http\s*(?:status\s*)?(?:404|410)\b|源文件.*(?:不存在|已删除)|source.*(?:not found|gone)/i.test(
      text
    )
  ) {
    return giveUp('source_not_found')
  }
  if (
    /http\s*(?:status\s*)?(?:401|403)\b|源文件.*(?:无权|拒绝)|source.*(?:forbidden|unauthorized)/i.test(
      text
    )
  ) {
    return giveUp('source_forbidden')
  }
  if (/未找到视频流|no video stream/i.test(text)) {
    return giveUp('no_video_stream')
  }
  // A gateway without ffmpeg cannot render frames itself; slow retries leave
  // room for an administrator to install it.
  if (
    /ffmpeg is not installed|未安装\s*ffmpeg|未安裝\s*ffmpeg|server side cover generation is unavailable|服务端封面生成不可用|伺服端封面生成不可用/i.test(
      text
    )
  ) {
    return retry('server_cover_unavailable', STORAGE_DELAY_MS, random)
  }
  if (status === 401 || status === 403) {
    return retry('authorization', AUTHORIZATION_DELAY_MS, random)
  }
  if (
    status === 400 ||
    status === 415 ||
    /unsupported (?:media|image|video)|不支持的.*(?:格式|媒体)/i.test(text)
  ) {
    return giveUp('unsupported_source')
  }
  if (
    /ffmpeg|解码|decode|invalid data|moov atom|封面生成失败|cover generation failed/i.test(
      text
    )
  ) {
    return attemptCount >= 3
      ? giveUp('decode_failed')
      : retry('decode_failed', DECODE_RETRY_DELAY_MS, random)
  }
  if (
    /(?:oss|s3|存储桶|bucket|credential|access.?key|signature|签名|上传.*失败)/i.test(
      text
    )
  ) {
    return retry('storage_unavailable', STORAGE_DELAY_MS, random)
  }
  if (
    /timeout|timed out|超时|abort/i.test(text) ||
    status === 408 ||
    status === 504
  ) {
    return retry('timeout', TRANSIENT_BACKOFF_MS[attemptIndex], random)
  }
  if (status >= 500) {
    return retry(
      'service_unavailable',
      TRANSIENT_BACKOFF_MS[attemptIndex],
      random
    )
  }
  return retry('transient_failure', TRANSIENT_BACKOFF_MS[attemptIndex], random)
}
