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
import type { ColumnFiltersState } from '@tanstack/react-table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { ErrorState } from '@/components/error-state'
import {
  getMyRedPacketClaims,
  RED_PACKET_RECORDS_QUERY_KEY,
} from '@/features/red-packets/api'
import {
  createServerError,
  getServerErrorMessage,
} from '@/lib/server-error-message'

import { ERROR_MESSAGES } from '../constants'
import { useRedPacketRecordsColumns } from './red-packet-records-columns'

export function RedPacketRecordsTable() {
  const { t } = useTranslation()
  const columns = useRedPacketRecordsColumns()
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const query = useQuery({
    queryKey: [RED_PACKET_RECORDS_QUERY_KEY],
    queryFn: async () => {
      const response = await getMyRedPacketClaims()
      if (!response.success) {
        throw createServerError(response, t(ERROR_MESSAGES.RECORDS_LOAD_FAILED))
      }
      return response.data ?? []
    },
  })

  const { table } = useDataTable({
    data: query.data ?? [],
    columns,
    enableRowSelection: false,
    getRowId: (row) => String(row.id),
    globalFilter,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const keyword = String(filterValue).trim().toLowerCase()
      if (!keyword) return true
      return [
        row.original.remark,
        row.original.creator_name,
        String(row.original.id),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    },
    columnFilters,
    onColumnFiltersChange: setColumnFilters,
    initialPagination: { pageIndex: 0, pageSize: 20 },
  })

  if (query.isError) {
    return (
      <ErrorState
        description={getServerErrorMessage(
          query.error,
          t(ERROR_MESSAGES.RECORDS_LOAD_FAILED)
        )}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      emptyTitle={t('No red packets claimed yet')}
      emptyDescription={t(
        'Red packets you claim through a landing page will appear here.'
      )}
      mobileProps={{ getRowKey: (row) => String(row.original.id) }}
      pinnedColumns={[{ columnId: 'remark', side: 'left' }]}
      toolbarProps={{
        searchPlaceholder: t('Search red packet records'),
        searchDebounceMs: 300,
      }}
    />
  )
}
