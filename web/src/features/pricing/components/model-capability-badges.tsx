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
} from '../lib/capability-badges'
import type { PricingModel } from '../types'

export const ModelCapabilityBadges = memo(
  function ModelCapabilityBadges(props: {
    model: PricingModel
    className?: string
  }) {
    const { t } = useTranslation()
    const badges = getCapabilityBadges(props.model)
    const contextLabel = formatContextLength(props.model.context_length)

    if (badges.length === 0 && !contextLabel) return null

    return (
      <div
        className={cn('flex flex-wrap items-center gap-1.5', props.className)}
      >
        {badges.map((badge) => (
          <Badge
            key={badge.key}
            variant='secondary'
            className='rounded-md px-1.5 py-0.5 text-[11px] font-normal'
          >
            {t(badge.labelKey)}
          </Badge>
        ))}
        {contextLabel && (
          <span className='text-muted-foreground ml-auto font-mono text-[11px] tabular-nums'>
            {contextLabel}
          </span>
        )}
      </div>
    )
  }
)
