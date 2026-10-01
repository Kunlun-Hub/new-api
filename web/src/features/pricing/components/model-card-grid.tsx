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
import { memo } from 'react'

import { DEFAULT_PRICING_PAGE_SIZE, DEFAULT_TOKEN_UNIT } from '../constants'
import { useIncrementalList } from '../hooks/use-incremental-list'
import { useModelPerfMap } from '../hooks/use-model-perf-map'
import type { PricingModel, TokenUnit } from '../types'
import { LoadMoreSentinel } from './load-more-sentinel'
import { ModelCard } from './model-card'

export interface ModelCardGridProps {
  models: PricingModel[]
  onModelClick: (modelName: string) => void
  onModelTry?: (modelName: string) => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
}

export const ModelCardGrid = memo(function ModelCardGrid(
  props: ModelCardGridProps
) {
  const pageSize = DEFAULT_PRICING_PAGE_SIZE
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const { visibleItems, sentinelRef, hasMore, loadMore } = useIncrementalList(
    props.models,
    pageSize
  )
  const perfMap = useModelPerfMap()

  if (props.models.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
        {visibleItems.map((model) => (
          <ModelCard
            key={model.id ?? model.model_name}
            model={model}
            tokenUnit={tokenUnit}
            priceRate={props.priceRate}
            usdExchangeRate={props.usdExchangeRate}
            showRechargePrice={props.showRechargePrice}
            selectedGroup={props.selectedGroup}
            perf={perfMap.get(model.model_name || '')}
            onClick={props.onModelClick}
            onTry={props.onModelTry ?? props.onModelClick}
          />
        ))}
      </div>

      {hasMore && (
        <LoadMoreSentinel sentinelRef={sentinelRef} onLoadMore={loadMore} />
      )}
    </div>
  )
})
