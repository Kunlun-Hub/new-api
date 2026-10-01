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
import { Check, ChevronsUpDown, KeyRound, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import type { ApiKey } from '@/features/keys/types'
import { cn } from '@/lib/utils'

type StudioImageTokenSelectProps = {
  tokens: ApiKey[]
  value: number | null
  loading?: boolean
  disabled?: boolean
  onRefresh: () => void
  onChange: (id: number) => void
}

/** API key picker chip of the studio image composer. */
export function StudioImageTokenSelect(props: StudioImageTokenSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = props.tokens.find((token) => token.id === props.value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            className='text-muted-foreground ml-auto h-8 cursor-pointer gap-1.5 px-2.5 font-normal'
            disabled={props.disabled}
            role='combobox'
            size='sm'
            variant='ghost'
          />
        }
      >
        <KeyRound className='size-3.5 shrink-0' />
        <span className='max-w-28 truncate'>
          {current ? current.name : t('Select token')}
        </span>
        <ChevronsUpDown className='text-muted-foreground size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-auto max-w-[92vw] min-w-64 p-0'
        collisionPadding={8}
        sideOffset={4}
      >
        <Command>
          <CommandList className='max-h-72'>
            <CommandEmpty>
              {props.loading
                ? t('Tokens are loading. Please wait.')
                : t('No available tokens')}
            </CommandEmpty>
            <CommandGroup>
              <div className='flex items-center justify-between px-2 py-1.5'>
                <span className='text-muted-foreground text-xs font-medium'>
                  {t('Select token')}
                </span>
                <Button
                  aria-label={t('Refresh tokens')}
                  className='size-6'
                  disabled={props.loading}
                  onClick={(event) => {
                    event.stopPropagation()
                    props.onRefresh()
                  }}
                  size='icon-xs'
                  variant='ghost'
                >
                  {props.loading ? (
                    <Spinner className='size-3.5' />
                  ) : (
                    <RefreshCw className='size-3.5' />
                  )}
                </Button>
              </div>
              {props.tokens.map((token) => (
                <CommandItem
                  key={token.id}
                  onSelect={() => {
                    props.onChange(token.id)
                    setOpen(false)
                  }}
                  value={token.name}
                >
                  <Check
                    className={cn(
                      'size-4',
                      props.value === token.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='truncate'>{token.name}</span>
                  <CommandShortcut className='tracking-normal'>
                    {token.key.length > 6
                      ? `sk-${token.key.slice(0, 2)}***${token.key.slice(-3)}`
                      : `sk-${token.key}`}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
