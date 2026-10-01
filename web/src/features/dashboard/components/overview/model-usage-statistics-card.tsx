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
import { VChart } from '@visactor/react-vchart'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { NoDataIllustration } from '@/components/empty-illustrations'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/context/theme-provider'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { getDashboardChartColors } from '@/features/dashboard/lib/charts'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { formatNumber, formatQuota, formatQuotaFixed } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange, type TimeGranularity } from '@/lib/time'
import { cn } from '@/lib/utils'
import { VCHART_OPTION } from '@/lib/vchart'

const CARD_CLASS =
  'border border-border/40 ring-0 bg-transparent bg-linear-to-br from-foreground/3 via-transparent to-transparent'

const METRICS = ['quota', 'count', 'tokens'] as const
type UsageMetric = (typeof METRICS)[number]

const METRIC_LABEL_KEYS: Record<UsageMetric, string> = {
  quota: 'Usage Share',
  count: 'Call Share',
  tokens: 'Token Share',
}

const TOP_MODEL_LIMIT = 8
const SHARE_WINDOW_DAYS = 7
const SHARE_SYNC_DELAY_MINUTES = 20

interface ModelShare {
  model: string
  quota: number
  count: number
  tokens: number
}

function aggregateModelShares(items: QuotaDataItem[]): ModelShare[] {
  const map = new Map<string, ModelShare>()
  for (const item of items) {
    const model = item.model_name?.trim() || 'unknown'
    const entry = map.get(model) ?? {
      model,
      quota: 0,
      count: 0,
      tokens: 0,
    }
    entry.quota += Number(item.quota) || 0
    entry.count += Number(item.count) || 0
    entry.tokens += Number(item.token_used) || 0
    map.set(model, entry)
  }
  return [...map.values()].sort((a, b) => b.quota - a.quota)
}

