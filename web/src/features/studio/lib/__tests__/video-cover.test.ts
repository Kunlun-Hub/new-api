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

import { coverSeekTimes, isMeaningfulFrameData } from '../video-cover'

function frame(pixels: [number, number, number, number][]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat())
}

function flatFrame(
  pixel: [number, number, number, number],
  count = 16
): Uint8ClampedArray {
  return frame(Array.from({ length: count }, () => pixel))
}

describe('coverSeekTimes', () => {
  it('falls back to the start for unknown durations', () => {
    expect(coverSeekTimes(0)).toEqual([0])
    expect(coverSeekTimes(Number.NaN)).toEqual([0])
  })

  it('samples the start, 5% and 15% of a long clip', () => {
    expect(coverSeekTimes(10)).toEqual([0.002, 0.5, 1.5])
  })

  it('applies the minimum offsets to short clips', () => {
    expect(coverSeekTimes(1)).toEqual([0.002, 0.1, 0.5])
  })

  it('drops samples that are too close together', () => {
    expect(coverSeekTimes(0.005)).toEqual([0.002])
  })
})

describe('isMeaningfulFrameData', () => {
  it('rejects empty and fully transparent frames', () => {
    expect(isMeaningfulFrameData(new Uint8ClampedArray())).toBe(false)
    expect(isMeaningfulFrameData(flatFrame([0, 0, 0, 0]))).toBe(false)
  })

  it('rejects flat black and flat gray frames', () => {
    expect(isMeaningfulFrameData(flatFrame([0, 0, 0, 255]))).toBe(false)
    expect(isMeaningfulFrameData(flatFrame([128, 128, 128, 255]))).toBe(false)
  })

  it('rejects frames that are mostly transparent', () => {
    const pixels: [number, number, number, number][] = []
    for (let index = 0; index < 16; index++) {
      pixels.push(index < 8 ? [200, 200, 200, 255] : [255, 255, 255, 0])
    }
    expect(isMeaningfulFrameData(frame(pixels))).toBe(false)
  })

  it('accepts frames with visible contrast', () => {
    const pixels: [number, number, number, number][] = []
    for (let index = 0; index < 16; index++) {
      pixels.push(index < 8 ? [0, 0, 0, 255] : [255, 255, 255, 255])
    }
    expect(isMeaningfulFrameData(frame(pixels))).toBe(true)
  })
})
