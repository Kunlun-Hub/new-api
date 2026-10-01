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
import { Sparkles } from 'lucide-react'
import { memo, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { useBillingTime } from '../hooks/use-billing-time'
import {
  getCapabilityBadges,
  getMetaTagBadges,
  isNewModel,
} from '../lib/capability-badges'
import {
  getCardExamplePrice,
  getDynamicDisplayGroupRatio,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  isUnconfiguredTaskUsageModel,
} from '../lib/dynamic-price'
import { isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import { taskPriceLabel, taskUsageUnitLabel } from '../lib/task-price-display'
import type { PricingModel, PriceType, TokenUnit } from '../types'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelCapabilityBadges } from './model-capability-badges'
import type { ModelPerfBadgeData } from './model-perf-badge'

export interface ModelCardProps {
  model: PricingModel
  onClick: (modelName: string) => void
  onTry?: (modelName: string) => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
  perf?: ModelPerfBadgeData
}

export const ModelCard = memo(function ModelCard(props: ModelCardProps) {
  const { t, i18n } = useTranslation()
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const showRechargePrice = props.showRechargePrice ?? false
  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitLabel = tokenUnit === 'K' ? '1K' : '1M'
  const modelIconKey = props.model.icon || props.model.vendor_icon
  const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 28) : null
  const initial = props.model.model_name?.charAt(0).toUpperCase() || '?'
  const isUnconfiguredTaskUsage = isUnconfiguredTaskUsageModel(props.model)
  const billingTime = useBillingTime(props.model.billing_expr)
  const currency = useSystemConfigStore((state) => state.config.currency)
  const dynamicPriceOptions = useMemo(
    () => ({
      now: billingTime === undefined ? undefined : new Date(billingTime),
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
      groupRatioMultiplier: getDynamicDisplayGroupRatio(
        props.model,
        props.selectedGroup
      ),
    }),
    [
      props.model,
      props.selectedGroup,
      billingTime,
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
    ]
  )
  const dynamicSummary = useMemo(
    () => getDynamicPricingSummary(props.model, dynamicPriceOptions),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.model, dynamicPriceOptions, currency]
  )
  const cardExamplePrice = useMemo(
    () => getCardExamplePrice(props.model, dynamicPriceOptions),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.model, dynamicPriceOptions, currency]
  )
  let priceSummary: ReactNode
  if (dynamicSummary) {
    const simpleTokenEntries =
      dynamicSummary.isTaskUsage ||
      dynamicSummary.isMixedBilling ||
      dynamicSummary.primaryEntries.length !== 2
        ? null
        : dynamicSummary.primaryEntries.filter(
            (entry) =>
              entry.unit === 'token' &&
              !entry.formattedRange &&
              (entry.variable?.key === 'p' || entry.variable?.key === 'c')
          )
    if (dynamicSummary.isSpecialExpression) {
      priceSummary = (
        <div className='w-full min-w-0 text-center'>
          <span className='text-warning'>
            {t('Special billing expression')}
          </span>
          <code className='text-muted-foreground mt-1 line-clamp-2 block font-mono text-xs break-all'>
            {dynamicSummary.rawExpression}
          </code>
        </div>
      )
    } else if (
      simpleTokenEntries &&
      simpleTokenEntries.length === dynamicSummary.primaryEntries.length
    ) {
      const unitSuffix = tokenUnit === 'K' ? '/K' : '/M'
      priceSummary = (
        <>
          <span className='font-mono tabular-nums'>
            {simpleTokenEntries.map((entry, index) => (
              <span key={entry.key}>
                {index > 0 && (
                  <span className='text-muted-foreground mx-1'>·</span>
                )}
                <span>{entry.formatted}</span>
                {unitSuffix}
              </span>
            ))}
          </span>
          {dynamicSummary.isTimePricing && (
            <span className='text-muted-foreground w-full text-center text-xs'>
              {t('Current period price')}
            </span>
          )}
          {cardExamplePrice && (
            <span className='text-muted-foreground w-full text-center text-xs break-words'>
              {cardExamplePrice.label} ≈ {cardExamplePrice.formatted}
            </span>
          )}
        </>
      )
    } else if (dynamicSummary.primaryEntries.length > 0) {
      priceSummary = (
        <>
          {dynamicSummary.primaryEntries
            .slice(0, dynamicSummary.providerCount ? 2 : undefined)
            .map((entry) => {
              const unitLabelKey = getDynamicPriceUnitLabelKey(entry)
              const unitLabel = taskUsageUnitLabel(
                entry,
                i18n.language,
                unitLabelKey ? t(unitLabelKey) : tokenUnitLabel
              )
              let label: ReactNode = null
              if (entry.labelKind !== 'schema') {
                label = t(entry.shortLabel)
              } else {
                label = taskPriceLabel(
                  entry.description,
                  entry.shortLabel,
                  i18n.language
                )
              }
              return (
                <div
                  key={entry.key}
                  className={cn(
                    'flex min-w-0 items-baseline gap-1',
                    dynamicSummary.isTaskUsage && 'w-full flex-col items-center'
                  )}
                >
                  {label && (
                    <span className='text-muted-foreground text-xs break-words whitespace-normal'>
                      {label}
                    </span>
                  )}
                  <span className='flex flex-wrap items-baseline gap-x-1 font-mono text-sm font-semibold tabular-nums'>
                    <span>{entry.formattedRange ?? entry.formatted}</span>
                    <span className='text-muted-foreground text-xs font-normal whitespace-nowrap'>
                      {' '}
                      / {unitLabel}
                    </span>
                  </span>
                </div>
              )
            })}
          {dynamicSummary.isTimePricing && (
            <span className='text-muted-foreground w-full text-center text-xs'>
              {t('Current period price')}
            </span>
          )}
          {dynamicSummary.isMixedBilling && (
            <span className='text-muted-foreground w-full text-center text-xs'>
              {t('Token or per-call pricing')}
            </span>
          )}
          {cardExamplePrice && (
            <span className='text-muted-foreground w-full text-center text-xs break-words'>
              {cardExamplePrice.label} ≈ {cardExamplePrice.formatted}
            </span>
          )}
          {dynamicSummary.isTaskUsage &&
            dynamicSummary.tier?.label &&
            !dynamicSummary.primaryEntries.some(
              (entry) => entry.formattedRange
            ) && (
              <span className='text-muted-foreground w-full text-center text-xs break-words'>
                ({dynamicSummary.tier.label})
              </span>
            )}
        </>
      )
    } else {
      priceSummary = (
        <span className='text-muted-foreground w-full text-center'>
          {dynamicSummary.hasUnconfiguredProviders
            ? t('Usage-based billing · price not configured')
            : t('Dynamic Pricing')}
        </span>
      )
    }
  } else if (isUnconfiguredTaskUsage) {
    priceSummary = (
      <span className='text-muted-foreground w-full text-center'>
        {t('Usage-based billing · price not configured')}
      </span>
    )
  } else if (isTokenBased) {
    const unitSuffix = tokenUnit === 'K' ? '/K' : '/M'
    const priceTypes: PriceType[] = ['input', 'output']
    priceSummary = (
      <span className='font-mono tabular-nums'>
        {priceTypes.map((type, index) => (
          <span key={type}>
            {index > 0 && <span className='text-muted-foreground mx-1'>·</span>}
            {formatPrice(
              props.model,
              type,
              tokenUnit,
              showRechargePrice,
              priceRate,
              usdExchangeRate,
              props.selectedGroup
            )}
            {unitSuffix}
          </span>
        ))}
      </span>
    )
  } else {
    priceSummary = (
      <div className='flex min-w-0 items-baseline gap-1'>
        <span className='font-mono text-sm font-semibold tabular-nums'>
          {formatRequestPrice(
            props.model,
            showRechargePrice,
            priceRate,
            usdExchangeRate,
            props.selectedGroup
          )}
          <span className='text-muted-foreground text-xs font-normal'>
            {' '}
            / {t('request')}
          </span>
        </span>
      </div>
    )
  }

  const hasWebSearch = getCapabilityBadges(props.model).some(
    (badge) => badge.key === 'web-search'
  )
  const metaTagBadges = getMetaTagBadges(props.model)

  return (
    <Card
      data-card-hover='false'
      className='group bg-card/20 border-border/40 hover:from-foreground/3 relative flex h-full min-w-0 cursor-pointer flex-col gap-6 rounded-xl border px-5 pt-8 pb-5 ring-0 transition-all duration-200 hover:-translate-y-0.5 hover:bg-linear-to-br hover:via-transparent hover:to-transparent hover:shadow-md lg:gap-7'
      onClick={() => props.onClick(props.model.model_name || '')}
    >
      <div className='flex min-w-0 flex-1 flex-col items-center'>
        <div
          aria-hidden
          className='flex size-11 shrink-0 items-center justify-center'
        >
          {modelIcon || (
            <span className='text-muted-foreground text-lg font-bold'>
              {initial}
            </span>
          )}
        </div>

        <h3
          className='mt-3 w-full min-w-0 truncate text-center text-base leading-tight font-semibold'
          title={props.model.model_name}
        >
          <button
            type='button'
            className='max-w-full truncate focus-visible:outline-none'
            onClick={(event) => {
              event.stopPropagation()
              props.onClick(props.model.model_name || '')
            }}
          >
            {props.model.model_name}
          </button>
        </h3>

        <div className='relative mt-2 w-full min-w-0 text-center'>
          <div
            role='group'
            aria-label={t('Pricing')}
            className='flex min-h-7 w-full min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs transition-opacity group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:opacity-0'
          >
            {priceSummary}
          </div>
          <div
            className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100'
          >
            <Button
              variant='outline'
              size='sm'
              className='border-border/60 h-7'
              onClick={(event) => {
                event.stopPropagation()
                ;(props.onTry ?? props.onClick)(props.model.model_name || '')
              }}
            >
              <Sparkles aria-hidden data-icon='inline-start' />
              {t('Try')}
            </Button>
            <span onClick={(event) => event.stopPropagation()}>
              <CopyButton
                value={props.model.model_name}
                tooltip={t('Copy model name')}
                variant='outline'
                size='icon'
                className='border-border/60 size-7!'
                iconClassName='size-3.5'
              />
            </span>
          </div>
        </div>
      </div>

      <div className='text-muted-foreground pointer-events-none px-2 indent-6 text-xs'>
        <p className='line-clamp-2'>
          {props.model.description || t('No description available.')}
        </p>
        {dynamicSummary?.providerCount ? (
          <span className='mt-1 block break-words'>
            {t('{{count}} providers', {
              count: dynamicSummary.providerCount,
            })}
            {dynamicSummary.hasUnconfiguredProviders &&
              ` · ${t('Not configured for some providers')}`}
          </span>
        ) : null}
      </div>

      <div className='pointer-events-none flex items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-1'>
          {isNewModel(props.model) && (
            <Badge
              variant='secondary'
              className='h-4.5 rounded-4xl border-transparent px-2 py-0.5 text-[10px] font-medium'
            >
              {t('NEW')}
            </Badge>
          )}
          <ModelBillingModeBadge model={props.model} appearance='chip' />
          {hasWebSearch && (
            <Badge
              variant='outline'
              className='border-border/40 h-4.5 rounded-4xl px-2 py-0.5 text-[10px] font-medium'
            >
              {t('Web search')}
            </Badge>
          )}
          {metaTagBadges.map((badge) => (
            <Badge
              key={badge.key}
              variant='outline'
              className='border-border/40 h-4.5 rounded-4xl px-2 py-0.5 text-[10px] font-medium'
            >
              {t(badge.labelKey)}
            </Badge>
          ))}
        </div>
        <ModelCapabilityBadges
          model={props.model}
          className='shrink-0 justify-end gap-1'
          maxVisible={2}
          exclude={['web-search']}
        />
      </div>
    </Card>
  )
})
