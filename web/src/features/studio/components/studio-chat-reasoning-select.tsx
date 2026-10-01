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
import { Brain, Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Effort levels offered per model family: the upstream studio filters the list
 * by model name so providers never receive an unsupported effort value.
 */
const ALL_BUT_NONE = ['', 'low', 'medium', 'high', 'xhigh', 'max'] as const
const ALL_WITH_NONE = [
  '',
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const
const NO_XHIGH_NONE = ['', 'none', 'low', 'medium', 'high', 'xhigh'] as const
const PRO_ONLY = ['', 'medium', 'high', 'xhigh'] as const
const NO_XHIGH_MAX = ['', 'none', 'low', 'medium', 'high', 'max'] as const
const BASIC = ['', 'low', 'medium', 'high'] as const
const WITH_MINIMAL = ['', 'minimal', 'low', 'medium', 'high'] as const
const LOW_HIGH = ['', 'low', 'high'] as const
const DEFAULT_EFFORTS = ['', 'none', 'low', 'medium', 'high'] as const

const FAMILY_EFFORTS: { prefixes: string[]; efforts: readonly string[] }[] = [
  { prefixes: ['gpt-6'], efforts: ALL_BUT_NONE },
  { prefixes: ['gpt-5.6'], efforts: ALL_WITH_NONE },
  { prefixes: ['gpt-5.5-pro'], efforts: PRO_ONLY },
  { prefixes: ['gpt-5.5'], efforts: NO_XHIGH_NONE },
  {
    prefixes: ['claude-opus-5-5', 'claude-fable-5', 'claude-mythos-5'],
    efforts: ALL_BUT_NONE,
  },
  {
    prefixes: [
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-opus-4-7',
      'claude-opus-4-8',
    ],
    efforts: ALL_WITH_NONE,
  },
  {
    prefixes: ['claude-opus-4-6', 'claude-sonnet-4-6'],
    efforts: NO_XHIGH_MAX,
  },
  { prefixes: ['gemini-3-pro'], efforts: LOW_HIGH },
  { prefixes: ['gemini-3.8', 'gemini-3.7', 'gemini-3.1-pro'], efforts: BASIC },
  {
    prefixes: [
      'gemini-3.6',
      'gemini-3.5',
      'gemini-3.1-flash-lite',
      'gemini-3-flash',
    ],
    efforts: WITH_MINIMAL,
  },
  { prefixes: ['gemini-3', 'gemini-2.5-pro'], efforts: BASIC },
]

function getReasoningEfforts(model: string): readonly string[] {
  const name = model.toLowerCase()
  for (const family of FAMILY_EFFORTS) {
    if (family.prefixes.some((prefix) => name.startsWith(prefix))) {
      return family.efforts
    }
  }
  return DEFAULT_EFFORTS
}

const REASONING_LABELS: Record<string, string> = {
  '': 'Default',
  none: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Maximum',
}

type StudioChatReasoningSelectProps = {
  model: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

/** Reasoning effort picker shown when the selected model reasons. */
export function StudioChatReasoningSelect(
  props: StudioChatReasoningSelectProps
) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const efforts = getReasoningEfforts(props.model)
  const current = efforts.includes(props.value) ? props.value : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            className='text-muted-foreground h-8 shrink-0 gap-1 px-2.5 font-medium'
            disabled={props.disabled}
            role='combobox'
            size='sm'
            title={t('Reasoning effort')}
            variant='ghost'
          />
        }
      >
        <Brain className='size-3.5' />
        {t(REASONING_LABELS[current])}
        <ChevronsUpDown className='text-muted-foreground size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-32 gap-1 p-1'
        collisionPadding={8}
        sideOffset={4}
      >
        {efforts.map((effort) => (
          <button
            className='hover:bg-muted flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none'
            key={effort || 'default'}
            onClick={() => {
              props.onChange(effort)
              setOpen(false)
            }}
            type='button'
          >
            <Check
              className={cn(
                'size-4',
                current === effort ? 'opacity-100' : 'opacity-0'
              )}
            />
            {t(REASONING_LABELS[effort])}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
