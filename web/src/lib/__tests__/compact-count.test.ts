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
import { describe, expect, it } from 'vitest'

import { formatCompactCount } from '@/lib/format'

describe('formatCompactCount', () => {
  it('keeps counts below one thousand unchanged', () => {
    expect(formatCompactCount(0)).toBe('0')
    expect(formatCompactCount(999)).toBe('999')
  })

  it('abbreviates thousands, millions and billions with K/M/B', () => {
    expect(formatCompactCount(1500)).toBe('1.5K')
    expect(formatCompactCount(50000)).toBe('50K')
    expect(formatCompactCount(1234567)).toBe('1.2M')
    expect(formatCompactCount(3200000000)).toBe('3.2B')
  })

  it('promotes a value that would round up to a full thousand of the smaller unit', () => {
    expect(formatCompactCount(999999)).toBe('1M')
  })

  it('renders a placeholder for missing values', () => {
    expect(formatCompactCount(null)).toBe('-')
    expect(formatCompactCount(undefined)).toBe('-')
    expect(formatCompactCount(Number.NaN)).toBe('-')
  })
})
