import { describe, expect, it } from 'vitest'

import { getGreetingPeriod } from '../greeting'

describe('getGreetingPeriod', () => {
  it('maps the local hour to the studio greeting slot', () => {
    const cases: Array<[number, string]> = [
      [0, 'night'],
      [4, 'night'],
      [5, 'morning'],
      [10, 'morning'],
      [11, 'noon'],
      [12, 'noon'],
      [13, 'afternoon'],
      [17, 'afternoon'],
      [18, 'evening'],
      [23, 'evening'],
    ]

    for (const [hour, expected] of cases) {
      expect(getGreetingPeriod(new Date(2026, 0, 1, hour, 30))).toBe(expected)
    }
  })
})
