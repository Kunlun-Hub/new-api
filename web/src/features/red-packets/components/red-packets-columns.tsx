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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { formatQuotaFixed, formatTimestamp } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  RED_PACKET_CLAIM_MODE,
  RED_PACKET_TYPE,
  type RedPacket,
} from '../types'
import { RedPacketStatusBadge } from './red-packet-status-badge'
import { RedPacketRowActions } from './red-packets-row-actions'

export function useRedPacketsColumns(): ColumnDef<RedPacket, unknown>[] {
  const { t } = useTranslation()

  return useMemo(
    () => [
      {
        accessorKey: 'remark',
        header: t('Remark'),
        meta: { label: t('Remark'), mobileTitle: true },
        cell: ({ row }) => (
          <div className='flex min-w-0 flex-col gap-0.5'>
            <span className='truncate font-medium'>
              {row.original.remark || t('Red packet')}
            </span>
            <span className='text-muted-foreground truncate text-xs'>
              {row.original.creator_name
                ? t('Issued by {{name}}', { name: row.original.creator_name })
                : null}
              {row.original.claim_mode === RED_PACKET_CLAIM_MODE.CODE
                ? ` · ${t('Claim code')}`
                : ''}
            </span>
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: 'type',
        header: t('Type'),
        meta: { label: t('Type'), mobileBadge: true },
        filterFn: (row, columnId, filterValue: string[]) =>
          !Array.isArray(filterValue) ||
          filterValue.length === 0 ||
          filterValue.includes(String(row.getValue(columnId))),
        cell: ({ row }) => (
          <Badge
            variant='outline'
            className={cn(
              'whitespace-nowrap',
              row.original.type === RED_PACKET_TYPE.GIFT &&
                'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            )}
          >
            {row.original.type === RED_PACKET_TYPE.GIFT
              ? t('Gift Credit')
              : t('Balance')}
          </Badge>
        ),
        size: 105,
      },
      {
        accessorKey: 'total_quota',
        header: t('Total Amount'),
        meta: { label: t('Total Amount'), mobileOrder: 1 },
        cell: ({ row }) => (
          <span className='whitespace-nowrap tabular-nums'>
            {formatQuotaFixed(row.original.total_quota)}
          </span>
        ),
        size: 105,
      },
      {
        accessorKey: 'share_count',
        header: t('Shares'),
        meta: { label: t('Shares'), mobileOrder: 2 },
        cell: ({ row }) => (
          <div className='flex flex-col gap-0.5'>
            <span className='whitespace-nowrap tabular-nums'>
              {t('{{claimed}}/{{total}} shares claimed', {
                claimed: row.original.claimed_count,
                total: row.original.share_count,
              })}
            </span>
            {row.original.claimed_amount > 0 && (
              <span className='text-xs font-medium whitespace-nowrap text-emerald-600 tabular-nums dark:text-emerald-400'>
                {t('Claimed: {{amount}}', {
                  amount: formatQuotaFixed(row.original.claimed_amount),
                })}
              </span>
            )}
          </div>
        ),
        size: 135,
      },
      {
        accessorKey: 'distribution',
        header: t('Distribution'),
        meta: { label: t('Distribution'), mobileOrder: 3 },
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>
            {row.original.distribution === 'average'
              ? t('Equal split')
              : t('Random split')}
          </span>
        ),
        size: 105,
      },
      {
        accessorKey: 'expires_at',
        header: t('Expires at'),
        meta: { label: t('Expires at'), mobileOrder: 4 },
        cell: ({ row }) => (
          <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
            {row.original.expires_at > 0
              ? formatTimestamp(row.original.expires_at)
              : t('Never expires')}
          </span>
        ),
        size: 155,
      },
      {
        id: 'status',
        header: t('Status'),
        meta: { label: t('Status'), mobileOrder: 5 },
        cell: ({ row }) => (
          <RedPacketStatusBadge status={row.original.status} />
        ),
        size: 95,
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>{t('Actions')}</div>,
        enableHiding: false,
        cell: ({ row }) => <RedPacketRowActions packet={row.original} />,
        size: 160,
      },
    ],
    [t]
  )
}
