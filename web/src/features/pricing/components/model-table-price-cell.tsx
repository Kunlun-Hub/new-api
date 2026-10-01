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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useSystemConfigStore } from '@/stores/system-config-store'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { useBillingTime } from '../hooks/use-billing-time'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  isUnconfiguredTaskUsageModel,
} from '../lib/dynamic-price'
import { isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import { taskUsageUnitLabel } from '../lib/task-price-display'
import type { PricingModel } from '../types'
import type { ModelPriceCellOptions } from './model-price-cell'

function UnsetPrice() {
  return <span className='text-muted-foreground'>—</span>
}

/**
 * Single-line price summary for the model square table, mirroring the
 * reference layout (`$in / $out`, `$0.06/call`) instead of the card's
 * labelled multi-line breakdown.
 */
export function ModelTablePriceCell(props: {
  model: PricingModel
  options?: ModelPriceCellOptions
}) {
  const { t, i18n } = useTranslation()
  const currency = useSystemConfigStore((state) => state.config.currency)
  const options = props.options ?? {}
  const tokenUnit = options.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const billingTime = useBillingTime(props.model.billing_expr)
  const dynamic = useMemo(
    () =>
      getDynamicPricingSummary(props.model, {
        priceRate: options.priceRate,
        usdExchangeRate: options.usdExchangeRate,
        showRechargePrice: options.showRechargePrice,
        now: billingTime === undefined ? undefined : new Date(billingTime),
        tokenUnit,
        showCurrencySymbol: true,
        groupRatioMultiplier: getDynamicDisplayGroupRatio(
          props.model,
          options.selectedGroup
        ),
      }),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.model,
      tokenUnit,
      options.priceRate,
      options.usdExchangeRate,
      options.showRechargePrice,
      options.selectedGroup,
      billingTime,
      currency,
    ]
  )

  if (dynamic) {
    if (dynamic.isSpecialExpression) return <UnsetPrice />

    const requestEntry = dynamic.primaryEntries.find(
      (entry) => entry.unit === 'request' || entry.unit === 'image'
    )
    if (requestEntry) {
      return (
        <span>
          {requestEntry.formattedRange ?? requestEntry.formatted}/{t('call')}
        </span>
      )
    }

    if (dynamic.isTaskUsage) {
      const entry = dynamic.primaryEntries[0]
      if (!entry) return <UnsetPrice />
      const unit = getDynamicPriceUnitLabelKey(entry)
      const unitLabel = taskUsageUnitLabel(
        entry,
        i18n.language,
        unit ? t(unit) : ''
      )
      return (
        <span>
          {entry.formattedRange ?? entry.formatted}
          {unitLabel ? `/${unitLabel}` : ''}
        </span>
      )
    }

    const values = dynamic.primaryEntries
      .slice(0, 2)
      .map((entry) => entry.formattedRange ?? entry.formatted)
    if (values.length === 0) return <UnsetPrice />
    return <span>{values.join(' / ')}</span>
  }

  if (isUnconfiguredTaskUsageModel(props.model)) return <UnsetPrice />

  const isTokenBased = isTokenBasedModel(props.model)
  if (
    !Number.isFinite(
      isTokenBased ? props.model.model_ratio : props.model.model_price
    )
  ) {
    return <UnsetPrice />
  }

  if (!isTokenBased) {
    return (
      <span>
        {formatRequestPrice(
          props.model,
          options.showRechargePrice,
          options.priceRate,
          options.usdExchangeRate,
          options.selectedGroup
        )}
        /{t('call')}
      </span>
    )
  }

  return (
    <span>
      {formatPrice(
        props.model,
        'input',
        tokenUnit,
        options.showRechargePrice,
        options.priceRate,
        options.usdExchangeRate,
        options.selectedGroup
      )}
      {' / '}
      {formatPrice(
        props.model,
        'output',
        tokenUnit,
        options.showRechargePrice,
        options.priceRate,
        options.usdExchangeRate,
        options.selectedGroup
      )}
    </span>
  )
}
