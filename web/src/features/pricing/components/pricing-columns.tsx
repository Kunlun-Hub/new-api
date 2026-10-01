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
import type { ColumnDef } from '@tanstack/react-table'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBillingCurrencySymbol } from '@/lib/currency'

import { useModelPerfMap } from '../hooks/use-model-perf-map'
import { getMetaTagBadges } from '../lib/capability-badges'
import type { PricingModel } from '../types'
import { ModelAvailabilityCell } from './model-availability-cell'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelCapabilityBadges } from './model-capability-badges'
import type { ModelPriceCellOptions } from './model-price-cell'
import { ModelTablePriceCell } from './model-table-price-cell'

// ----------------------------------------------------------------------------
// Pricing Table Columns
// ----------------------------------------------------------------------------

export type PricingColumnsOptions = ModelPriceCellOptions & {
  onModelTry?: (modelName: string) => void
}

/** Column widths measured from the reference model square table. */
export const PRICING_COLUMN_SIZES = {
  model: 347,
  tags: 292,
  context: 122,
  billing: 106,
  price: 180,
  availability: 252,
  actions: 129,
} as const

function formatTableContext(tokens?: number): string | null {
  if (!tokens || !Number.isFinite(tokens) || tokens <= 0) return null
  return `${Math.round(tokens / 1000)}K`
}

export function usePricingColumns(
  options: PricingColumnsOptions = {}
): ColumnDef<PricingModel>[] {
  const { t } = useTranslation()
  const perfMap = useModelPerfMap()
  const currencySymbol = getBillingCurrencySymbol()
  const tokenUnitLabel = options.tokenUnit === 'K' ? 'K' : 'M'

  return [
    // Model name column — the name itself is a copy button, like the reference.
    {
      accessorKey: 'model_name',
      meta: { label: t('Model name') },
      header: t('Model name'),
      cell: ({ row }) => (
        <span onClick={(event) => event.stopPropagation()}>
          <CopyButton
            value={row.original.model_name}
            size='default'
            tooltip={t('Copy model name')}
            aria-label={t('Copy {{name}}', {
              name: row.original.model_name,
            })}
            className='hover:text-primary h-auto max-w-80 justify-start gap-x-2 p-0 font-medium hover:bg-transparent'
          >
            <span className='truncate'>{row.original.model_name}</span>
          </CopyButton>
        </span>
      ),
      size: PRICING_COLUMN_SIZES.model,
      enableSorting: false,
    },

    // Capability tags column
    {
      accessorKey: 'tags',
      meta: { label: t('Tags') },
      header: t('Tags'),
      cell: ({ row }) => (
        <ModelCapabilityBadges
          model={row.original}
          size='md'
          maxVisible={2}
          hideContext
          leadingBadges={getMetaTagBadges(row.original)}
        />
      ),
      size: PRICING_COLUMN_SIZES.tags,
      enableSorting: false,
    },

    // Context window column
    {
      accessorKey: 'context_length',
      meta: { label: t('Context') },
      header: t('Context'),
      cell: ({ row }) => {
        const label = formatTableContext(row.original.context_length)
        return (
          <Badge
            variant='ghost'
            className='h-5 rounded-4xl px-2 py-0.5 text-xs font-medium'
          >
            {label ?? '-'}
          </Badge>
        )
      },
      size: PRICING_COLUMN_SIZES.context,
      enableSorting: false,
    },

    // Billing mode column
    {
      accessorKey: 'quota_type',
      meta: { label: t('Billing') },
      header: t('Billing'),
      cell: ({ row }) => (
        <ModelBillingModeBadge
          model={row.original}
          appearance='chip'
          className='h-5 rounded-4xl border-transparent px-2 py-0.5 text-xs!'
        />
      ),
      size: PRICING_COLUMN_SIZES.billing,
      enableSorting: false,
    },

    // Input/output price column
    {
      accessorKey: 'price',
      meta: { label: t('Input/Output {{currency}}/{{unit}}') },
      header: t('Input/Output {{currency}}/{{unit}}', {
        currency: currencySymbol,
        unit: tokenUnitLabel,
      }),
      cell: ({ row }) => (
        <ModelTablePriceCell model={row.original} options={options} />
      ),
      size: PRICING_COLUMN_SIZES.price,
      enableSorting: false,
    },

    // Availability column
    {
      id: 'availability',
      meta: { label: t('Availability') },
      header: t('Availability'),
      cell: ({ row }) => (
        <ModelAvailabilityCell perf={perfMap.get(row.original.model_name)} />
      ),
      size: PRICING_COLUMN_SIZES.availability,
      enableSorting: false,
    },

    // Row actions column
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant='outline'
          size='sm'
          className='h-7 gap-1 px-2 text-xs!'
          onClick={(event) => {
            event.stopPropagation()
            options.onModelTry?.(row.original.model_name)
          }}
        >
          <Sparkles aria-hidden data-icon='inline-start' />
          {t('Try')}
        </Button>
      ),
      size: PRICING_COLUMN_SIZES.actions,
      enableSorting: false,
    },
  ]
}
