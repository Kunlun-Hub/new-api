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

/** Cover extraction gives up instead of blocking the gallery forever. */
const VIDEO_COVER_TIMEOUT_MS = 12000
/** A single seek waits this long for a decoded frame before moving on. */
const VIDEO_COVER_SEEK_TIMEOUT_MS = 1500
/** The stored cover keeps at most this many pixels on its longest edge. */
const VIDEO_COVER_MAX_EDGE = 640
/** Frames are sampled through a downscaled bitmap before being accepted. */
const VIDEO_COVER_SAMPLE_EDGE = 32

/**
 * Frame positions tried in order, mirroring the reference studio: just after
 * the first keyframe, then 5% and 15% into the clip, so videos that open on a
 * black or blank frame still get a usable cover.
 */
export function coverSeekTimes(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [0]
  }
  const last = Math.max(0, duration - 0.001)
  const times = [
    Math.min(0.002, last),
    Math.min(Math.max(0.05 * duration, 0.1), 0.5, last),
    Math.min(Math.max(0.15 * duration, 0.5), 1.5, last),
  ]
  return times.filter(
    (time, index) => index === 0 || Math.abs(time - times[index - 1]) >= 0.01
  )
}

/**
 * Rejects black, transparent and flat frames: at least 90% of the sampled
 * pixels must be visible and the frame needs either contrast or variance.
 */
export function isMeaningfulFrameData(data: Uint8ClampedArray): boolean {
  const total = Math.floor(data.length / 4)
  if (!total) {
    return false
  }
  const step = Math.max(1, Math.floor(total / 1024))
  let sampled = 0
  let visible = 0
  let minLuma = 255
  let maxLuma = 0
  let sum = 0
  let squareSum = 0
  for (let index = 0; index < total; index += step) {
    const offset = index * 4
    sampled += 1
    if (data[offset + 3] < 32) {
      continue
    }
    visible += 1
    const luma =
      0.2126 * data[offset] +
      0.7152 * data[offset + 1] +
      0.0722 * data[offset + 2]
    minLuma = Math.min(minLuma, luma)
    maxLuma = Math.max(maxLuma, luma)
    sum += luma
    squareSum += luma * luma
  }
  if (!sampled || visible / sampled < 0.9) {
    return false
  }
  const mean = sum / visible
  const variance = Math.max(0, squareSum / visible - mean * mean)
  return maxLuma - minLuma >= 10 || variance >= 9
}

/** Resolves when the video fires one of `events`, rejecting on error or timeout. */
function waitForVideoEvent(
  video: HTMLVideoElement,
  events: string[],
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timer)
      for (const event of events) {
        video.removeEventListener(event, onEvent)
      }
      video.removeEventListener('error', onError)
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }
    const onEvent = () => finish()
    const onError = () => finish(new Error('Failed to read video'))
    const timer = window.setTimeout(
      () => finish(new Error('Timed out reading video')),
      timeoutMs
    )
    for (const event of events) {
      video.addEventListener(event, onEvent, { once: true })
    }
    video.addEventListener('error', onError, { once: true })
  })
}

/** Waits for a decoded frame at `time`, falling back to the ready state. */
function seekToFrame(video: HTMLVideoElement, time: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    let seeked = false
    let hasFrameCallback = typeof video.requestVideoFrameCallback === 'function'
    const finish = (usable: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.removeEventListener('seeked', onReady)
      video.removeEventListener('loadeddata', onReady)
      if (frameHandle != null) {
        video.cancelVideoFrameCallback?.(frameHandle)
      }
      resolve(usable)
    }
    const check = () => {
      if (seeked && !hasFrameCallback) {
        finish(video.readyState >= 2)
      }
    }
    const onReady = () => {
      seeked = true
      check()
    }
    let frameHandle: number | undefined
    video.addEventListener('seeked', onReady)
    video.addEventListener('loadeddata', onReady)
    if (hasFrameCallback) {
      frameHandle = video.requestVideoFrameCallback(() => {
        hasFrameCallback = false
        check()
      })
    }
    const timer = window.setTimeout(
      () => finish(video.readyState >= 2),
      VIDEO_COVER_SEEK_TIMEOUT_MS
    )
    try {
      video.currentTime = time
      if (video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.001) {
        seeked = true
        finish(true)
      }
    } catch {
      finish(false)
    }
  })
}

/** Draws the current frame at cover resolution, or null when too small. */
function drawFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  const width = Math.round(video.videoWidth)
  const height = Math.round(video.videoHeight)
  if (width <= 0 || height <= 0) {
    return null
  }
  const scale = Math.min(1, VIDEO_COVER_MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(width, VIDEO_COVER_MAX_EDGE)
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  const sample = document.createElement('canvas')
  sample.width = VIDEO_COVER_SAMPLE_EDGE
  sample.height = VIDEO_COVER_SAMPLE_EDGE
  const sampleContext = sample.getContext('2d')
  if (!sampleContext) {
    return null
  }
  sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height)
  const data = sampleContext.getImageData(
    0,
    0,
    sample.width,
    sample.height
  ).data
  return isMeaningfulFrameData(data) ? canvas : null
}

/** Encodes the frame as WebP (preferred) or JPEG, mirroring the reference. */
async function encodeFrame(canvas: HTMLCanvasElement): Promise<File | null> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), type, 0.8)
    })
  const webp = await toBlob('image/webp')
  if (webp && webp.type === 'image/webp') {
    return new File([webp], `video_cover_${Date.now()}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  }
  const jpeg = await toBlob('image/jpeg')
  if (!jpeg) {
    return null
  }
  return new File([jpeg], `video_cover_${Date.now()}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

/**
 * Grabs a representative frame of a video as a cover file, mirroring the
 * poster the reference studio stores next to every generated video. Returns
 * null when the browser cannot decode a usable frame.
 */
export async function extractVideoCover(blob: Blob): Promise<File | null> {
  if (typeof document === 'undefined' || blob.size === 0) {
    return null
  }

  const objectUrl = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  try {
    const metadata = waitForVideoEvent(
      video,
      ['loadedmetadata', 'loadeddata'],
      VIDEO_COVER_TIMEOUT_MS
    )
    video.src = objectUrl
    video.load()
    await metadata
    if (video.readyState < 2) {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0
        video.currentTime = duration > 0 ? Math.min(0.001, duration / 2) : 0
      } catch {
        // A failed nudge still lets the frame loop below try its own seeks.
      }
    }

    for (const time of coverSeekTimes(video.duration)) {
      if (!(await seekToFrame(video, time))) {
        continue
      }
      const canvas = drawFrame(video)
      if (!canvas) {
        continue
      }
      const cover = await encodeFrame(canvas)
      if (cover) {
        return cover
      }
    }
    return null
  } catch {
    return null
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}
