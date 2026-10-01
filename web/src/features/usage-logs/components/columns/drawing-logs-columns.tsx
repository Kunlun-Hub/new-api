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
import { Coffee, Rocket, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatQuota, formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  mjTaskTypeMapper,
  mjStatusMapper,
  mjSubmitResultMapper,
} from '../../lib/mappers'
import { countMjArtifacts, isMjTaskFailure } from '../../lib/mj-artifacts'
import type { MidjourneyLog } from '../../types'
import { ImageDialog } from '../dialogs/image-dialog'
import { createChannelColumn, createFailReasonColumn } from './column-helpers'

export function useDrawingLogsColumns(
  isAdmin: boolean
): ColumnDef<MidjourneyLog>[] {
  const { t } = useTranslation()
  return useMemo(() => {
    const columns: ColumnDef<MidjourneyLog>[] = [
      {
        accessorKey: 'submit_time',
        header: t('Submit Time'),
        cell: ({ row }) => {
          const submitTime = row.getValue('submit_time') as number

          return (
            <span className='whitespace-nowrap'>
              {formatTimestampToDate(submitTime, 'milliseconds')}
            </span>
          )
        },
        size: 130,
      },
    ]

    if (isAdmin) {
      columns.push(
        createChannelColumn<MidjourneyLog>({ headerLabel: t('Channel') })
      )
    }

    columns.push({
      accessorKey: 'action',
      header: t('Type'),
      cell: ({ row }) => {
        const action = row.getValue('action') as string | undefined

        if (!action) {
          return <Badge variant='outline'>-</Badge>
        }

        return (
          <Badge variant='outline'>
            {t(mjTaskTypeMapper.getLabel(action, action))}
          </Badge>
        )
      },
      size: 90,
    })

    columns.push({
      accessorKey: 'mj_id',
      header: t('Task ID'),
      cell: ({ row }) => {
        const mjId = row.getValue('mj_id') as string

        if (!mjId) {
          return <span className='text-muted-foreground'>-</span>
        }

        return (
          <CopyButton
            value={mjId}
            position='right'
            className='h-auto w-auto min-w-0 justify-start bg-transparent! p-0 whitespace-nowrap'
            iconClassName='size-3.5'
          >
            <span className='block max-w-36 truncate font-mono text-[13px] font-normal'>
              {mjId}
            </span>
          </CopyButton>
        )
      },
      size: 120,
      meta: { mobileTitle: true },
    })

    columns.push(
      {
        accessorKey: 'mode',
        header: t('Mode'),
        cell: ({ row }) => {
          const mode = row.getValue('mode') as string | undefined

          if (!mode) {
            return <span className='text-muted-foreground/60 text-xs'>-</span>
          }

          let ModeIcon = Zap
          if (mode === 'Relax') {
            ModeIcon = Coffee
          } else if (mode === 'Turbo') {
            ModeIcon = Rocket
          }

          return (
            <Badge variant='outline' className='flex items-center'>
              <ModeIcon className='fill-primary size-3' />
              <b className='text-xs'>{mode}</b>
            </Badge>
          )
        },
        size: 90,
      },
      {
        accessorKey: 'progress',
        header: t('Progress'),
        cell: ({ row }) => {
          const progress = (row.getValue('progress') as string) ?? ''
          const percent = Number.parseInt(progress.replace('%', ''), 10) || 0

          return (
            <div className='flex items-center gap-1'>
              <Progress value={percent} className='h-1 w-16' />
              <span className='block text-xs font-semibold'>{percent}%</span>
            </div>
          )
        },
        size: 90,
      },
      {
        id: 'duration',
        header: t('Duration'),
        cell: ({ row }) => {
          const { submit_time: submitTime, finish_time: finishTime } =
            row.original
          const durationSec =
            submitTime && finishTime && finishTime > 0
              ? (finishTime - submitTime) / 1000
              : null

          if (durationSec === null) {
            return <span className='text-muted-foreground text-xs'>-</span>
          }

          return (
            <span
              className={cn(
                'text-[13px] font-semibold',
                durationSec > 60 && 'font-medium text-red-500',
                durationSec > 30 &&
                  durationSec <= 60 &&
                  'font-medium text-amber-500'
              )}
            >
              <b className='font-semibold'>{durationSec.toFixed(1)}</b>s
            </span>
          )
        },
        size: 90,
      }
    )

    if (isAdmin) {
      columns.push({
        accessorKey: 'code',
        header: t('Submit Result'),
        cell: ({ row }) => {
          const code = row.getValue('code') as number

          return (
            <StatusBadge
              label={t(mjSubmitResultMapper.getLabel(String(code)))}
              variant={mjSubmitResultMapper.getVariant(String(code))}
              size='sm'
              copyable={false}
              className='-ml-1.5'
            />
          )
        },
      })
    }

    columns.push(
      {
        accessorKey: 'prompt',
        header: t('Prompt'),
        cell: ({ row }) => {
          const prompt = row.getValue('prompt') as string

          if (!prompt) {
            return <span className='text-muted-foreground/60 text-xs'>-</span>
          }

          return (
            <span
              className='block max-w-[200px] truncate text-[13px]'
              title={prompt}
            >
              {prompt}
            </span>
          )
        },
        size: 110,
        maxSize: 220,
      },
      {
        accessorKey: 'quota',
        header: t('Cost'),
        size: 90,
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
        size: 90,
        meta: { pinned: 'right' as const },
        cell: ({ row }) => {
          const log = row.original
          const status = isMjTaskFailure(log) ? 'FAILURE' : log.status
          const statusClassName = mjStatusMapper.getBadgeClassName(status)
          const artifactCount = countMjArtifacts(log)

          return (
            <div className='inline-flex items-center gap-1.5 whitespace-nowrap'>
              <Badge
                variant={statusClassName ? 'default' : 'outline'}
                className={statusClassName}
              >
                {t(mjStatusMapper.getLabel(status))}
              </Badge>
              {log.status === 'SUCCESS' && artifactCount > 0 ? (
                <span className='text-muted-foreground font-mono text-xs'>
                  ×{artifactCount}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'image_url',
        header: t('Image'),
        cell: function ImageCell({ row }) {
          const log = row.original
          const imageUrl = row.getValue('image_url') as string
          const [dialogOpen, setDialogOpen] = useState(false)

          if (!imageUrl) {
            return <span className='text-muted-foreground/60 text-xs'>-</span>
          }

          return (
            <>
              <button
                type='button'
                className='group text-left text-xs'
                onClick={(event) => {
                  event.stopPropagation()
                  setDialogOpen(true)
                }}
                title={t('Click to view image')}
              >
                <span className='text-foreground truncate leading-snug group-hover:underline'>
                  {t('View')}
                </span>
              </button>
              <ImageDialog
                imageUrl={imageUrl}
                taskId={log.mj_id}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
              />
            </>
          )
        },
        size: 70,
      },
      createFailReasonColumn<MidjourneyLog>({
        headerLabel: t('Fail Reason'),
        cellTitle: t('Click to view full error message'),
        size: 80,
      })
    )

    return columns
  }, [t, isAdmin])
}