export function ModelUsageStatisticsCard({
  className,
}: {
  className?: string
}) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const [granularity, setGranularity] = useState<TimeGranularity>('day')
  const [metric, setMetric] = useState<UsageMetric>('quota')
  const [themeReady, setThemeReady] = useState(false)
  const themeManagerRef = useRef<
    (typeof import('@visactor/vchart'))['ThemeManager'] | null
  >(null)

  const timeRange = useMemo(() => computeTimeRange(SHARE_WINDOW_DAYS), [])

  const query = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'model-usage-statistics',
      timeRange.start_timestamp,
      timeRange.end_timestamp,
      granularity,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getUserQuotaDates({
          start_timestamp: timeRange.start_timestamp,
          end_timestamp: timeRange.end_timestamp,
          default_time: granularity,
        })
      ),
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    let cancelled = false
    const applyTheme = async () => {
      setThemeReady(false)
      const { ThemeManager } = await import('@visactor/vchart')
      if (cancelled) return
      themeManagerRef.current = ThemeManager
      ThemeManager.setCurrentTheme(resolvedTheme === 'dark' ? 'dark' : 'light')
      setThemeReady(true)
    }
    applyTheme()
    return () => {
      cancelled = true
    }
  }, [resolvedTheme])

  const items = useMemo(() => query.data?.data ?? [], [query.data])

  const shares = useMemo(() => aggregateModelShares(items), [items])

  const totals = useMemo(() => {
    let quota = 0
    for (const item of items) quota += Number(item.quota) || 0
    return quota
  }, [items])

  const chartValues = useMemo(() => {
    const positive = shares.filter((entry) => entry[metric] > 0)
    if (positive.length <= TOP_MODEL_LIMIT) {
      return positive.map((entry) => ({
        type: entry.model,
        value: entry[metric],
      }))
    }
    const head = positive.slice(0, TOP_MODEL_LIMIT)
    const rest = positive
      .slice(TOP_MODEL_LIMIT)
      .reduce((sum, entry) => sum + entry[metric], 0)
    return [
      ...head.map((entry) => ({ type: entry.model, value: entry[metric] })),
      { type: t('Other'), value: rest },
    ]
  }, [shares, metric, t])

  const formatValue = useMemo(() => {
    if (metric === 'quota') return (value: number) => formatQuota(value)
    return (value: number) => formatNumber(value)
  }, [metric])

  const spec = useMemo(() => {
    const colors = getDashboardChartColors(chartValues.length)
    return {
      type: 'pie',
      data: [{ id: 'modelShare', values: chartValues }],
      outerRadius: 0.8,
      innerRadius: 0.55,
      padAngle: 0.6,
      valueField: 'value',
      categoryField: 'type',
      legends: {
        visible: true,
        orient: 'left',
        item: { shape: { style: { size: 8 } } },
      },
      label: { visible: false },
      color: colors,
      background: { fill: 'transparent' },
      animation: true,
      tooltip: {
        mark: {
          content: [
            {
              key: (datum: Record<string, unknown>) =>
                String(datum?.type ?? ''),
              value: (datum: Record<string, unknown>) =>
                formatValue(Number(datum?.value) || 0),
            },
          ],
        },
      },
    }
  }, [chartValues, formatValue])

  const chartKey = [
    metric,
    granularity,
    resolvedTheme,
    chartValues.length,
    query.dataUpdatedAt,
  ].join('-')

  const hasData = chartValues.length > 0
  const dailyAverage = totals / SHARE_WINDOW_DAYS

  let chartContent: ReactNode = null
  if (query.isLoading) {
    chartContent = <Skeleton className='h-64 w-full' />
  } else if (hasData && themeReady) {
    chartContent = (
      <div className='h-[320px] w-full'>
        <VChart
          key={chartKey}
          spec={{
            ...spec,
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          }}
          option={VCHART_OPTION}
        />
      </div>
    )
  } else if (!hasData) {
    chartContent = (
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <NoDataIllustration />
          </EmptyMedia>
          <EmptyDescription>{t('No data')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Card className={cn(CARD_CLASS, className)}>
      <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
        <CardTitle className='flex items-center gap-2 text-base leading-snug font-medium'>
          <TrendingUp className='size-4' aria-hidden='true' />
          {t('Model Usage Statistics')}
        </CardTitle>
        <div className='flex items-center gap-2'>
          <ButtonGroup>
            {(['hour', 'day'] as const).map((value) => (
              <Button
                key={value}
                variant={granularity === value ? 'secondary' : 'outline'}
                size='sm'
                onClick={() => setGranularity(value)}
              >
                {t(value === 'hour' ? 'Hour' : 'Day')}
              </Button>
            ))}
          </ButtonGroup>
          <Button
            variant='outline'
            size='sm'
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={cn('size-3.5', query.isFetching && 'animate-spin')}
              aria-hidden='true'
            />
            {t('Refresh')}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={metric}
          onValueChange={(value) => setMetric(value as UsageMetric)}
        >
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <TabsList className='border-border/40 bg-background/40 h-9 w-fit gap-1 rounded-full border p-1'>
              {METRICS.map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className='text-muted-foreground data-active:bg-foreground data-active:text-background h-auto flex-none rounded-full px-3 py-1 shadow-none'
                >
                  {t(METRIC_LABEL_KEYS[value])}
                </TabsTrigger>
              ))}
            </TabsList>
            <span className='text-muted-foreground text-xs'>
              {t('Sync delay: {{minutes}} minutes', {
                minutes: SHARE_SYNC_DELAY_MINUTES,
              })}
            </span>
          </div>

          <div className='mt-4'>
            <div className='text-muted-foreground text-sm'>
              {t('Spent {{total}} in last {{days}} days, avg {{average}}/day', {
                total: formatQuotaFixed(totals),
                days: SHARE_WINDOW_DAYS,
                average: formatQuotaFixed(dailyAverage),
              })}
            </div>

            <div className='mt-4 flex min-h-[320px] items-center justify-center'>
              {chartContent}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
