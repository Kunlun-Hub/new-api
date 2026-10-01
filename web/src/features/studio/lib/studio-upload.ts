import { fetchTokenKey } from '@/features/keys/api'
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
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { extractVideoCover } from './video-cover'

/** Attachments larger than this are rejected before the upload starts. */
export const STUDIO_UPLOAD_MAX_BYTES = 20 * 1024 * 1024

export type StudioUploadResult = {
  url: string
  name: string
  size: number
  contentType: string
}

type StudioUploadPayload = {
  url?: string
  name?: string
  size?: number
  content_type?: string
}

/**
 * Uploads one studio attachment and returns the URL that is sent to the model.
 * Files are stored in the caller's personal bucket when it is configured and
 * in the gateway upload directory otherwise.
 */
export async function uploadStudioFile(
  file: File,
  scene: string
): Promise<StudioUploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('scene', scene)

  const response = await api.post('/api/user/oss/upload', form)
  const payload = (response.data?.data ?? {}) as StudioUploadPayload
  if (!payload.url) {
    throw new Error('Upload failed')
  }

  return {
    url: payload.url,
    name: payload.name || file.name,
    size: payload.size ?? file.size,
    contentType:
      payload.content_type || file.type || 'application/octet-stream',
  }
}

type StudioOssConfig = {
  configured: boolean
  publicBaseUrl: string
}

let studioOssConfig: Promise<StudioOssConfig | null> | null = null

/** Reads the caller storage config once per session, like the reference. */
function studioOwnStorage(): Promise<StudioOssConfig | null> {
  if (!studioOssConfig) {
    studioOssConfig = api
      .get('/api/user/oss')
      .then((response) => {
        const payload = (response.data?.data ?? {}) as {
          configured?: boolean
          public_base_url?: string
        }
        return {
          configured: Boolean(payload.configured),
          publicBaseUrl: payload.public_base_url ?? '',
        }
      })
      .catch(() => null)
  }
  return studioOssConfig
}

/** True when the gateway or the caller's bucket already stores this media. */
export async function isStudioStoredMedia(url: string): Promise<boolean> {
  if (!url || isGatewayStorageUrl(url)) {
    return true
  }
  const config = await studioOwnStorage()
  return Boolean(config?.publicBaseUrl && url.startsWith(config.publicBaseUrl))
}

/** Matches gateway media URLs whether they are relative or absolute. */
function isGatewayStorageUrl(url: string): boolean {
  const storagePrefix = '/api/studio/oss/file/'
  if (url.startsWith(storagePrefix)) {
    return true
  }
  try {
    return new URL(url, window.location.origin).pathname.startsWith(
      storagePrefix
    )
  } catch {
    return false
  }
}

type StudioTransferPayload = {
  url?: string
  cover_url?: string
}

/** Authorization for videos that still stream from the gateway endpoint. */
export async function studioVideoHeaders(
  url: string | undefined,
  tokenId: number | undefined
): Promise<HeadersInit | undefined> {
  if (!url?.startsWith('/v1/videos/') || tokenId == null) {
    return undefined
  }
  try {
    const keyResult = await fetchTokenKey(tokenId)
    if (keyResult.success && keyResult.data?.key) {
      return { Authorization: `Bearer ${keyResult.data.key}` }
    }
  } catch {
    // An unusable token leaves the gateway transfer as the fallback.
  }
  return undefined
}

/** Copies one object through the gateway, returning '' when it fails. */
async function transferStudioObject(
  url: string,
  scene: string
): Promise<string> {
  try {
    const response = await api.post('/api/user/oss/object', { url, scene })
    const payload = (response.data?.data ?? {}) as StudioTransferPayload
    return payload.url ?? ''
  } catch {
    return ''
  }
}

/** Fetches media bytes, returning null when the browser cannot read them. */
async function fetchMediaResponse(
  url: string,
  headers?: HeadersInit
): Promise<Response | null> {
  try {
    return await fetch(url, { headers })
  } catch {
    return null
  }
}

/** One poster frame produced by the studio, plus the video it belongs to. */
export type StudioVideoCoverResult = {
  coverUrl: string
  /** Gateway copy of the video, set when the server had to transfer it. */
  url?: string
}

type StudioVideoCoverPayload = {
  url?: string
  cover_url?: string
}

/**
 * Asks the gateway to render the poster frame. Browsers cannot decode every
 * codec they play, so the studio falls back to the server side ffmpeg render,
 * exactly like the reference. Errors carry the gateway message so the retry
 * classifier can decide between a backoff and giving up.
 */
