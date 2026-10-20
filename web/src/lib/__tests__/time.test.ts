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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { computeTimeRange } from '@/lib/time'

const NOW = new Date(2026, 9, 7, 10, 30, 0)
const TODAY_START = Math.floor(new Date(2026, 9, 7, 0, 0, 0, 0).getTime() / 1000)
const END_OF_TODAY = TODAY_START + 24 * 3600 - 1

describe('computeTimeRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('covers the current day only for a one-day start-of-day range', () => {
    const range = computeTimeRange(1, undefined, undefined, true)

    expect(range.start_timestamp).toBe(TODAY_START)
    expect(range.end_timestamp).toBe(END_OF_TODAY)
  })

  it('counts the end day towards multi-day start-of-day ranges', () => {
    const range = computeTimeRange(7, undefined, undefined, true)

    expect(range.start_timestamp).toBe(TODAY_START - 6 * 24 * 3600)
    expect(range.end_timestamp).toBe(END_OF_TODAY)
  })

  it('keeps the rolling window ending one hour from now by default', () => {
    const nowSeconds = Math.floor(NOW.getTime() / 1000)
    const range = computeTimeRange(1)

    expect(range.start_timestamp).toBe(nowSeconds + 3600 - 24 * 3600)
    expect(range.end_timestamp).toBe(nowSeconds + 3600)
  })
})
