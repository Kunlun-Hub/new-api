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
import { Activity, Search as SearchIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formatUptimePct,
  getSuccessRateTextClass,
} from '@/features/performance-metrics/lib/format'
import type { MonitoringGroup } from '@/features/performance-metrics/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { GroupMonitoringCard } from './components/group-monitoring-card'
import {
  MONITORING_SORT_OPTIONS,
  MONITORING_WINDOW_HOURS,
  type MonitoringSort,
} from './constants'
import { useMonitoring } from './hooks/use-monitoring'

/** Groups without TTFT samples sort last instead of first. */
function ttftRank(group: MonitoringGroup): number {
  return group.avg_ttft_ms > 0 ? group.avg_ttft_ms : Number.MAX_SAFE_INTEGER
}

function sortGroups(
  groups: MonitoringGroup[],
  sort: MonitoringSort
): MonitoringGroup[] {
  if (sort === 'default') return groups
  const sorted = [...groups]
  if (sort === 'availability') {
    sorted.sort((a, b) => b.success_rate - a.success_rate)
  } else if (sort === 'ttft') {
    sorted.sort((a, b) => ttftRank(a) - ttftRank(b))
  } else if (sort === 'requests') {
    sorted.sort((a, b) => b.request_count - a.request_count)
  }
  return sorted
}

function matchesSearch(group: MonitoringGroup, query: string): boolean {
  if (group.group.toLowerCase().includes(query)) return true
  return group.models.some((model) =>
    model.model_name.toLowerCase().includes(query)
  )
}

export function Monitoring() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)

  const [hours, setHours] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<MonitoringSort>('default')

  const monitoringQuery = useMonitoring(hours)
  const groups = useMemo(
    () => monitoringQuery.data?.data.groups ?? [],
    [monitoringQuery.data]
  )

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? groups.filter((group) => matchesSearch(group, query))
      : groups
    return sortGroups(filtered, sort)
  }, [groups, search, sort])

  const averageAvailability = useMemo(() => {
    const requests = groups.reduce((sum, group) => sum + group.request_count, 0)
    if (requests === 0) return null
    const weighted = groups.reduce(
      (sum, group) => sum + group.success_rate * group.request_count,
      0
    )
    return weighted / requests
  }, [groups])

  const sortOptions = MONITORING_SORT_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }))

  let content: ReactNode
  if (monitoringQuery.isLoading) {
    content = <MonitoringSkeleton />
  } else if (monitoringQuery.isError || groups.length === 0) {
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
  } else if (visibleGroups.length === 0) {
    content = (
      <EmptyState
        icon={Activity}
        title={t('No groups match your search')}
        bordered
      />
    )
  } else {
    content = (
      <div className='space-y-4'>
        {visibleGroups.map((group) => (
          <GroupMonitoringCard
            key={group.group}
            group={group}
            hours={hours}
            locale={locale}
          />
        ))}
      </div>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition className='mx-auto w-full max-w-[1280px] space-y-6 px-3 pt-16 pb-10 sm:px-6 sm:pt-20 xl:px-8'>
        <header className='space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h1 className='text-xl font-semibold'>{t('Model Monitoring')}</h1>
              <p className='text-muted-foreground text-sm'>
                {t('Model status monitoring')}
              </p>
            </div>
            <Tabs
              value={String(hours)}
              onValueChange={(value) => setHours(Number(value))}
            >
              <TabsList>
                {MONITORING_WINDOW_HOURS.map((option) => (
                  <TabsTrigger key={option} value={String(option)}>
                    {t('Last {{hours}}h', { hours: option })}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <dl className='flex flex-wrap items-center gap-x-6 gap-y-2'>
            <HeaderStat
              label={t('Groups')}
              value={formatNumber(groups.length, locale)}
            />
            <HeaderStat
              label={t('Average availability')}
              value={
                averageAvailability == null
                  ? '—'
                  : formatUptimePct(averageAvailability)
              }
              valueClassName={
                averageAvailability == null
                  ? undefined
                  : getSuccessRateTextClass(averageAvailability)
              }
            />
          </dl>
        </header>

        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='relative w-full sm:w-64'>
            <SearchIcon
              aria-hidden='true'
              className='text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2'
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Search groups')}
              aria-label={t('Search groups')}
              className='ps-8'
            />
          </div>
          <Select
            items={sortOptions}
            value={sort}
            onValueChange={(value) => {
              if (value !== null) setSort(value as MonitoringSort)
            }}
          >
            <SelectTrigger className='w-40' aria-label={t('Sort')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {content}
      </PageTransition>
    </PublicLayout>
  )
}

function HeaderStat(props: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className='flex items-baseline gap-1.5'>
      <dt className='text-muted-foreground text-xs'>{props.label}</dt>
      <dd
        className={cn(
          'font-mono text-sm font-semibold tabular-nums',
          props.valueClassName
        )}
      >
        {props.value}
      </dd>
    </div>
  )
}

function MonitoringSkeleton() {
  return (
    <div className='space-y-4'>
      {[0, 1].map((index) => (
        <div
          key={index}
          className='bg-card overflow-hidden rounded-xl border p-4 sm:p-5'
        >
          <div className='grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]'>
            <div className='space-y-3'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-7 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-3 w-40' />
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className='h-7 w-full' />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