async function requestServerVideoCover(
  url: string
): Promise<StudioVideoCoverResult> {
  const absolute = new URL(url, window.location.origin).toString()
  const response = requireServerSuccess(
    await api.post('/api/user/oss/video-cover', { url: absolute })
  )
  const payload = (response.data?.data ?? {}) as StudioVideoCoverPayload
  if (!payload.cover_url) {
    throw new Error('Video cover generation failed')
  }
  const storedUrl =
    payload.url && payload.url !== absolute ? payload.url : undefined
  return { coverUrl: payload.cover_url, url: storedUrl }
}

/**
 * Builds the cover for a video the gallery already holds, transferring the
 * video through the gateway first when the browser cannot read the source and
 * asking the gateway to render the frame when the browser cannot decode it.
 * Throws so the caller can schedule the retry the reference also performs.
 */
export async function generateStudioVideoCover(
  url: string,
  options?: { headers?: HeadersInit }
): Promise<StudioVideoCoverResult> {
  let sourceUrl = url
  let transferredUrl: string | undefined
  try {
    let response = await fetchMediaResponse(url, options?.headers)
    if (!response) {
      const transferred = await transferStudioObject(url, 'studio_video')
      if (transferred && transferred !== url) {
        sourceUrl = transferred
        transferredUrl = transferred
        response = await fetchMediaResponse(transferred)
      }
    }
    if (!response) {
      throw new Error('The video source is not reachable')
    }
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`)
    }
    const cover = await extractVideoCover(await response.blob())
    if (!cover) {
      throw new Error('Video cover generation failed')
    }
    const uploaded = await uploadStudioFile(cover, 'studio_video')
    return { coverUrl: uploaded.url, url: transferredUrl }
  } catch (error) {
    try {
      const stored = await requestServerVideoCover(sourceUrl)
      return { coverUrl: stored.coverUrl, url: stored.url ?? transferredUrl }
    } catch (serverError) {
      throw serverError instanceof Error ? serverError : error
    }
  }
}

/**
 * Copies media that was produced by an upstream provider into studio storage,
 * so gallery entries keep working after the provider URL expires. The browser
 * uploads the bytes directly when it can read them, and the gateway downloads
 * the media itself otherwise (image providers usually block cross origin
 * reads). Failures keep the original URL.
 */
export async function persistStudioMedia(
  url: string,
  scene: string,
  options?: { headers?: HeadersInit; fileName?: string }
): Promise<string> {
  if (await isStudioStoredMedia(url)) {
    return url
  }

  try {
    const response = await fetch(url, { headers: options?.headers })
    if (response.ok) {
      const blob = await response.blob()
      const file = new File(
        [blob],
        options?.fileName || mediaFileName(url, blob.type),
        { type: blob.type || 'application/octet-stream' }
      )
      const uploaded = await uploadStudioFile(file, scene)
      return uploaded.url
    }
  } catch {
    // Cross origin media falls through to the gateway transfer below.
  }

  const transferred = await transferStudioObject(url, scene)
  return transferred || url
}

/** Builds a file name for media that has no name of its own. */
function mediaFileName(url: string, contentType: string): string {
  const fromUrl = url.split('?')[0].split('/').pop() || ''
  if (/\.[a-z0-9]{1,8}$/i.test(fromUrl)) {
    return fromUrl
  }
  const extension = contentType.split('/')[1]?.split('+')[0] || 'png'
  return `studio_${Date.now()}.${extension}`
}

/**
 * Stores one generated video with its cover frame. The browser streams the
 * gateway content endpoint (it holds the token for it), the gateway transfer
 * stays as the fallback for videos it cannot read.
 */
export async function persistStudioVideo(
  url: string,
  options?: { headers?: HeadersInit; fileName?: string }
): Promise<{ url: string; coverUrl?: string }> {
  if (await isStudioStoredMedia(url)) {
    return { url }
  }

  try {
    const response = await fetch(url, { headers: options?.headers })
    if (response.ok) {
      const blob = await response.blob()
      const file = new File(
        [blob],
        options?.fileName || mediaFileName(url, blob.type),
        { type: blob.type || 'video/mp4' }
      )
      const uploaded = await uploadStudioFile(file, 'studio_video')
      const cover = await extractVideoCover(blob)
      if (!cover) {
        return { url: uploaded.url }
      }
      try {
        const storedCover = await uploadStudioFile(cover, 'studio_video')
        return { url: uploaded.url, coverUrl: storedCover.url }
      } catch {
        return { url: uploaded.url }
      }
    }
  } catch {
    // Fall through to the gateway transfer below.
  }

  const transferred = await transferStudioObject(url, 'studio_video')
  return transferred ? { url: transferred } : { url }
}
