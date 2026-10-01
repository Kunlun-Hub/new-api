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
import { useTranslation } from 'react-i18next'

import { StatusBadge, type StatusVariant } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { getBillingModeLabelKey } from '../lib/billing-mode'
import { hasTaskUsageSchema, isDynamicPricingModel } from '../lib/dynamic-price'
import { isTokenBasedModel } from '../lib/model-helpers'
import type { PricingModel } from '../types'

interface ModelBillingModeBadgeProps {
  model: PricingModel
  appearance?: 'default' | 'caption' | 'chip'
  className?: string
}

export function ModelBillingModeBadge(props: ModelBillingModeBadgeProps) {
  const { t } = useTranslation()
  const labelKey = getBillingModeLabelKey(props.model)
  const label = t(labelKey)
  const isCaption = props.appearance === 'caption'

  if (props.appearance === 'chip') {
    // The model square uses the short usage/pay-per-call wording, unlike the
    // longer billing-mode labels shown in tables and admin views.
    const isUsagePriced =
      isTokenBasedModel(props.model) || hasTaskUsageSchema(props.model)
    return (
      <Badge
        variant='outline'
        className={cn(
          'border-border/40 h-4.5 rounded-4xl px-2 py-0.5 text-[10px] font-medium',
          props.className
        )}
      >
        {isUsagePriced ? t('Per-token') : t('Per-call')}
      </Badge>
    )
  }

  let variant: StatusVariant = 'purple'

  if (isDynamicPricingModel(props.model)) {
    variant = 'warning'
  } else if (labelKey === 'Token-based') {
    variant = 'info'
  }

  return (
    <StatusBadge
      label={label}
      variant={variant}
      type={isCaption ? 'text' : undefined}
      copyable={false}
      size='sm'
      className={cn(isCaption && 'text-xs font-normal', props.className)}
    />
  )
}
