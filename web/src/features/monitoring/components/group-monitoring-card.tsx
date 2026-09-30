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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
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
} from '@/features/performance-metrics/types'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { MONITORING_MODEL_PREVIEW_LIMIT } from '../constants'
import { SuccessBars } from './success-bars'

export function GroupMonitoringCard(props: {
  group: MonitoringGroup
  hours: number
  locale?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const group = props.group

  const models = expanded
    ? group.models
    : group.models.slice(0, MONITORING_MODEL_PREVIEW_LIMIT)
  const hiddenCount = group.models.length - models.length

  return (
    <article className='bg-card overflow-hidden rounded-xl border'>
      <div className='grid gap-x-8 gap-y-4 p-4 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)]'>
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <span
              aria-hidden='true'
              className={cn(
                'size-2 shrink-0 rounded-full',
                getSuccessRateDotClass(group.success_rate)
              )}
            />
            <span className='truncate font-mono text-sm font-semibold'>
              {group.group}
            </span>
          </div>

          {group.ratio > 0 && (
            <p className='text-muted-foreground text-xs'>
              {t('Ratio')} ×{group.ratio}
            </p>
          )}

          <SuccessBars
            series={group.recent_success_series ?? []}
            label={t('Availability')}
          />

          <dl className='grid grid-cols-3 gap-x-3 gap-y-1 border-t pt-3'>
            <GroupStat
              label={t('Availability')}
              value={formatUptimePct(group.success_rate)}
              valueClassName={getSuccessRateTextClass(group.success_rate)}
            />
            <GroupStat
              label={t('TTFT')}
              value={formatLatency(group.avg_ttft_ms)}
            />
            <GroupStat
              label={t('Requests')}
              value={formatNumber(group.request_count, props.locale)}
            />
          </dl>
        </div>

        <div className='min-w-0 space-y-2'>
          <p className='text-muted-foreground text-xs'>
            {t('Model performance · last {{hours}}h', { hours: props.hours })}
          </p>
          <StaticDataTable<MonitoringModel>
            data={models}
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
                      aria-hidden='true'
                      className={cn(
                        'size-1.5 rounded-full',
                        getSuccessRateDotClass(row.success_rate)
                      )}
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
                  <SuccessBars
                    className='h-4 w-40'
                    series={row.recent_success_series ?? []}
                    label={t('Success rate trend for {{model}}', {
                      model: row.model_name,
                    })}
                  />
                ),
              },
            ]}
          />

          {hiddenCount > 0 && (
            <Button
              variant='link'
              size='sm'
              className='h-auto px-0 text-xs'
              onClick={() => setExpanded(true)}
            >
              {t('Show all ({{count}})', { count: group.models.length })}
            </Button>
          )}
          {expanded && group.models.length > MONITORING_MODEL_PREVIEW_LIMIT && (
            <Button
              variant='link'
              size='sm'
              className='h-auto px-0 text-xs'
              onClick={() => setExpanded(false)}
            >
              {t('Collapse')}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function GroupStat(props: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className='min-w-0'>
      <dt className='text-muted-foreground text-[11px]'>{props.label}</dt>
      <dd
        className={cn(
          'font-mono text-xs font-semibold tabular-nums',
          props.valueClassName
        )}
      >
        {props.value}
      </dd>
    </div>
  )
}
