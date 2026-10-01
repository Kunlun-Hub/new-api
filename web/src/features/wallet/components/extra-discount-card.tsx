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
import { CircleHelp, Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatQuotaFixed } from '@/lib/format'

import { formatDiscountInZhe } from '../lib/format'
import type { TopupGroupDiscount } from '../types'

interface ExtraDiscountCardProps {
  discounts: TopupGroupDiscount[]
  totalTopup?: number
}

export function ExtraDiscountCard({
  discounts,
  totalTopup,
}: ExtraDiscountCardProps) {
  const { t } = useTranslation()

  if (discounts.length === 0) {
    return null
  }

  return (
    <Card className='border-border/50 gap-3 rounded-xl border py-4 ring-0 lg:px-5'>
      <h3 className='flex items-center gap-1.5 px-4 text-base font-semibold lg:px-0'>
        <Crown className='size-4 text-amber-500' />
        {t('Extra Discount')}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <CircleHelp className='text-muted-foreground size-3.5 cursor-help' />
              }
            />
            <TooltipContent>
              {t(
                'Top-up discounts are granted automatically based on your account group.'
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h3>

      <div className='space-y-2.5 px-4 lg:px-0'>
        {discounts.map((item) => (
          <div
            key={item.group}
            className='border-border/40 from-foreground/4 rounded-lg border bg-linear-to-br via-transparent to-transparent p-3 transition hover:scale-[1.02]'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='font-semibold tracking-wide uppercase'>
                {item.group}
              </span>
              <span className='bg-foreground text-background rounded-full px-2 py-0.5 text-[12px]'>
                {t('Extra {{percent}}% off', {
                  percent: Math.round((1 - item.ratio) * 100),
                  discount: formatDiscountInZhe(item.ratio),
                })}
              </span>
            </div>
            {item.description ? (
              <p className='text-muted-foreground mt-1 text-xs'>
                {item.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {totalTopup != null ? (
        <div className='bg-muted/40 mx-4 rounded-lg px-3 py-2 text-center text-sm lg:mx-0'>
          {t('You have topped up {{amount}}', {
            amount: formatQuotaFixed(totalTopup),
          })}
        </div>
      ) : null}
    </Card>
  )
}
