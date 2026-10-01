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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  Database,
  DollarSign,
  RefreshCw,
  TextInitial,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatLogQuota, formatQuotaFixed } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { getLogStats, getUserLogStats } from '../api'
import { DEFAULT_LOG_STATS } from '../constants'
import { buildApiParams, getDefaultTimeRange } from '../lib/utils'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

interface SummaryCardProps {
  icon: LucideIcon
  title: string
  description: string
  value: ReactNode
  action?: ReactNode
}

function SummaryCard(props: SummaryCardProps) {
  const Icon = props.icon
  return (
    <div
      className={cn(
        'border-border/40 bg-card/30 flex items-center gap-3 rounded-xl border p-4',
        'bg-linear-to-br from-foreground/3 to-transparent transition duration-300',
        'hover:from-foreground/4 hover:shadow-md',
        'max-md:flex-col'
      )}
    >
      <div className='bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center self-start rounded-full max-md:hidden'>
        <Icon className='size-5' aria-hidden='true' />
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='text-sm font-medium'>{props.title}</div>
        <div className='text-muted-foreground truncate text-xs'>
          {props.description}
        </div>
      </div>
      <div className='flex shrink-0 items-center gap-x-1'>
        <div className='mr-1 truncate text-lg font-semibold tabular-nums'>
          {props.value}
        </div>
        {props.action}
      </div>
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <div className='border-border/40 bg-card/30 flex items-center gap-3 rounded-xl border p-4'>
      <Skeleton className='size-10 shrink-0 rounded-full' />
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-3 w-40' />
      </div>
      <Skeleton className='h-5 w-16' />
    </div>
  )
}

/**
 * Interval cost / RPM / TPM / MPM cards shown above the usage log table.
 */
export function CommonLogsSummaryCards() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const { sensitiveVisible } = useUsageLogsContext()
  const searchParams = route.useSearch()

  const [costVisible, setCostVisible] = useState(false)

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['usage-logs-stats', isAdmin, searchParams],
    queryFn: async () => {
      const params = buildApiParams({
        page: 1,
        pageSize: 1,
        searchParams,
        columnFilters: [],
        isAdmin,
      })

      const result = isAdmin
        ? requireServerSuccess(await getLogStats(params))
        : requireServerSuccess(await getUserLogStats(params))

      return result.success
        ? result.data || DEFAULT_LOG_STATS
        : DEFAULT_LOG_STATS
    },
    placeholderData: (previousData) => previousData,
  })

  const { start, end } = getDefaultTimeRange()
  const rangeStart = searchParams.startTime
    ? new Date(searchParams.startTime)
    : start
  const rangeEnd = searchParams.endTime ? new Date(searchParams.endTime) : end
  const rangeMinutes = Math.max(
    1,
    (rangeEnd.getTime() - rangeStart.getTime()) / 60_000
  )
  const quota = stats?.quota || 0
  const costPerMinute = quota / rangeMinutes

  const hideCost = !sensitiveVisible
  let intervalCost = '-'
  if (costVisible) {
    intervalCost = formatLogQuota(quota)
  }
  if (hideCost) {
    intervalCost = '••••'
  }

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4'>
        {Array.from({ length: 4 }, (_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4'>
      <SummaryCard
        icon={Database}
        title={t('Interval Cost')}
        description={t('Total cost in selected period')}
        value={intervalCost}
        action={
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              setCostVisible(true)
              void refetch()
            }}
          >
            {costVisible ? t('Refresh') : t('View')}
          </Button>
        }
      />
      <SummaryCard
        icon={Zap}
        title={t('Current RPM')}
        description={t('Requests per minute')}
        value={stats?.rpm || 0}
        action={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={t('Refresh')}
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ['usage-logs-stats'],
                    })
                    queryClient.invalidateQueries({ queryKey: ['logs'] })
                  }}
                />
              }
            >
              <RefreshCw className='size-4' aria-hidden='true' />
            </TooltipTrigger>
            <TooltipContent>{t('Refresh')}</TooltipContent>
          </Tooltip>
        }
      />
      <SummaryCard
        icon={TextInitial}
        title={t('Current TPM')}
        description={t('Tokens per minute')}
        value={stats?.tpm || 0}
      />
      <SummaryCard
        icon={DollarSign}
        title={t('Current MPM')}
        description={t('Cost per minute')}
        value={hideCost ? '••••' : formatQuotaFixed(costPerMinute)}
      />
    </div>
  )
}
