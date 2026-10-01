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
import type { Table } from '@tanstack/react-table'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTableViewOptions } from '@/components/data-table/toolbar/view-options'
import { Button } from '@/components/ui/button'
import { InputClear } from '@/components/ui/input-clear'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { ApiKey } from '../types'
import { useApiKeys } from './api-keys-provider'
import { DataTableBulkActions } from './data-table-bulk-actions'

export type ApiKeySortValue = 'default' | 'balance' | 'usage'

const SORT_OPTIONS: { value: ApiKeySortValue; label: string }[] = [
  { value: 'default', label: 'Default Sort' },
  { value: 'balance', label: 'Sort by Balance' },
  { value: 'usage', label: 'Sort by Usage' },
]

type ApiKeysToolbarProps = {
  table: Table<ApiKey>
  sortValue: ApiKeySortValue
  onSortValueChange: (value: ApiKeySortValue) => void
  nameDraft: string
  onNameDraftChange: (value: string) => void
  tokenDraft: string
  onTokenDraftChange: (value: string) => void
  onSearch: () => void
  isFetching?: boolean
}

export function ApiKeysToolbar(props: ApiKeysToolbarProps) {
  const { t } = useTranslation()
  const { setOpen, triggerRefresh } = useApiKeys()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const selectedCount = props.table.getFilteredSelectedRowModel().rows.length
  const hasSelection = selectedCount > 0

  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      props.onSearch()
    }
  }

  return (
    <div className='flex grow flex-wrap items-center justify-between gap-2'>
      {hasSelection ? (
        <DataTableBulkActions table={props.table} />
      ) : (
        <div
          className={cn(
            'grow flex-wrap items-center gap-2 lg:flex max-lg:order-1 max-lg:mt-3 max-lg:flex-col max-lg:items-stretch',
            mobileFiltersOpen ? 'max-lg:flex' : 'max-lg:hidden'
          )}
        >
          <Select
            items={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            }))}
            value={props.sortValue}
            onValueChange={(value) =>
              props.onSortValueChange(value as ApiKeySortValue)
            }
          >
            <SelectTrigger
              className='w-full lg:w-36'
              aria-label={t('Default Sort')}
            >
              <SelectValue placeholder={t('Default Sort')} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.label)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <InputClear
            placeholder={t('Name')}
            aria-label={t('Name')}
            value={props.nameDraft}
            onValueChange={props.onNameDraftChange}
            onKeyDown={submitOnEnter}
            className='w-full lg:w-40'
          />
          <InputClear
            placeholder={t('ApiKey')}
            aria-label={t('ApiKey')}
            value={props.tokenDraft}
            onValueChange={props.onTokenDraftChange}
            onKeyDown={submitOnEnter}
            className='w-full lg:w-40'
          />
          <Button
            type='button'
            variant='outline'
            onClick={props.onSearch}
            disabled={props.isFetching}
            className='max-lg:w-full'
          >
            <Search aria-hidden='true' />
            {t('Query')}
          </Button>
        </div>
      )}

      <div
        className={cn(
          'flex items-center justify-between gap-2',
          !hasSelection && 'max-lg:grow'
        )}
      >
        {!hasSelection && (
          <Button
            type='button'
            variant='outline'
            className='mr-auto lg:hidden'
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            {t('Filters')}
          </Button>
        )}

        <div className='flex items-center gap-2 max-sm:ms-auto'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={t('Refresh')}
                  onClick={triggerRefresh}
                  className='max-xl:hidden'
                />
              }
            >
              <RefreshCw
                aria-hidden='true'
                className={cn(
                  'text-foreground/70',
                  props.isFetching && 'animate-spin'
                )}
              />
            </TooltipTrigger>
            <TooltipContent>{t('Refresh')}</TooltipContent>
          </Tooltip>

          <DataTableViewOptions table={props.table} />

          <Button
            type='button'
            className='shadow-primary/20 px-4 shadow-lg'
            onClick={() => setOpen('create')}
          >
            <Plus aria-hidden='true' />
            {t('Create Token')}
          </Button>
        </div>
      </div>
    </div>
  )
}
