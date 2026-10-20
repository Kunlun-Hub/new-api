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
import {
  RED_PACKET_TYPE,
  type RedPacketUserClaim,
} from '@/features/red-packets/types'
import { formatQuotaFixed, formatTimestamp } from '@/lib/format'
import { cn } from '@/lib/utils'

export function useRedPacketRecordsColumns(): ColumnDef<
  RedPacketUserClaim,
  unknown
>[] {
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
            </span>
          </div>
        ),
        size: 190,
      },
      {
        accessorKey: 'type',
        header: t('Type'),
        meta: { label: t('Type'), mobileBadge: true },
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
        accessorKey: 'quota',
        header: t('Amount'),
        meta: { label: t('Amount'), mobileOrder: 1 },
        cell: ({ row }) => (
          <span className='font-medium whitespace-nowrap text-emerald-600 tabular-nums dark:text-emerald-400'>
            {formatQuotaFixed(row.original.quota)}
          </span>
        ),
        size: 105,
      },
      {
        accessorKey: 'created_at',
        header: t('Claimed at'),
        meta: { label: t('Claimed at'), mobileOrder: 2 },
        cell: ({ row }) => (
          <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
            {formatTimestamp(row.original.created_at)}
          </span>
        ),
        size: 155,
      },
      {
        accessorKey: 'expires_at',
        header: t('Gift credit expires'),
        meta: { label: t('Gift credit expires'), mobileOrder: 3 },
        cell: ({ row }) => (
          <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
            {row.original.expires_at > 0
              ? formatTimestamp(row.original.expires_at)
              : t('Never expires')}
          </span>
        ),
        size: 155,
      },
    ],
    [t]
  )
}
