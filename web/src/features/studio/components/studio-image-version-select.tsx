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
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type StudioImageVersionSelectProps = {
  options: { value: string; label: string }[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

/** Model version picker chip (e.g. MJ V7) of the studio image composer. */
export function StudioImageVersionSelect(props: StudioImageVersionSelectProps) {
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
        <span className='max-w-32 truncate'>
          {current ? t(current.label) : t('Select model')}
        </span>
        <ChevronsUpDown className='text-muted-foreground size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-auto max-w-[92vw] min-w-52 p-0'
        collisionPadding={8}
        sideOffset={4}
      >
        <Command>
          <CommandList className='max-h-72'>
            <CommandEmpty>{t('No options found')}</CommandEmpty>
            <CommandGroup>
              {props.options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    props.onChange(option.value)
                    setOpen(false)
                  }}
                  value={option.label}
                >
                  <Check
                    className={cn(
                      'size-4',
                      props.value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='flex-1 truncate pr-4'>
                    {t(option.label)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
