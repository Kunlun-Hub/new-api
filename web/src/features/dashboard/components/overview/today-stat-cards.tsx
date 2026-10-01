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
import { Coins, Database, DatabaseZap } from 'lucide-react'
import { useMemo, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { getUserQuotaDates } from '@/features/dashboard/api'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { formatNumber, formatQuota } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange } from '@/lib/time'

const CARD_CLASS =
  'h-26 flex items-center justify-between overflow-hidden rounded-xl border border-border/40 bg-transparent bg-linear-to-br from-foreground/3 via-transparent to-transparent py-0 ring-0 transition-shadow hover:border-border/60 hover:shadow-md'

interface TodayStat {
  key: string
  label: string
  value: number
  display: string
  icon: ComponentType<{ className?: string }>
  color: string
}

function useTodayQuotaData() {
  const timeRange = useMemo(
    () => computeTimeRange(1, undefined, undefined, true),
    []
  )

  return useQuery({
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
}

function sumQuotaData(items: QuotaDataItem[]) {
  let count = 0
  let tokens = 0
  let quota = 0
  for (const item of items) {
    count += Number(item.count) || 0
    tokens += Number(item.token_used) || 0
    quota += Number(item.quota) || 0
  }
  return { count, tokens, quota }
}

export function TodayStatCards() {
  const { t } = useTranslation()
  const query = useTodayQuotaData()
  const totals = useMemo(
    () => sumQuotaData(query.data?.data ?? []),
    [query.data]
  )

  const stats: TodayStat[] = [
    {
      key: 'usage',
      label: t('Today Usage'),
      value: totals.quota,
      display: formatQuota(totals.quota),
      icon: DatabaseZap,
      color: 'rgb(236, 72, 153)',
    },
    {
      key: 'requests',
      label: t('Today Requests'),
      value: totals.count,
      display: formatNumber(totals.count),
      icon: Database,
      color: 'rgb(20, 184, 166)',
    },
    {
      key: 'tokens',
      label: t('Today Tokens'),
      value: totals.tokens,
      display: formatNumber(totals.tokens),
      icon: Coins,
      color: 'rgb(245, 158, 11)',
    },
  ]

  return (
    <div className='grid gap-4 md:grid-cols-3'>
      {stats.map((stat) => (
        <div key={stat.key} className={CARD_CLASS}>
          <div className='flex h-26 items-center gap-4 px-5 py-0'>
            <div
              className='flex size-12 shrink-0 items-center justify-center rounded-full'
              style={{ backgroundColor: stat.color }}
            >
              <stat.icon className='h-5 w-5 text-white' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='text-muted-foreground text-xs 2xl:text-sm'>
                {stat.label}
              </div>
              {query.isLoading ? (
                <Skeleton className='mt-1 h-8 w-20' />
              ) : (
                <div className='mt-1 truncate text-2xl font-bold tracking-tight'>
                  {stat.display}
                </div>
              )}
            </div>
          </div>
          <div className='h-26 w-2/3 md:max-xl:hidden' />
        </div>
      ))}
    </div>
  )
}
