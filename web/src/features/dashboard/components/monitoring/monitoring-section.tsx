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
import { Activity } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPerfMetricsMonitoring } from '@/features/performance-metrics/api'
import {
  formatLatency,
  formatThroughput,
  formatUptimePct,
  getSuccessRateDotClass,
  getSuccessRateTextClass,
} from '@/features/performance-metrics/lib/format'
import type {
  MonitoringGroup,
  MonitoringModel,
  MonitoringSuccessPoint,
} from '@/features/performance-metrics/types'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

const WINDOW_HOURS_OPTIONS = [1, 6, 24]
const TREND_POINTS = 12

export function MonitoringSection() {
  const { t } = useTranslation()
  const [hours, setHours] = useState(1)

  const monitoringQuery = useQuery({
    queryKey: ['perf-metrics-monitoring', hours],
    queryFn: async () =>
      requireServerSuccess(await getPerfMetricsMonitoring(hours)),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
  })

  const groups = monitoringQuery.data?.data.groups ?? []
  const loading = monitoringQuery.isLoading
  const isError = monitoringQuery.isError

  let content: React.ReactNode
  if (loading) {
    content = <MonitoringSkeleton />
  } else if (isError || groups.length === 0) {
    content = (
      <EmptyState
        icon={Activity}
        title={t('No monitoring data available')}
        description={t(
          'No model requests were recorded in the selected time window.'
        )}
        bordered
      />
    )
  } else {
    content = groups.map((group) => (
      <GroupMonitoringCard key={group.group} group={group} />
    ))
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-muted-foreground text-xs'>
          {t('Model status monitoring')}
        </p>
        <Tabs
          value={String(hours)}
          onValueChange={(value) => setHours(Number(value))}
        >
          <TabsList>
            {WINDOW_HOURS_OPTIONS.map((option) => (
              <TabsTrigger key={option} value={String(option)}>
                {t('Last {{hours}}h', { hours: option })}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {content}
    </div>
  )
}

function MonitoringSkeleton() {
  return (
    <div className='space-y-4'>
      {[0, 1].map((index) => (
        <div key={index} className='overflow-hidden rounded-lg border'>
          <div className='flex items-center gap-4 px-4 py-3'>
            <Skeleton className='h-5 w-24' />
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-4 w-24' />
          </div>
          <div className='space-y-2 px-4 pb-4'>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className='h-8 w-full' />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupMonitoringCard(props: { group: MonitoringGroup }) {
  const { t } = useTranslation()
  const group = props.group

  return (
    <section
      aria-label={group.group}
      className='overflow-hidden rounded-lg border'
    >
      <header className='flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5'>
        <span className='bg-muted inline-flex items-center rounded-md px-2 py-1 font-mono text-xs font-semibold'>
          {group.group}
        </span>
        <GroupStat
          label={t('Availability')}
          value={formatUptimePct(group.success_rate)}
          valueClassName={getSuccessRateTextClass(group.success_rate)}
          dotClassName={getSuccessRateDotClass(group.success_rate)}
        />
        <GroupStat
          label={t('TTFT')}
          value={formatLatency(group.avg_ttft_ms)}
        />
        <GroupStat
          label={t('Requests')}
          value={String(group.request_count)}
        />
      </header>
      <div className='border-t'>
        <StaticDataTable<MonitoringModel>
          data={group.models}
          getRowKey={(row) => row.model_name}
          columns={[
            {
              id: 'model',
              header: t('Model'),
              cell: (row) => (
                <span className='font-mono text-xs'>{row.model_name}</span>
              ),
            },
            {
              id: 'ttft',
              header: t('TTFT'),
              cell: (row) => (
                <span className='font-mono text-xs tabular-nums'>
                  {formatLatency(row.avg_ttft_ms)}
                </span>
              ),
            },
            {
              id: 'latency',
              header: t('Latency'),
              cell: (row) => (
                <span className='font-mono text-xs tabular-nums'>
                  {formatLatency(row.avg_latency_ms)}
                </span>
              ),
            },
            {
              id: 'tps',
              header: t('TPS'),
              cell: (row) => (
                <span className='font-mono text-xs tabular-nums'>
                  {formatThroughput(row.avg_tps)}
                </span>
              ),
            },
            {
              id: 'success',
              header: t('Success'),
              cell: (row) => (
                <span className='inline-flex items-center gap-1.5'>
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      getSuccessRateDotClass(row.success_rate)
                    )}
                    aria-hidden='true'
                  />
                  <span
                    className={cn(
                      'font-mono text-xs font-semibold tabular-nums',
                      getSuccessRateTextClass(row.success_rate)
                    )}
                  >
                    {formatUptimePct(row.success_rate)}
                  </span>
                </span>
              ),
            },
            {
              id: 'trend',
              header: t('Trend'),
              cell: (row) => (
                <TrendSparkline
                  series={row.recent_success_series ?? []}
                  label={row.model_name}
                />
              ),
            },
          ]}
        />
      </div>
    </section>
  )
}

function GroupStat(props: {
  label: string
  value: string
  valueClassName?: string
  dotClassName?: string
}) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      {props.dotClassName && (
        <span
          className={cn('size-1.5 rounded-full', props.dotClassName)}
          aria-hidden='true'
        />
      )}
      <span className='text-muted-foreground text-[11px]'>{props.label}</span>
      <span
        className={cn(
          'font-mono text-xs font-semibold tabular-nums',
          props.valueClassName
        )}
      >
        {props.value}
      </span>
    </span>
  )
}

function TrendSparkline(props: {
  series: MonitoringSuccessPoint[]
  label: string
}) {
  const { t } = useTranslation()
  const points = props.series.slice(-TREND_POINTS)

  if (points.length === 0) {
    return <span className='text-muted-foreground text-xs'>—</span>
  }

  return (
    <span
      className='flex h-5 items-end gap-[2px]'
      role='img'
      aria-label={t('Success rate trend for {{model}}', {
        model: props.label,
      })}
    >
      {points.map((point) => (
        <span
          key={point.ts}
          title={`${formatUptimePct(point.success_rate)}`}
          className={cn(
            'w-1 rounded-sm',
            getSuccessRateDotClass(point.success_rate),
            trendBarHeight(point.success_rate)
          )}
          aria-hidden='true'
        />
      ))}
    </span>
  )
}

function trendBarHeight(successRate: number): string {
  if (successRate >= 99.9) return 'h-full'
  if (successRate >= 99) return 'h-[88%]'
  if (successRate >= 95) return 'h-[72%]'
  if (successRate >= 90) return 'h-[55%]'
  return 'h-[40%]'
}
