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
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { getUserGroups } from '@/lib/api'
import { formatTimestampToMinute } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'

import type { ApiKey } from '../types'
import { ApiKeyGroupCell } from './api-key-group-cell'
import { ApiKeyQuotaCell } from './api-key-quota-cell'
import {
  ApiKeyCell,
  ApiKeyStatusBadge,
  ApiKeyStatusSwitch,
} from './api-keys-cells'
import { DataTableRowActions } from './data-table-row-actions'

type GroupInfo = {
  desc?: string
  ratio?: number | string
}

const EMPTY_GROUP_INFO: Record<string, GroupInfo> = {}

function useGroupInfo(): Record<string, GroupInfo> {
  const { data } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => requireServerSuccess(await getUserGroups()),
    staleTime: 0,
    select: (res) => {
      if (!res.success || !res.data) return {}
      const info: Record<string, GroupInfo> = {}
      for (const [group, value] of Object.entries(res.data)) {
        info[group] = { desc: value.desc, ratio: value.ratio }
      }
      return info
    },
  })

  return data ?? EMPTY_GROUP_INFO
}

export function useApiKeysColumns(): ColumnDef<ApiKey>[] {
  const { t } = useTranslation()
  const groupInfo = useGroupInfo()

  return useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t('Select all')}
            className='translate-y-[2px]'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t('Select row')}
            className='translate-y-[2px]'
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 30,
      },
      {
        accessorKey: 'name',
        header: t('Name'),
        cell: ({ row }) => (
          <div className='flex items-center gap-2 whitespace-nowrap'>
            <span>{row.original.name}</span>
            <ApiKeyStatusBadge status={row.original.status} />
          </div>
        ),
        size: 85,
        meta: { mobileTitle: true },
      },
      {
        id: 'key',
        accessorKey: 'key',
        header: t('ApiKey'),
        cell: ({ row }) => <ApiKeyCell apiKey={row.original} />,
        enableSorting: false,
        size: 160,
      },
      {
        accessorKey: 'group',
        header: t('Group'),
        cell: ({ row }) => {
          const apiKey = row.original
          const group = (row.getValue('group') as string) ?? ''
          return (
            <ApiKeyGroupCell
              group={group}
              groupDescription={groupInfo[group.trim()]?.desc}
              modelLimits={apiKey.model_limits ?? ''}
              modelLimitsEnabled={apiKey.model_limits_enabled}
              crossGroupRetry={apiKey.cross_group_retry}
            />
          )
        },
        size: 155,
      },
      {
        id: 'quota',
        accessorKey: 'remain_quota',
        header: t('Used / Remaining'),
        cell: ({ row }) => <ApiKeyQuotaCell apiKey={row.original} />,
        size: 125,
        minSize: 125,
      },
      {
        id: 'created_time',
        accessorKey: 'created_time',
        header: t('Created'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>
            {formatTimestampToMinute(row.original.created_time)}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: 'expired_time',
        header: t('Expires'),
        cell: ({ row }) => {
          const expiredTime = row.original.expired_time
          return (
            <span className='whitespace-nowrap'>
              {expiredTime === -1
                ? t('Never expires')
                : formatTimestampToMinute(expiredTime)}
            </span>
          )
        },
        size: 85,
        meta: { mobileHidden: true },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>{t('Actions')}</div>,
        cell: ({ row }) => <DataTableRowActions row={row} />,
        size: 130,
      },
      {
        accessorKey: 'status',
        header: () => <div className='text-center'>{t('Status')}</div>,
        cell: ({ row }) => (
          <div className='text-center'>
            <ApiKeyStatusSwitch apiKey={row.original} />
          </div>
        ),
        filterFn: (row, id, value) => value.includes(String(row.getValue(id))),
        enableHiding: false,
        size: 60,
        meta: { pinned: 'right' as const },
      },
    ],
    [t, groupInfo]
  )
}
