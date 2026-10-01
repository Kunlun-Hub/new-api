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
import { ArrowUp } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

type StudioComposerProps = {
  title: ReactNode
  placeholder: string
  controls: ReactNode
  chips: string[]
  disabled?: boolean
  isSubmitting?: boolean
  initialPrompt?: string
  onSubmit: (prompt: string) => void
  children?: ReactNode
}

/** Prompt composer shared by the studio image/video pages. */
export function StudioComposer(props: StudioComposerProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState(props.initialPrompt ?? '')

  useEffect(() => {
    if (props.initialPrompt) setPrompt(props.initialPrompt)
  }, [props.initialPrompt])

  const trimmed = prompt.trim()
  const canSubmit = trimmed.length > 0 && !props.isSubmitting && !props.disabled

  const submit = () => {
    if (!canSubmit) return
    props.onSubmit(trimmed)
  }

  return (
    <div className='relative flex flex-1 flex-col items-center justify-center px-4'>
      <div className='w-full max-w-3xl'>
        <div className='mb-8'>{props.title}</div>

        <InputGroup className='border-border/80 bg-background/85 supports-backdrop-filter:bg-background/75 rounded-2xl shadow-2xl/5 backdrop-blur-md'>
          <InputGroupTextarea
            className='max-h-50 min-h-16 px-4 pt-4 text-sm'
            placeholder={props.placeholder}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                submit()
              }
            }}
          />
          <InputGroupAddon
            align='block-end'
            className='w-full min-w-0 justify-between gap-x-2 px-2.5 pb-2 md:gap-x-8'
          >
            <div className='thin-scrollbar min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 md:overflow-visible md:pb-0'>
              <div className='flex w-max min-w-full items-center gap-1'>
                {props.controls}
              </div>
            </div>
            <Button
              size='icon'
              className={cn('size-8 shrink-0 rounded-full')}
              disabled={!canSubmit}
              aria-label={t('Send')}
              onClick={submit}
            >
              <ArrowUp className='size-4' />
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
          {props.chips.map((chip) => (
            <Button
              key={chip}
              variant='outline'
              size='sm'
              className='text-muted-foreground rounded-full text-xs'
              onClick={() => setPrompt(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>

        {props.children}
      </div>
    </div>
  )
}
