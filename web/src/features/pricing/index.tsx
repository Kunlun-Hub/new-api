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
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { useAuthStore } from '@/stores/auth-store'

import {
  LoadingSkeleton,
  EmptyState,
  ModelTryDrawer,
  PricingFilterBar,
  PricingTable,
  PricingToolbar,
  ModelCardGrid,
} from './components'
import { EXCLUDED_GROUPS, VIEW_MODES } from './constants'
import { useFilters } from './hooks/use-filters'
import { usePricingData } from './hooks/use-pricing-data'
import { formatContextLength } from './lib/capability-badges'
import { formatPrice } from './lib/price'

const route = getRouteApi('/pricing/')

export function Pricing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = route.useSearch()

  const {
    models,
    vendors,
    groupRatio,
    usableGroup,
    endpointMap,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const [tryModelName, setTryModelName] = useState<string | null>(null)

  const tryModel = useMemo(
    () => models.find((model) => model.model_name === tryModelName) ?? null,
    [models, tryModelName]
  )

  const {
    searchInput,
    vendorFilter,
    groupFilter,
    quotaTypeFilter,
    endpointTypeFilter,
    tagFilter,
    tokenUnit,
    viewMode,
    showRechargePrice,
    setVendorFilter,
    setGroupFilter,
    setQuotaTypeFilter,
    setEndpointTypeFilter,
    setTagFilter,
    setViewMode,
    setShowRechargePrice,
    filteredModels,
    hasActiveFilters,
    availableTags,
    clearFilters,
    clearSearch,
  } = useFilters(models || [])

  const handleModelClick = useCallback(
    (modelName: string) => {
      void navigate({
        to: '/pricing/$modelId',
        params: { modelId: modelName },
        search,
      })
    },
    [navigate, search]
  )

  const handleModelTry = useCallback(
    (modelName: string) => {
      if (!useAuthStore.getState().auth.user) {
        void navigate({
          to: '/sign-in',
          search: { redirect: window.location.href },
        })
        return
      }
      setTryModelName(modelName)
    },
    [navigate]
  )

  const vendorLabel = useMemo(() => {
    if (!vendorFilter || vendorFilter === 'all') {
      return t('All Vendors')
    }
    const matched = (vendors || []).find(
      (item) => String(item.id) === vendorFilter
    )
    return matched?.name || t('All Vendors')
  }, [vendorFilter, vendors, t])

  const handleDownload = useCallback(() => {
    const escape = (value: unknown) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`
    const unitLabel = tokenUnit === 'K' ? '/1K' : '/1M'
    const rows = filteredModels.map((model) => [
      model.model_name,
      model.vendor_name || '',
      formatPrice(
        model,
        'input',
        tokenUnit,
        showRechargePrice,
        priceRate ?? 1,
        usdExchangeRate ?? 1,
        groupFilter,
        false
      ) + unitLabel,
      formatPrice(
        model,
        'output',
        tokenUnit,
        showRechargePrice,
        priceRate ?? 1,
        usdExchangeRate ?? 1,
        groupFilter,
        false
      ) + unitLabel,
      model.context_length ? formatContextLength(model.context_length) : '',
    ])
    const csv = [
      [t('Model'), t('Vendor'), t('Input'), t('Output'), t('Context')],
      ...rows,
    ]
      .map((row) => row.map(escape).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `models-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [
    filteredModels,
    tokenUnit,
    showRechargePrice,
    priceRate,
    usdExchangeRate,
    groupFilter,
    t,
  ])

  const availableGroups = useMemo(
    () =>
      Object.keys(usableGroup || {}).filter(
        (g) => !EXCLUDED_GROUPS.includes(g)
      ),
    [usableGroup]
  )

  const handleClearAll = useCallback(() => {
    clearFilters()
    clearSearch()
  }, [clearFilters, clearSearch])

  const renderPricingContent = () => {
    if (filteredModels.length === 0) {
      return (
        <EmptyState
          searchQuery={searchInput}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearAll}
        />
      )
    }

    if (viewMode === VIEW_MODES.CARD) {
      return (
        <ModelCardGrid
          models={filteredModels}
          onModelClick={handleModelClick}
          onModelTry={handleModelTry}
          priceRate={priceRate}
          usdExchangeRate={usdExchangeRate}
          tokenUnit={tokenUnit}
          showRechargePrice={showRechargePrice}
          selectedGroup={groupFilter}
        />
      )
    }

    return (
      <PricingTable
        models={filteredModels}
        priceRate={priceRate}
        usdExchangeRate={usdExchangeRate}
        tokenUnit={tokenUnit}
        showRechargePrice={showRechargePrice}
        selectedGroup={groupFilter}
        onModelClick={handleModelClick}
      />
    )
  }

  if (isLoading) {
    return (
      <PublicLayout showMainContainer={false}>
        <div className='mx-auto w-full max-w-[1800px] px-3 py-16 sm:px-6 sm:pb-10 xl:px-8'>
          <LoadingSkeleton viewMode={viewMode} />
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <div className='relative'>
        <PageTransition className='relative mx-auto flex w-full max-w-460 flex-1 flex-col px-4 py-16 lg:px-10 2xl:px-20'>
          <header className='mb-3 text-center'>
            <h1 className='text-foreground text-3xl font-bold sm:text-4xl'>
              {t('Model Square')}
            </h1>
            <p className='text-muted-foreground mt-3 text-base'>
              {t(
                'Model prices are far below USD exchange rates, calculated based on recharge rates'
              )}
            </p>
          </header>

          <div className='space-y-4'>
            <main className='min-w-0 space-y-4'>
              <PricingToolbar
                filteredCount={filteredModels.length}
                totalCount={models?.length}
                vendorLabel={vendorLabel}
                showRechargePrice={showRechargePrice}
                onRechargePriceChange={setShowRechargePrice}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onDownload={handleDownload}
              >
                <PricingFilterBar
                  quotaTypeFilter={quotaTypeFilter}
                  endpointTypeFilter={endpointTypeFilter}
                  vendorFilter={vendorFilter}
                  groupFilter={groupFilter}
                  tagFilter={tagFilter}
                  onQuotaTypeChange={setQuotaTypeFilter}
                  onEndpointTypeChange={setEndpointTypeFilter}
                  onVendorChange={setVendorFilter}
                  onGroupChange={setGroupFilter}
                  onTagChange={setTagFilter}
                  vendors={vendors || []}
                  groups={availableGroups}
                  groupRatios={groupRatio}
                  tags={availableTags}
                  models={models || []}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={handleClearAll}
                  onModelSelect={handleModelClick}
                />
              </PricingToolbar>

              {renderPricingContent()}
            </main>
          </div>
        </PageTransition>

        <ModelTryDrawer
          endpointMap={
            endpointMap as Record<string, { path?: string; method?: string }>
          }
          groupRatio={groupRatio}
          model={tryModel}
          onOpenChange={(open: boolean) => {
            if (!open) setTryModelName(null)
          }}
          open={Boolean(tryModel)}
          priceRate={priceRate}
          selectedGroup={groupFilter}
          showRechargePrice={showRechargePrice}
          tokenUnit={tokenUnit}
          usdExchangeRate={usdExchangeRate}
        />
      </div>
    </PublicLayout>
  )
}
