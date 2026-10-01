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
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import type { Table } from '@tanstack/react-table'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMediaQuery } from '@/hooks'

import { buildSearchParams } from '../lib/filter'
import { getDefaultTimeRange } from '../lib/utils'
import type { DrawingLogFilters, LogCategory, TaskLogFilters } from '../types'
import {
  CompactDateTimeField,
  CompactDateTimeRangePicker,
} from './compact-date-time-range-picker'
import {
  LogsFilterField,
  LogsFilterInput,
  LogsFilterToolbar,
} from './logs-filter-toolbar'
import { useLogsViewScope } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

type TaskLikeLogCategory = Extract<LogCategory, 'drawing' | 'task'>
type TaskLogsFilters = DrawingLogFilters | TaskLogFilters

const ALL_STATUS_VALUE = 'all'
const TASK_STATUS_OPTIONS = [
  { value: 'NOT_START', label: 'Not Started' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SUCCESS', label: 'Completed' },
  { value: 'FAILURE', label: 'Failed' },
  { value: 'UNKNOWN', label: 'Unknown' },
] as const

interface TaskLogsFilterBarProps<TData> {
  table: Table<TData>
  logCategory: TaskLikeLogCategory
}

function getFilterValue(
  filters: TaskLogsFilters,
  logCategory: TaskLikeLogCategory
): string {
  if (logCategory === 'drawing') {
    return (filters as DrawingLogFilters).mjId || ''
  }
  return (filters as TaskLogFilters).taskId || ''
}

function setFilterValue(
  filters: TaskLogsFilters,
  logCategory: TaskLikeLogCategory,
  value: string
): TaskLogsFilters {
  if (logCategory === 'drawing') {
    return { ...filters, mjId: value }
  }
  return { ...filters, taskId: value }
}

export function TaskLogsFilterBar<TData>(props: TaskLogsFilterBarProps<TData>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const searchParams = route.useSearch()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const fetchingLogs = useIsFetching({ queryKey: ['logs'] })

  const [filters, setFilters] = useState<TaskLogsFilters>(() => {
    const { start, end } = getDefaultTimeRange()
    return { startTime: start, endTime: end }
  })

  useEffect(() => {
    const { start, end } = getDefaultTimeRange()
    const baseFilters = {
      startTime: searchParams.startTime
        ? new Date(searchParams.startTime)
        : start,
      endTime: searchParams.endTime ? new Date(searchParams.endTime) : end,
      ...(searchParams.channel
        ? { channel: String(searchParams.channel) }
        : {}),
    }
    const next: TaskLogsFilters =
      props.logCategory === 'drawing'
        ? {
            ...baseFilters,
            ...(searchParams.filter ? { mjId: searchParams.filter } : {}),
          }
        : {
            ...baseFilters,
            ...(searchParams.filter ? { taskId: searchParams.filter } : {}),
            ...(searchParams.status ? { status: searchParams.status } : {}),
          }

    setFilters(next)
  }, [
    props.logCategory,
    searchParams.startTime,
    searchParams.endTime,
    searchParams.channel,
    searchParams.filter,
    searchParams.status,
  ])

  const handleChange = useCallback(
    (
      field: 'startTime' | 'endTime' | 'channel' | 'mjId' | 'taskId' | 'status',
      value: Date | string | undefined
    ) => {
      setFilters((prev) => ({ ...prev, [field]: value }) as TaskLogsFilters)
    },
    []
  )

  const handleApply = useCallback(() => {
    const filterParams = buildSearchParams(filters, props.logCategory)
    navigate({
      to: '/usage-logs/$section',
      params: { section: props.logCategory },
      search: {
        ...filterParams,
        page: 1,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['logs'] })
  }, [filters, navigate, props.logCategory, queryClient])

  const handleReset = useCallback(() => {
    const { start, end } = getDefaultTimeRange()
    const resetFilters: TaskLogsFilters = { startTime: start, endTime: end }
    setFilters(resetFilters)

    navigate({
      to: '/usage-logs/$section',
      params: { section: props.logCategory },
      search: {
        page: 1,
        startTime: start.getTime(),
        endTime: end.getTime(),
      },
    })
    queryClient.invalidateQueries({ queryKey: ['logs'] })
  }, [navigate, props.logCategory, queryClient])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleApply()
    },
    [handleApply]
  )

  const handleFilterChange = useCallback(
    (value: string) => {
      setFilters((prev) => setFilterValue(prev, props.logCategory, value))
    },
    [props.logCategory]
  )

  const filterValue = getFilterValue(filters, props.logCategory)
  const placeholder = t('Task ID')
  const taskStatus =
    props.logCategory === 'task'
      ? ((filters as TaskLogFilters).status ?? '')
      : ''
  const statusFilter = props.logCategory === 'task' && (
    <div className='w-full lg:w-36 [&_[data-slot=select-trigger]]:w-full'>
      <Select
        items={[
          { value: ALL_STATUS_VALUE, label: t('All Status') },
          ...TASK_STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.label),
          })),
        ]}
        value={taskStatus || ALL_STATUS_VALUE}
        onValueChange={(value) =>
          handleChange(
            'status',
            value === ALL_STATUS_VALUE || value === null ? '' : value
          )
        }
      >
        <SelectTrigger aria-label={t('Task Status')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className='min-w-40'>
          <SelectGroup>
            <SelectItem value={ALL_STATUS_VALUE}>{t('All Status')}</SelectItem>
            {TASK_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
  const hasAdditionalFilters =
    !!filterValue || !!filters.channel || !!taskStatus
  const compactDateRangeFilter = (
    <LogsFilterField wide>
      <CompactDateTimeRangePicker
        start={filters.startTime}
        end={filters.endTime}
        onChange={({ start, end }) => {
          handleChange('startTime', start)
          handleChange('endTime', end)
        }}
      />
    </LogsFilterField>
  )
  const dateRangeFilter = isMobile ? (
    compactDateRangeFilter
  ) : (
    <>
      <LogsFilterField>
        <CompactDateTimeField
          label={t('Start')}
          value={filters.startTime}
          onChange={(value) => handleChange('startTime', value)}
        />
      </LogsFilterField>
      <LogsFilterField>
        <CompactDateTimeField
          label={t('End')}
          value={filters.endTime}
          onChange={(value) => handleChange('endTime', value)}
        />
      </LogsFilterField>
    </>
  )
  const taskIdFilter = (
    <LogsFilterField>
      <LogsFilterInput
        aria-label={t('Task ID')}
        placeholder={placeholder}
        value={filterValue}
        onChange={(e) => handleFilterChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </LogsFilterField>
  )
  const channelFilter = isAdmin ? (
    <LogsFilterField>
      <LogsFilterInput
        placeholder={t('Channel ID')}
        value={filters.channel || ''}
        onChange={(e) => handleChange('channel', e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </LogsFilterField>
  ) : null

  return (
    <LogsFilterToolbar
      table={props.table}
      primaryFilters={
        <>
          {dateRangeFilter}
          {taskIdFilter}
          {channelFilter}
        </>
      }
      mobilePinnedFilters={compactDateRangeFilter}
      mobileFilters={
        <>
          {taskIdFilter}
          {channelFilter}
          {statusFilter}
        </>
      }
      secondaryFilters={statusFilter || undefined}
      mobileFilterCount={
        [filterValue, filters.channel, taskStatus].filter(Boolean).length
      }
      hasActiveFilters={hasAdditionalFilters}
      onSearch={handleApply}
      searchLoading={fetchingLogs > 0}
      onReset={handleReset}
    />
  )
}
