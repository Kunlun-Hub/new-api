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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { PricingModel } from '../types'

/**
 * Model square payment-source chips: every listed model can be paid from the
 * account balance; gift credit is only announced when the model metadata
 * enables it.
 */
export const ModelPaymentBadges = memo(function ModelPaymentBadges(props: {
  model: PricingModel
  className?: string
  size?: 'sm' | 'md'
}) {
  const { t } = useTranslation()
  const chipClass =
    props.size === 'md'
      ? 'h-5 rounded-4xl px-2 py-0.5 text-xs! font-medium'
      : 'h-4.5 rounded-4xl px-2 py-0.5 text-[10px] font-medium'

  return (
    <div className={cn('flex flex-wrap items-center gap-1', props.className)}>
      <Badge variant='outline' className={cn(chipClass, 'border-border/40')}>
        {t('Balance')}
      </Badge>
      {props.model.gift_quota_enabled && (
        <Badge
          variant='outline'
          className={cn(
            chipClass,
            'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          )}
        >
          {t('Gift credit')}
        </Badge>
      )}
    </div>
  )
})
