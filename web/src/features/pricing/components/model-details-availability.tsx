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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { getPerfMetrics } from '@/features/performance-metrics/api'
import { formatUptimePct } from '@/features/performance-metrics/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import type { PricingModel } from '../types'
import { GroupUptimeTrendChart } from './model-details-charts'

const GROUP_COLORS = [
  'rgb(59, 130, 246)',
  'rgb(16, 185, 129)',
  'rgb(245, 158, 11)',
  'rgb(168, 85, 247)',
  'rgb(244, 63, 94)',
]

type GroupSeries = {
  group: string
  color: string
  uptimePct: number
  points: { ts: number; successRate: number }[]
}

export function ModelAvailabilitySection(props: { model: PricingModel }) {
  const { t } = useTranslation()
  const metricsQuery = useQuery({
    queryKey: ['perf-metrics', props.model.model_name],
    queryFn: async () =>
      requireServerSuccess(await getPerfMetrics(props.model.model_name, 24)),
    staleTime: 60 * 1000,
  })

  const groups = useMemo<GroupSeries[]>(
    () =>
      (metricsQuery.data?.data.groups ?? []).map((group, index) => ({
        group: group.group,
        color: GROUP_COLORS[index % GROUP_COLORS.length],
        uptimePct: Number.isFinite(group.success_rate)
          ? Math.min(100, Math.max(0, group.success_rate))
          : 0,
        points: group.series.map((point) => ({
          ts: point.ts,
          successRate: Number.isFinite(point.success_rate)
            ? Math.min(100, Math.max(0, point.success_rate))
            : 0,
        })),
      })),
    [metricsQuery.data]
  )

  const hasData = groups.some((group) => group.points.length > 0)

  return (
    <section className='border-border/50 bg-card/50 overflow-hidden rounded-xl border'>
      <div className='border-border/40 border-b px-6 py-4'>
        <h2 className='text-foreground text-sm font-medium'>
          {t('Uptime monitoring')}
        </h2>
        <p className='text-muted-foreground mt-0.5 text-xs'>
          {t('Uptime trend by group over the last 24 hours')}
        </p>
      </div>
      <div className='p-4 md:p-6'>
        {hasData ? (
          <div className='space-y-4'>
            <div className='flex flex-wrap gap-3'>
              {groups.map((group) => (
                <div
                  key={group.group}
                  className='flex items-center gap-2 text-sm'
                >
                  <span
                    className='inline-block h-3 w-3 rounded-full'
                    style={{ backgroundColor: group.color }}
                  />
                  <span className='text-muted-foreground'>{group.group}</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      group.uptimePct >= 99
                        ? 'text-green-600'
                        : 'text-amber-600'
                    )}
                  >
                    {formatUptimePct(group.uptimePct)}
                  </span>
                </div>
              ))}
            </div>
            <GroupUptimeTrendChart
              className='h-64 md:h-80'
              groups={groups.map((group) => ({
                group: group.group,
                color: group.color,
                points: group.points.map((point) => ({
                  ts: point.ts,
                  successRate: point.successRate,
                })),
              }))}
            />
          </div>
        ) : (
          <div className='text-muted-foreground flex h-40 items-center justify-center rounded-lg border text-xs'>
            {metricsQuery.isLoading
              ? t('Loading...')
              : t('No uptime data available')}
          </div>
        )}
      </div>
    </section>
  )
}
