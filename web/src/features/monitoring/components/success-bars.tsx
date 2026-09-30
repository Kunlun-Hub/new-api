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
import {
  formatUptimePct,
  getSuccessRateDotClass,
} from '@/features/performance-metrics/lib/format'
import type { MonitoringSuccessPoint } from '@/features/performance-metrics/types'
import { cn } from '@/lib/utils'

/**
 * One segment per hourly bucket, colored by that bucket's success rate.
 * An empty series renders a muted placeholder so the card keeps its height.
 */
export function SuccessBars(props: {
  series: MonitoringSuccessPoint[]
  label: string
  className?: string
}) {
  if (props.series.length === 0) {
    return (
      <div
        role='img'
        aria-label={props.label}
        className={cn('bg-muted/60 h-7 rounded', props.className)}
      />
    )
  }

  return (
    <div
      role='img'
      aria-label={props.label}
      className={cn('flex h-7 items-stretch gap-[2px]', props.className)}
    >
      {props.series.map((point) => (
        <span
          key={point.ts}
          title={formatUptimePct(point.success_rate)}
          className={cn(
            'flex-1 rounded-[2px]',
            getSuccessRateDotClass(point.success_rate)
          )}
        />
      ))}
    </div>
  )
}
