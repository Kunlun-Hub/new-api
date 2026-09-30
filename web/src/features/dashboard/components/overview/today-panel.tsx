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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { formatNumber, formatQuota } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange } from '@/lib/time'
import { cn } from '@/lib/utils'

const TOP_MODEL_LIMIT = 5

const TOP_MODEL_SKELETON_KEYS = Array.from(
  { length: TOP_MODEL_LIMIT },
  (_, index) => `top-model-skeleton-${index + 1}`
)

interface ModelUsage {
  model: string
  requests: number
  tokens: number
  quota: number
}

function aggregateModelUsage(
  items: { model_name?: string; count?: number; token_used?: number; quota?: number }[]
): ModelUsage[] {
  const map = new Map<string, ModelUsage>()
  for (const item of items) {
    const model = item.model_name?.trim() || 'unknown'
    const entry = map.get(model) ?? { model, requests: 0, tokens: 0, quota: 0 }
    entry.requests += Number(item.count) || 0
    entry.tokens += Number(item.token_used) || 0
    entry.quota += Number(item.quota) || 0
    map.set(model, entry)
  }
  return [...map.values()].sort((a, b) => b.quota - a.quota)
}

export function TodayPanel() {
  const { t } = useTranslation()
  const timeRange = useMemo(() => computeTimeRange(1), [])

  const todayQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'today-usage',
      timeRange.start_timestamp,
      timeRange.end_timestamp,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getUserQuotaDates({
          start_timestamp: timeRange.start_timestamp,
          end_timestamp: timeRange.end_timestamp,
          default_time: 'hour',
        })
      ),
    staleTime: 60 * 1000,
  })

  const queryData = todayQuery.data?.data
  const items = useMemo(() => queryData ?? [], [queryData])
  const totals = useMemo(() => {
    let requests = 0
    let tokens = 0
    let quota = 0
    for (const item of items) {
      requests += Number(item.count) || 0
      tokens += Number(item.token_used) || 0
      quota += Number(item.quota) || 0
    }
    return { requests, tokens, quota }
  }, [items])

  const topModels = useMemo(
    () => aggregateModelUsage(items).slice(0, TOP_MODEL_LIMIT),
    [items]
  )
  const maxQuota = topModels[0]?.quota ?? 0

  const stats = [
    { label: t('Requests'), value: formatNumber(totals.requests) },
    { label: t('Tokens'), value: formatNumber(totals.tokens) },
    { label: t('Consumed'), value: formatQuota(totals.quota) },
  ]

  return (
    <div className='grid gap-4 lg:grid-cols-5'>
      <div className='rounded-2xl border bg-card p-5 shadow-xs lg:col-span-2'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold tracking-tight'>
            {t("Today's usage")}
          </h3>
          <Link
            to='/dashboard/$section'
            params={{ section: 'models' }}
            className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
          >
            {t('View all')}
            <ArrowRight className='size-3.5' aria-hidden='true' />
          </Link>
        </div>
        {todayQuery.isLoading ? (
          <div className='mt-4 grid grid-cols-3 gap-3'>
            {stats.map((stat) => (
              <div key={stat.label}>
                <Skeleton className='h-4 w-14' />
                <Skeleton className='mt-2 h-7 w-20' />
              </div>
            ))}
          </div>
        ) : (
          <div className='mt-4 grid grid-cols-3 gap-3'>
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className='text-muted-foreground text-xs'>{stat.label}</div>
                <div className='mt-1 text-2xl font-bold tracking-tight tabular-nums'>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='rounded-2xl border bg-card p-5 shadow-xs lg:col-span-3'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold tracking-tight'>
            {t('Top models')}
          </h3>
          <Link
            to='/pricing'
            className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
          >
            {t('View all')}
            <ArrowRight className='size-3.5' aria-hidden='true' />
          </Link>
        </div>
        {todayQuery.isLoading && (
          <div className='mt-4 space-y-3'>
            {TOP_MODEL_SKELETON_KEYS.map((key) => (
              <div key={key} className='flex items-center gap-3'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-2 flex-1 rounded-full' />
                <Skeleton className='h-4 w-16' />
              </div>
            ))}
          </div>
        )}
        {!todayQuery.isLoading && topModels.length === 0 && (
          <p className='text-muted-foreground mt-4 text-sm'>
            {t('No data yet today')}
          </p>
        )}
        {!todayQuery.isLoading && topModels.length > 0 && (
          <ul className='mt-4 space-y-3'>
            {topModels.map((entry) => (
              <li key={entry.model} className='flex items-center gap-3'>
                <span className='w-32 shrink-0 truncate text-sm font-medium'>
                  {entry.model}
                </span>
                <div className='bg-muted h-2 flex-1 overflow-hidden rounded-full'>
                  <div
                    className={cn('bg-primary h-full rounded-full')}
                    style={{
                      width: `${maxQuota > 0 ? Math.max(4, (entry.quota / maxQuota) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className='text-muted-foreground w-20 shrink-0 text-right text-xs tabular-nums'>
                  {formatQuota(entry.quota)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
