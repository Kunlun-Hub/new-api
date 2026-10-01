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
import type { ColumnDef } from '@tanstack/react-table'
/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { formatQuota, formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { taskStatusMapper } from '../../lib/mappers'
import type { TaskLog } from '../../types'
import { PluginAuthorLink } from '../plugin-author-link'
import { TaskArtifactsCell } from '../task-artifacts'
import { useUsageLogsContext } from '../usage-logs-provider'
import { createChannelColumn } from './column-helpers'

export function useTaskLogsColumns(isAdmin: boolean): ColumnDef<TaskLog>[] {
  const { t } = useTranslation()
  return useMemo(() => {
    const columns: ColumnDef<TaskLog>[] = [
      {
        accessorKey: 'submit_time',
        header: t('Submit Time'),
        cell: ({ row }) => {
          const submitTime = row.getValue('submit_time') as number
          if (!submitTime) {
            return <span className='text-muted-foreground'>-</span>
          }

          return (
            <span className='whitespace-nowrap'>
              {formatTimestampToDate(submitTime, 'seconds')}
            </span>
          )
        },
        size: 140,
      },
    ]

    if (isAdmin) {
      columns.push(
        {
          id: 'user',
          header: t('Username'),
          accessorFn: (row) => row.username || row.user_id,
          cell: function UserCell({ row }) {
            const {
              sensitiveVisible,
              setSelectedUserId,
              setUserInfoDialogOpen,
            } = useUsageLogsContext()
            const log = row.original
            const displayName = log.username || String(log.user_id || '?')

            return (
              <button
                type='button'
                className='flex items-center gap-1.5 text-left'
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedUserId(log.user_id)
                  setUserInfoDialogOpen(true)
                }}
              >
                <Avatar className='ring-border/60 size-6 ring-1 max-sm:hidden'>
                  <AvatarFallback
                    className={cn(
                      'text-[11px] font-semibold',
                      !sensitiveVisible && 'bg-muted text-muted-foreground'
                    )}
                    style={
                      sensitiveVisible
                        ? getUserAvatarStyle(displayName)
                        : undefined
                    }
                  >
                    {sensitiveVisible
                      ? getUserAvatarFallback(displayName)
                      : '•'}
                  </AvatarFallback>
                </Avatar>
                <span className='text-muted-foreground truncate text-sm hover:underline'>
                  {sensitiveVisible ? displayName : '••••'}
                </span>
              </button>
            )
          },
        },
        createChannelColumn<TaskLog>({ headerLabel: t('Channel ID') }),
        {
          id: 'plugin',
          header: t('Plugin'),
          accessorFn: (row) => row.admin_info?.task_plugin?.key ?? '',
          cell: ({ row }) => {
            const plugin = row.original.admin_info?.task_plugin
            if (!plugin) {
              return <span className='text-muted-foreground/60 text-xs'>-</span>
            }
            return (
              <div className='flex max-w-[170px] flex-col gap-0.5'>
                <span className='truncate text-xs font-medium'>
                  {plugin.name || plugin.key}
                </span>
                <span className='text-muted-foreground truncate font-mono text-[11px]'>
                  {plugin.key}
                  {plugin.version ? ` @ ${plugin.version}` : ''}
                </span>
                {plugin.author ? (
                  <PluginAuthorLink
                    author={plugin.author}
                    showUrl
                    className='text-muted-foreground text-[11px]'
                  />
                ) : null}
              </div>
            )
          },
        }
      )
    }

    columns.push(
      {
        accessorKey: 'platform',
        header: t('Platform'),
        size: 90,
        cell: ({ row }) => (
          <Badge variant='outline'>{row.original.platform || ''}</Badge>
        ),
      },
      {
        accessorKey: 'task_id',
        header: t('Task ID'),
        cell: ({ row }) => {
          const taskId = row.getValue('task_id') as string
          if (!taskId) {
            return <span className='text-muted-foreground'>-</span>
          }
          return (
            <CopyButton
              value={taskId}
              position='right'
              className='h-auto w-auto min-w-0 justify-start bg-transparent! p-0 whitespace-nowrap'
              iconClassName='size-3.5'
            >
              <span className='block max-w-36 truncate font-mono text-[13px] font-normal'>
                {taskId}
              </span>
            </CopyButton>
          )
        },
        size: 120,
        meta: { mobileTitle: true },
      },
      {
        accessorKey: 'action',
        header: t('Event'),
        size: 90,
        cell: ({ row }) => {
          const action = (row.original.action ?? '').toLowerCase()
          let inputSuffix = ''
          let input = row.original.properties?.input
          // Task properties arrive as a JSON string; the reference console
          // parses it and only renders key/value suffixes for object inputs.
          if (typeof input === 'string' && input.length > 0) {
            try {
              input = JSON.parse(input) as string | Record<string, unknown>
            } catch {
              input = undefined
            }
          }
          if (input && typeof input === 'object') {
            const parts: string[] = []
            for (const [key, value] of Object.entries(input)) {
              if (value == null || value === '') {
                continue
              }
              parts.push(
                key === 'duration' ? `${String(value)}s` : String(value)
              )
            }
            if (parts.length > 0) {
              inputSuffix = `/${parts.join('/')}`
            }
          }

          return (
            <span className='inline-flex items-center gap-1.5 whitespace-nowrap'>
              <span className='bg-foreground size-1.5 shrink-0 rounded-full' />
              {action}
              {inputSuffix}
            </span>
          )
        },
      },
      {
        accessorKey: 'progress',
        header: t('Progress'),
        size: 80,
        cell: ({ row }) => {
          const progress = (row.getValue('progress') as string) ?? ''
          const percent = Number.parseInt(progress.replace('%', ''), 10) || 0

          return (
            <div className='flex items-center gap-1'>
              <Progress
                value={percent}
                className={cn(
                  'h-1 w-16',
                  row.original.status === 'FAILURE' &&
                    '[&_[data-slot=progress-indicator]]:bg-muted-foreground/30'
                )}
              />
              <span className='block text-xs font-semibold'>{percent}%</span>
            </div>
          )
        },
      },
      {
        id: 'duration',
        header: t('Duration'),
        size: 80,
        cell: ({ row }) => {
          const { submit_time: submitTime, start_time: startTime } =
            row.original
          const finishTime = row.original.finish_time
          const from = startTime || submitTime
          const durationSec =
            from && finishTime && finishTime > 0 ? finishTime - from : null

          if (durationSec === null) {
            return <span className='text-muted-foreground'>-</span>
          }

          return (
            <span
              className={cn(
                'text-[13px] font-semibold',
                durationSec > 150 && 'font-medium text-red-500',
                durationSec > 100 &&
                  durationSec <= 150 &&
                  'font-medium text-amber-500'
              )}
            >
              <b className='font-semibold'>{durationSec.toFixed(1)}</b>s
            </span>
          )
        },
      },
      {
        accessorKey: 'quota',
        header: t('Cost'),
        size: 80,
        cell: ({ row }) => {
          const log = row.original

          if (log.progress !== '100%') {
            return (
              <span className='text-muted-foreground whitespace-nowrap'>
                {t('Pending settlement')}
              </span>
            )
          }

          return (
            <span className='cursor-help font-medium whitespace-nowrap'>
              {formatQuota(log.quota ?? 0)}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        size: 80,
        meta: { pinned: 'right' as const },
        cell: ({ row }) => {
          const status = (row.getValue('status') as string) ?? ''
          const statusClassName = taskStatusMapper.getBadgeClassName(status)

          return (
            <Badge
              variant={statusClassName ? 'default' : 'outline'}
              className={statusClassName}
            >
              {t(taskStatusMapper.getLabel(status, 'Unknown'))}
            </Badge>
          )
        },
      },
      {
        id: 'artifacts',
        header: t('Artifacts'),
        cell: ({ row }) => (
          <TaskArtifactsCell key={row.original.task_id} log={row.original} />
        ),
        size: 70,
        maxSize: 140,
      }
    )

    return columns
  }, [t, isAdmin])
}
