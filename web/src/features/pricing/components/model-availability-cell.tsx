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
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getSuccessRateDotClass,
  getSuccessRateTextClass,
} from '@/features/performance-metrics/lib/format'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { ModelPerfBadgeData } from './model-perf-badge'

const STATUS_SLOTS = Array.from({ length: 24 }, (_, slot) => slot)

/**
 * Hourly success-rate bars for the model square table. Models without traffic
 * in the window fall back to a muted dash instead of a misleading 0%.
 */
export const ModelAvailabilityCell = memo(
  function ModelAvailabilityCell(props: { perf?: ModelPerfBadgeData }) {
    const { t } = useTranslation()
    const successRate = props.perf?.success_rate
    const hasSuccessRate =
      successRate != null &&
      Number.isFinite(successRate) &&
      successRate >= 0 &&
      successRate <= 100

    const statusRates = useMemo(() => {
      const windowStart = props.perf?.window_start
      if (windowStart == null) return STATUS_SLOTS.map(() => undefined)
      const ratesByHour = new Map<number, number>()
      for (const point of props.perf?.recent_success_series ?? []) {
        ratesByHour.set(point.ts, point.success_rate)
      }
      return STATUS_SLOTS.map((slot) =>
        ratesByHour.get(windowStart + slot * 3600)
      )
    }, [props.perf?.recent_success_series, props.perf?.window_start])

    if (!hasSuccessRate) {
      return (
        <span className='text-muted-foreground mx-auto block w-36 text-center text-xs'>
          —
        </span>
      )
    }

    return (
      <div
        className='mx-auto w-36'
        role='img'
        aria-label={t('Request success rate sampled over the last 24 hours')}
      >
        <div className='flex w-full flex-wrap items-center justify-between gap-1'>
          <div className='flex items-center gap-x-2'>
            <div className='flex min-w-0 items-center gap-[3px]'>
              {STATUS_SLOTS.map((slot) => {
                const rate = statusRates[slot]
                const hasRate =
                  rate != null &&
                  Number.isFinite(rate) &&
                  rate >= 0 &&
                  rate <= 100
                return (
                  <span
                    key={slot}
                    aria-hidden
                    style={{ minWidth: 2 }}
                    className={cn(
                      'inline-block h-2 rounded-sm transition-colors',
                      hasRate
                        ? getSuccessRateDotClass(rate)
                        : 'bg-muted-foreground/20'
                    )}
                  />
                )
              })}
            </div>
            <span
              className={cn(
                'shrink-0 text-[11px]! font-semibold tabular-nums',
                getSuccessRateTextClass(successRate)
              )}
            >
              {formatPercent(successRate)}
            </span>
          </div>
        </div>
      </div>
    )
  }
)
