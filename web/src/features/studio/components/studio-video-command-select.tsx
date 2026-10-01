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
import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type StudioVideoCommandSelectProps = {
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
  showSearch?: boolean
  emptyText?: string
  valueClassName?: string
  contentClassName?: string
  onChange: (value: string) => void
}

/** Chip styled command picker used by the studio video composer. */
export function StudioVideoCommandSelect(props: StudioVideoCommandSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = props.options.find((item) => item.value === props.value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            className='h-8 cursor-pointer gap-1 px-2.5 font-medium'
            disabled={props.disabled}
            role='combobox'
            size='sm'
            variant='ghost'
          />
        }
      >
        <span className={cn('truncate', props.valueClassName ?? 'max-w-32')}>
          {current?.label ?? props.placeholder}
        </span>
        <ChevronsUpDown className='text-muted-foreground size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className={cn(
          'w-auto max-w-[92vw] p-0',
          props.contentClassName ?? 'min-w-40'
        )}
        collisionPadding={8}
        sideOffset={4}
      >
        <Command>
          {props.showSearch ? (
            <CommandInput placeholder={t('Search...')} />
          ) : null}
          <CommandList className='max-h-80'>
            <CommandEmpty>
              {props.emptyText ?? t('No results found')}
            </CommandEmpty>
            <CommandGroup>
              {props.options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    props.onChange(option.value)
                    setOpen(false)
                  }}
                  value={`${option.label} ${option.value}`}
                >
                  <Check
                    className={cn(
                      'size-4',
                      props.value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='flex-1 truncate pr-4'>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
