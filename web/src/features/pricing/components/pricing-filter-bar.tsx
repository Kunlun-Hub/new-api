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
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import {
  usePricingFilterOptions,
  type FilterOption,
} from '../hooks/use-pricing-filter-options'
import type { PricingModel, PricingVendor } from '../types'
import {
  MobileFilterSheet,
  type MobileFilterSection,
} from './mobile-filter-sheet'
import { SearchBar } from './search-bar'

export interface PricingFilterBarProps {
  quotaTypeFilter: string
  endpointTypeFilter: string
  vendorFilter: string
  groupFilter: string
  tagFilter: string
  onQuotaTypeChange: (value: string) => void
  onEndpointTypeChange: (value: string) => void
  onVendorChange: (value: string) => void
  onGroupChange: (value: string) => void
  onTagChange: (value: string) => void
  vendors: PricingVendor[]
  groups: string[]
  groupRatios?: Record<string, number>
  tags: string[]
  models: PricingModel[]
  hasActiveFilters: boolean
  onClearFilters: () => void
  onModelSelect: (modelName: string) => void
}

interface FilterDropdownProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

function getOptionLabel(options: FilterOption[], value: string): string {
  const match = options.find((option) => option.value === value)
  return match?.label ?? value
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: FilterDropdownProps) {
  return (
    <div className='relative shrink-0'>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 max-w-64 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-sm font-normal'
            />
          }
        >
          <span className='text-muted-foreground'>{label}</span>
          <span className='truncate font-medium'>
            {getOptionLabel(options, value)}
          </span>
          <ChevronDown className='text-muted-foreground size-3.5 shrink-0' />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='start'
          className='max-h-80 w-56 overflow-y-auto'
        >
          <DropdownMenuGroup>
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onChange(option.value)}
                className='gap-2'
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {option.icon && <span className='shrink-0'>{option.icon}</span>}
                <span className='truncate'>{option.label}</span>
                {option.suffix != null && (
                  <span className='text-muted-foreground ml-auto text-xs'>
                    {option.suffix}
                  </span>
                )}
                {option.count != null && option.suffix == null && (
                  <span className='text-muted-foreground ml-auto text-xs tabular-nums'>
                    {option.count}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const PricingFilterBar = memo(function PricingFilterBar(
  props: PricingFilterBarProps
) {
  const { t } = useTranslation()
  const [filterOpen, setFilterOpen] = useState(false)
  const {
    vendorOptions,
    groupOptions,
    tagOptions,
    quotaOptions,
    endpointOptions,
  } = usePricingFilterOptions({
    quotaTypeFilter: props.quotaTypeFilter,
    endpointTypeFilter: props.endpointTypeFilter,
    vendorFilter: props.vendorFilter,
    groupFilter: props.groupFilter,
    tagFilter: props.tagFilter,
    vendors: props.vendors,
    groups: props.groups,
    groupRatios: props.groupRatios,
    tags: props.tags,
    models: props.models,
  })

  const sections: MobileFilterSection[] = [
    {
      label: t('Vendors'),
      value: props.vendorFilter,
      options: vendorOptions,
      onChange: props.onVendorChange,
    },
    {
      label: t('Token Groups'),
      value: props.groupFilter,
      options: groupOptions,
      onChange: props.onGroupChange,
    },
    {
      label: t('Tag'),
      value: props.tagFilter,
      options: tagOptions,
      onChange: props.onTagChange,
    },
    {
      label: t('Billing'),
      value: props.quotaTypeFilter,
      options: quotaOptions,
      onChange: props.onQuotaTypeChange,
    },
    {
      label: t('Context'),
      value: props.endpointTypeFilter,
      options: endpointOptions,
      onChange: props.onEndpointTypeChange,
    },
  ]

  return (
    <div className='border-border/40 flex w-full flex-col gap-2 border-t pt-3'>
      <div className='flex w-full items-center gap-2 max-lg:flex-wrap'>
        <nav className='hidden items-center gap-x-1 gap-y-2 lg:flex lg:flex-wrap'>
          {sections.map((section) => (
            <FilterDropdown key={section.label} {...section} />
          ))}
        </nav>

        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8.5 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-sm lg:hidden'
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal data-icon='inline-start' />
          {t('Filter')}
        </Button>

        <SearchBar
          models={props.models}
          onSelect={props.onModelSelect}
          className='ml-auto max-sm:ml-0 max-sm:w-full'
        />
      </div>

      <MobileFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        hasActiveFilters={props.hasActiveFilters}
        onClearFilters={props.onClearFilters}
        sections={sections}
      />
    </div>
  )
})
