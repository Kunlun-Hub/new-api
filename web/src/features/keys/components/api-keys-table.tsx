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
import { getRouteApi } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DISABLED_ROW_DESKTOP,
  DataTablePage,
  useDebouncedColumnFilter,
  useDataTable,
} from '@/components/data-table'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { createServerError } from '@/lib/server-error-message'

import { getApiKeys, searchApiKeys } from '../api'
import { API_KEY_STATUS, ERROR_MESSAGES } from '../constants'
import type { ApiKey } from '../types'
import { useApiKeysColumns } from './api-keys-columns'
import { useApiKeys } from './api-keys-provider'
import { ApiKeysToolbar, type ApiKeySortValue } from './api-keys-toolbar'

const route = getRouteApi('/_authenticated/keys/')

function isDisabledApiKeyRow(apiKey: ApiKey) {
  return apiKey.status !== API_KEY_STATUS.ENABLED
}

export function ApiKeysTable() {
  const { t } = useTranslation()
  const { refreshTrigger, triggerRefresh } = useApiKeys()
  const [sortValue, setSortValue] = useState<ApiKeySortValue>('default')
  const columns = useApiKeysColumns()

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: route.useSearch(),
    navigate: route.useNavigate(),
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: true, key: 'filter' },
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: '_tokenSearch', searchKey: 'token', type: 'string' },
    ],
  })

  const {
    value: tokenFilter,
    inputValue: tokenFilterInput,
    setInputValue: setTokenFilterInput,
  } = useDebouncedColumnFilter({
    columnFilters,
    columnId: '_tokenSearch',
    onColumnFiltersChange,
  })
  const shouldSearch = Boolean(globalFilter?.trim() || tokenFilter.trim())

  // Fetch data with React Query
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'keys',
      pagination.pageIndex + 1,
      pagination.pageSize,
      globalFilter,
      tokenFilter,
      refreshTrigger,
    ],
    queryFn: async () => {
      const result = shouldSearch
        ? await searchApiKeys({
            keyword: globalFilter,
            token: tokenFilter,
            p: pagination.pageIndex + 1,
            size: pagination.pageSize,
          })
        : await getApiKeys({
            p: pagination.pageIndex + 1,
            size: pagination.pageSize,
          })

      if (!result.success) {
        throw createServerError(
          result,
          t(
            shouldSearch
              ? ERROR_MESSAGES.SEARCH_FAILED
              : ERROR_MESSAGES.LOAD_FAILED
          )
        )
      }

      return {
        items: result.data?.items || [],
        total: result.data?.total || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const apiKeys = useMemo(() => data?.items ?? [], [data])

  const sortedApiKeys = useMemo(() => {
    if (sortValue === 'default') return apiKeys
    return [...apiKeys].sort((a, b) => {
      if (sortValue === 'usage') return b.used_quota - a.used_quota
      const aQuota = a.unlimited_quota
        ? Number.POSITIVE_INFINITY
        : a.remain_quota
      const bQuota = b.unlimited_quota
        ? Number.POSITIVE_INFINITY
        : b.remain_quota
      return aQuota - bQuota
    })
  }, [apiKeys, sortValue])

  const [nameDraft, setNameDraft] = useState(() => globalFilter ?? '')

  const { table } = useDataTable({
    data: sortedApiKeys,
    columns,
    enableRowSelection: true,
    columnFilters,
    globalFilter,
    pagination,
    globalFilterFn: () => true,
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    manualPagination: true,
    totalCount: data?.total || 0,
    ensurePageInRange,
  })

  return (
    <DataTablePage
      table={table}
      fixedHeight={false}
      cardSurface
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyTitle={t('No API Keys Found')}
      emptyDescription={t(
        'No API keys available. Create your first API key to get started.'
      )}
      emptyCellClassName='h-[280px] p-0'
      skeletonKeyPrefix='api-keys-skeleton'
      applyHeaderSize
      toolbar={
        <ApiKeysToolbar
          table={table}
          sortValue={sortValue}
          onSortValueChange={setSortValue}
          nameDraft={nameDraft}
          onNameDraftChange={setNameDraft}
          tokenDraft={tokenFilterInput}
          onTokenDraftChange={setTokenFilterInput}
          onSearch={() => {
            onGlobalFilterChange?.(nameDraft)
            triggerRefresh()
          }}
          isFetching={isFetching}
        />
      }
      hideMobile
      getRowClassName={(row) =>
        isDisabledApiKeyRow(row.original) ? DISABLED_ROW_DESKTOP : undefined
      }
    />
  )
}
