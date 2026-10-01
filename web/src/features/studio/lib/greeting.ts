export type GreetingPeriod =
  | 'night'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'evening'

/** Resolve the greeting slot used by the studio pages, mirroring the reference site. */
export function getGreetingPeriod(date: Date = new Date()): GreetingPeriod {
  const hour = date.getHours()
  if (hour < 5) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 13) return 'noon'
  if (hour < 18) return 'afternoon'
  return 'evening'
}
