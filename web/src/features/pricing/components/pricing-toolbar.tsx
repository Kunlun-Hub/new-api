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
import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTableViewModeToggle } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import type { ViewMode } from '../constants'

export interface PricingToolbarProps {
  filteredCount: number
  totalCount?: number
  vendorLabel: string
  showRechargePrice: boolean
  onRechargePriceChange: (value: boolean) => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  onDownload: () => void
  children?: ReactNode
}

export function PricingToolbar(props: PricingToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className='border-border/40 bg-card/20 mb-6 flex flex-col gap-3 rounded-xl border p-3'>
      <div className='flex min-h-10 items-center gap-3 max-md:flex-col max-md:items-stretch'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <span className='bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl'>
            <span
              className='bg-foreground/90 text-background inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.75em] font-semibold uppercase'
              aria-hidden='true'
            >
              {props.vendorLabel.slice(0, 1)}
            </span>
          </span>
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
            <h2 className='text-foreground min-w-0 truncate text-base font-semibold'>
              {props.vendorLabel}
            </h2>
            <span className='text-muted-foreground text-xs'>
              {t('{{count}} models in total', { count: props.filteredCount })}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-3 max-md:justify-end'>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('Download')}
            onClick={props.onDownload}
          >
            <Download className='size-4' />
          </Button>

          <div className='border-border/60 flex items-center gap-2 rounded-lg border px-2 py-1.5'>
            <Switch
              id='pricing-recharge-price'
              checked={props.showRechargePrice}
              onCheckedChange={props.onRechargePriceChange}
            />
            <Label
              htmlFor='pricing-recharge-price'
              className='text-sm leading-none'
            >
              {t('Multiplier')}
            </Label>
          </div>

          <DataTableViewModeToggle
            value={props.viewMode}
            onChange={props.onViewModeChange}
          />
        </div>
      </div>

      {props.children}
    </div>
  )
}
