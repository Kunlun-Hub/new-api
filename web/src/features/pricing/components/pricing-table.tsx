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
import type { Row } from '@tanstack/react-table'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DataTableRow,
  DataTableView,
  useDataTable,
} from '@/components/data-table'

import { DEFAULT_PRICING_PAGE_SIZE, DEFAULT_TOKEN_UNIT } from '../constants'
import { useIncrementalList } from '../hooks/use-incremental-list'
import type { PricingModel, TokenUnit } from '../types'
import { LoadMoreSentinel } from './load-more-sentinel'
import { usePricingColumns } from './pricing-columns'

export interface PricingTableProps {
  models: PricingModel[]
  isLoading?: boolean
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
  onModelClick?: (modelName: string) => void
  onModelTry?: (modelName: string) => void
}

/** Header/cell classes per column, matching the reference table alignment. */
const HEADER_CLASS_NAMES: Record<string, string> = {
  model_name: 'px-4 py-3 text-left',
  tags: 'px-4 py-3 text-left',
  context_length: 'px-4 py-3 text-right',
  quota_type: 'px-4 py-3 text-left',
  price: 'px-4 py-3 text-right',
  availability: 'px-4 py-3 text-center',
  actions: 'px-4 py-3 text-right',
}

const CELL_CLASS_NAMES: Record<string, string> = {
  model_name: 'px-4 py-3',
  tags: 'px-4 py-3',
  context_length: 'px-4 py-3 text-right text-xs!',
  quota_type: 'px-4 py-3',
  price: 'px-4 py-3 text-right font-mono text-xs! font-normal!',
  availability: 'px-4 py-3 text-center',
  actions: 'px-4 py-3 text-right',
}

export function PricingTable(props: PricingTableProps) {
  const { t } = useTranslation()
  const {
    models,
    isLoading = false,
    priceRate = 1,
    usdExchangeRate = 1,
    tokenUnit = DEFAULT_TOKEN_UNIT,
    showRechargePrice = false,
    selectedGroup,
    onModelClick,
    onModelTry,
  } = props

  const { visibleItems, sentinelRef, hasMore, loadMore } = useIncrementalList(
    models,
    DEFAULT_PRICING_PAGE_SIZE
  )

  const columns = usePricingColumns({
    tokenUnit,
    priceRate,
    usdExchangeRate,
    showRechargePrice,
    selectedGroup,
    onModelTry,
  })

  const { table } = useDataTable({
    data: visibleItems,
    columns,
    manualPagination: true,
    withFilteredRowModel: false,
    withSortedRowModel: false,
    withFacetedRowModel: false,
  })

  const handleRowClick = useCallback(
    (model: PricingModel) => {
      onModelClick?.(model.model_name)
    },
    [onModelClick]
  )

  return (
    <div className='space-y-4'>
      <DataTableView
        table={table}
        isLoading={isLoading}
        emptyTitle={t('No Models Found')}
        emptyDescription={t('No models match your current filters.')}
        skeletonKeyPrefix='pricing-skeleton'
        applyHeaderSize
        containerClassName='border-border/40 overflow-hidden rounded-xl'
        tableHeaderRowClassName='border-border/40 bg-muted/30 hover:bg-muted/30'
        getColumnClassName={(columnId, kind) =>
          kind === 'header'
            ? HEADER_CLASS_NAMES[columnId]
            : CELL_CLASS_NAMES[columnId]
        }
        renderRow={(row: Row<PricingModel>, { getCellClassName }) => (
          <DataTableRow
            key={row.id}
            row={row}
            getColumnClassName={getCellClassName}
            className='border-border/40 hover:bg-muted/20 h-[53px]! cursor-pointer transition-colors'
            role='link'
            tabIndex={0}
            aria-label={t('Details for {{name}}', {
              name: row.original.model_name,
            })}
            onClick={() => handleRowClick(row.original)}
          />
        )}
      />

      {!isLoading && hasMore && (
        <LoadMoreSentinel sentinelRef={sentinelRef} onLoadMore={loadMore} />
      )}
    </div>
  )
}
