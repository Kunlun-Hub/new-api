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

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

import type { FilterOption } from '../hooks/use-pricing-filter-options'

export interface MobileFilterSection {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

interface MobileFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  sections: MobileFilterSection[]
}

export function MobileFilterSheet(props: MobileFilterSheetProps) {
  const { t } = useTranslation()

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side='bottom'
        className='h-dvh gap-0 bg-popover text-popover-foreground'
      >
        <div className='flex flex-row items-center justify-between gap-0.5 p-4 pr-12'>
          <SheetTitle>{t('Filter')}</SheetTitle>
          {props.hasActiveFilters ? (
            <Button
              type='button'
              variant='ghost'
              size='xs'
              className='text-muted-foreground'
              onClick={props.onClearFilters}
            >
              {t('Reset')}
            </Button>
          ) : null}
        </div>
        <div className='relative min-h-0 flex-1'>
          <div className='size-full overflow-y-auto overscroll-contain'>
            <div className='flex flex-col gap-6 px-4 pb-6'>
              {props.sections.map((section) => (
                <section
                  key={section.label}
                  className='flex flex-col gap-2.5'
                >
                  <h3 className='text-foreground text-sm font-medium'>
                    {section.label}
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {section.options.map((option) => {
                      const selected = option.value === section.value
                      return (
                        <Button
                          key={option.value}
                          type='button'
                          variant={selected ? 'default' : 'outline'}
                          aria-pressed={selected}
                          className='h-7.5 max-w-full gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs'
                          onClick={() => {
                            section.onChange(option.value)
                            props.onOpenChange(false)
                          }}
                        >
                          <span className='truncate'>{option.label}</span>
                          {option.suffix != null && (
                            <span className='opacity-70'>{option.suffix}</span>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
