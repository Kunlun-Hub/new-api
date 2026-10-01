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
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import type { PricingModel } from '../types'

export interface SearchBarProps {
  models: PricingModel[]
  onSelect: (modelName: string) => void
  className?: string
}

export function SearchBar(props: SearchBarProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div
        className={cn(
          'group ml-auto flex min-w-0 flex-1 items-center justify-start gap-2 rounded-md border border-border/40 bg-background pr-2 pl-1 hover:bg-muted sm:max-w-80 lg:w-72 lg:flex-none lg:rounded-lg',
          props.className
        )}
      >
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 min-w-0 flex-1 justify-start gap-1 rounded-[min(var(--radius-md),12px)] bg-transparent! px-2.5 text-[0.8rem]'
          onClick={() => setOpen(true)}
        >
          <Search data-icon='inline-start' className='text-muted-foreground' />
          <span className='text-muted-foreground truncate'>
            {t('Search models...')}
          </span>
        </Button>
        <Kbd className='hidden sm:inline-flex'>⌘K</Kbd>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('Search models')}
        description={t('Search models...')}
        className='sm:max-w-lg'
      >
        <Command>
          <CommandInput placeholder={t('Search models...')} />
          <CommandList className='max-h-80'>
            <CommandEmpty>{t('No models found.')}</CommandEmpty>
            <CommandGroup heading={t('Model Square')}>
              {props.models.map((model) => {
                const iconName = model.icon || model.vendor_icon
                return (
                  <CommandItem
                    key={model.model_name}
                    value={`${model.model_name} ${model.vendor_name ?? ''}`}
                    onSelect={() => {
                      setOpen(false)
                      props.onSelect(model.model_name || '')
                    }}
                  >
                    <span className='border-border/60 flex size-6 shrink-0 items-center justify-center rounded-md border'>
                      {iconName ? (
                        getLobeIcon(iconName, 14)
                      ) : (
                        <span className='text-[10px] font-semibold'>
                          {model.model_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </span>
                    <span className='min-w-0 flex-1 truncate'>
                      {model.model_name}
                    </span>
                    {model.vendor_name && (
                      <CommandShortcut>{model.vendor_name}</CommandShortcut>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
