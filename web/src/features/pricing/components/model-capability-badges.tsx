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

import {
  formatContextLength,
  getCapabilityBadges,
  type CapabilityBadge,
} from '../lib/capability-badges'
import type { PricingModel } from '../types'

export const ModelCapabilityBadges = memo(
  function ModelCapabilityBadges(props: {
    model: PricingModel
    className?: string
    /** Maximum number of chips before collapsing the rest into a `+N` chip. */
    maxVisible?: number
    /** Capability keys rendered elsewhere, e.g. the web-search chip next to the billing mode. */
    exclude?: string[]
    /** `sm` (default) is the card chip size, `md` matches the model square table. */
    size?: 'sm' | 'md'
    /** Extra chips prepended to the model's own capabilities. */
    leadingBadges?: CapabilityBadge[]
    /** Hide the trailing context-window chip when it has a dedicated column. */
    hideContext?: boolean
  }) {
    const { t } = useTranslation()
    const badges = [
      ...(props.leadingBadges ?? []),
      ...getCapabilityBadges(props.model),
    ].filter((badge) => !props.exclude?.includes(badge.key))
    const contextLabel = props.hideContext
      ? null
      : formatContextLength(props.model.context_length)

    if (badges.length === 0 && !contextLabel) return null

    const visible =
      props.maxVisible === undefined
        ? badges
        : badges.slice(0, props.maxVisible)
    const hidden =
      props.maxVisible === undefined ? [] : badges.slice(props.maxVisible)
    const isTableSize = props.size === 'md'
    const chipClass = isTableSize
      ? 'h-5 rounded-4xl px-2 py-0.5 text-xs! font-medium'
      : 'border-border/40 h-4.5 rounded-4xl px-2 py-0.5 text-[10px] font-medium'

    return (
      <div className={cn('flex flex-wrap items-center gap-1', props.className)}>
        {visible.map((badge) => (
          <Badge key={badge.key} variant='outline' className={chipClass}>
            {t(badge.labelKey)}
          </Badge>
        ))}
        {hidden.length > 0 && (
          <Badge
            variant={isTableSize ? 'secondary' : 'outline'}
            className={cn(chipClass, isTableSize && 'border-transparent')}
            title={hidden.map((badge) => t(badge.labelKey)).join(', ')}
          >
            +{hidden.length}
          </Badge>
        )}
        {contextLabel && (
          <Badge
            variant='secondary'
            className={cn(
              chipClass,
              'border-transparent font-mono tabular-nums'
            )}
          >
            {contextLabel}
          </Badge>
        )}
      </div>
    )
  }
)
