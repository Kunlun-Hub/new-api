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
import { Check, ChevronsUpDown, Layers } from 'lucide-react'
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
  CommandShortcut,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { GroupOption } from '@/features/playground/types'
import { cn } from '@/lib/utils'

type StudioChatGroupSelectProps = {
  groups: GroupOption[]
  value: string
  className?: string
  disabled?: boolean
  onChange: (value: string) => void
}

/** Token group picker chip (billing multiplier) in the studio chat composer. */
export function StudioChatGroupSelect(props: StudioChatGroupSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            className={cn(
              'text-muted-foreground h-8 gap-1 px-2.5 font-medium',
              props.className
            )}
            disabled={props.disabled}
            role='combobox'
            size='sm'
            title={t('Token group (billing multiplier)')}
            variant='ghost'
          />
        }
      >
        <Layers className='size-3.5' />
        {props.value || t('Select group')}
        <ChevronsUpDown className='text-muted-foreground size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-56 p-0'
        collisionPadding={8}
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder={t('Search token groups...')} />
          <CommandList className='max-h-72'>
            <CommandEmpty>{t('No groups found')}</CommandEmpty>
            <CommandGroup>
              {props.groups.map((group) => (
                <CommandItem
                  key={group.value}
                  onSelect={() => {
                    props.onChange(group.value)
                    setOpen(false)
                  }}
                  value={group.value}
                >
                  <Check
                    className={cn(
                      'size-4',
                      props.value === group.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {group.label}
                  {group.ratio ? (
                    <CommandShortcut className='tracking-normal'>
                      {group.ratio}x
                    </CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
