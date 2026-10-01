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
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { DEFAULT_PRICING_PAGE_SIZE, DEFAULT_TOKEN_UNIT } from '../constants'
import type { PricingModel, TokenUnit } from '../types'
import { ModelCard } from './model-card'
import type { ModelPerfBadgeData } from './model-perf-badge'

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
  const { t } = useTranslation()
  const pageSize = DEFAULT_PRICING_PAGE_SIZE
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const perfQuery = useQuery({
    queryKey: ['perf-metrics-summary', 24],
    queryFn: async () => requireServerSuccess(await getPerfMetricsSummary(24)),
    staleTime: 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [props.models, pageSize])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((count) =>
          Math.min(count + pageSize, props.models.length)
        )
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [pageSize, props.models.length])

  const visibleModels = useMemo(
    () => props.models.slice(0, visibleCount),
    [props.models, visibleCount]
  )

  const perfMap = useMemo(() => {
    const map = new Map<string, ModelPerfBadgeData>()
    for (const model of perfQuery.data?.data?.models ?? []) {
      map.set(model.model_name, {
        ...model,
        window_start: perfQuery.data?.data.window_start,
        window_end: perfQuery.data?.data.window_end,
      })
    }
    return map
  }, [perfQuery.data])

  if (props.models.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
        {visibleModels.map((model) => (
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

      {visibleCount < props.models.length && (
        <div
          ref={sentinelRef}
          role='button'
          tabIndex={0}
          aria-label={t('Load more...')}
          className='flex items-center justify-center py-8'
          onClick={() => setVisibleCount((count) => count + pageSize)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setVisibleCount((count) => count + pageSize)
            }
          }}
        >
          <span className='text-muted-foreground text-sm'>
            {t('Load more...')}
          </span>
        </div>
      )}
    </div>
  )
})
