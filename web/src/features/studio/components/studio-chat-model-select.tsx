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
import { useMemo, useState } from 'react'
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
import type { ModelOption } from '@/features/playground/types'
import { cn } from '@/lib/utils'

import type { StudioModelCatalog } from '../hooks/use-studio-model-catalog'

type StudioChatModelSelectProps = {
  models: ModelOption[]
  value: string
  catalog?: StudioModelCatalog
  disabled?: boolean
  onChange: (value: string) => void
}

/** Model picker chip shown in the studio chat composer. */
export function StudioChatModelSelect(props: StudioChatModelSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    const grouped = new Map<string, ModelOption[]>()
    for (const model of props.models) {
      const vendor = props.catalog?.get(model.value)?.vendorName || t('Other')
      const items = grouped.get(vendor)
      if (items) {
        items.push(model)
      } else {
        grouped.set(vendor, [model])
      }
    }
    return [...grouped.entries()]
  }, [props.catalog, props.models, t])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            className='h-8 shrink-0 gap-1 px-2.5 font-medium'
            disabled={props.disabled}
            role='combobox'
            size='sm'
            variant='ghost'
          />
        }
      >
        {props.value || t('Select model')}
        <ChevronsUpDown className='text-muted-foreground size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-88 max-w-[90vw] p-0'
        collisionPadding={8}
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder={t('Search models...')} />
          <CommandList className='max-h-72'>
            <CommandEmpty>{t('No models found')}</CommandEmpty>
            {groups.map(([vendor, items]) => (
              <CommandGroup heading={vendor} key={vendor}>
                {items.map((model) => (
                  <CommandItem
                    key={model.value}
                    onSelect={() => {
                      props.onChange(model.value)
                      setOpen(false)
                    }}
                    value={model.value}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        props.value === model.value
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {model.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
