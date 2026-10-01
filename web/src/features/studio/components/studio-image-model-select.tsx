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
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

/** Image provider (vendor) offered by the studio image composer. */
export type StudioImageProvider = {
  value: string
  label: string
  iconKey?: string
  models: { value: string; label: string }[]
}

type StudioImageModelSelectProps = {
  providers: StudioImageProvider[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

/** Provider picker chip shown in the studio image composer. */
export function StudioImageModelSelect(props: StudioImageModelSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = props.providers.find((item) => item.value === props.value)

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
        {current?.iconKey ? (
          <span className='flex size-5 shrink-0 items-center justify-center'>
            {getLobeIcon(current.iconKey, 20)}
          </span>
        ) : null}
        <span className='max-w-32 truncate'>
          {current?.label ?? t('Select provider')}
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
          <CommandInput placeholder={t('Search...')} />
          <CommandList className='max-h-72'>
            <CommandEmpty>{t('No providers found')}</CommandEmpty>
            <CommandGroup>
              {props.providers.map((provider) => (
                <CommandItem
                  key={provider.value}
                  onSelect={() => {
                    props.onChange(provider.value)
                    setOpen(false)
                  }}
                  value={provider.label}
                >
                  <Check
                    className={cn(
                      'size-4',
                      props.value === provider.value
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {provider.iconKey ? (
                    <span className='flex size-5 shrink-0 items-center justify-center'>
                      {getLobeIcon(provider.iconKey, 20)}
                    </span>
                  ) : null}
                  <span className='flex-1 truncate pr-4'>{provider.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
