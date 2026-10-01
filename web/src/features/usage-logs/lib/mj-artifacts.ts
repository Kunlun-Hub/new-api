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
import type { MidjourneyLog } from '../types'

type MjArtifactSource = Pick<
  MidjourneyLog,
  'image_urls' | 'image_url' | 'video_urls' | 'video_url'
>

/**
 * Normalizes a stored artifact field to urls: a JSON array (or array value)
 * wins, otherwise the single url is used as fallback.
 */
export function parseMjArtifactUrls(
  value: unknown,
  fallbackUrl?: string
): string[] {
  if (value) {
    try {
      const parsed: unknown =
        typeof value === 'string' ? JSON.parse(value) : value
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((item) =>
            typeof item === 'string' ? item : (item as { url?: string })?.url
          )
          .filter((url): url is string => Boolean(url))
      }
    } catch {
      // Not JSON: fall through to the single url fallback.
    }
  }
  return fallbackUrl ? [fallbackUrl] : []
}

/** Media artifact count of a task, rendered next to the status badge as `×N`. */
export function countMjArtifacts(log: MjArtifactSource): number {
  return (
    parseMjArtifactUrls(log.image_urls, log.image_url).length +
    parseMjArtifactUrls(log.video_urls, log.video_url).length
  )
}

/**
 * Unknown tasks that reached 100% with a failure reason are stale failures, the
 * way the console reports them.
 */
export function isMjTaskFailure(
  log: Pick<MidjourneyLog, 'status' | 'progress' | 'fail_reason'>
): boolean {
  return (
    log.status === 'FAILURE' ||
    (log.status === 'UNKNOWN' &&
      log.progress === '100%' &&
      Boolean(log.fail_reason))
  )
}
