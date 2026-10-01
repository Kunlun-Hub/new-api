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
import { ChevronDown } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type StudioToolbarSelectOption = {
  value: string
  label: string
}

type StudioToolbarSelectProps = {
  label: string
  value: string
  options: StudioToolbarSelectOption[]
  onValueChange: (value: string) => void
  className?: string
}

/** Compact ghost picker used inside the studio composer toolbar. */
export function StudioToolbarSelect(props: StudioToolbarSelectProps) {
  const isSingleOption = props.options.length <= 1

  return (
    <Select
      items={props.options}
      value={props.value}
      onValueChange={(value) => {
        if (value !== null) props.onValueChange(value)
      }}
    >
      <SelectTrigger
        aria-label={props.label}
        disabled={isSingleOption}
        className={cn(
          'border-transparent bg-clip-padding h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-muted-foreground shadow-none hover:bg-muted hover:text-foreground data-[disabled]:opacity-100 dark:hover:bg-muted/50 [&_svg]:size-3.5',
          props.className
        )}
      >
        <SelectValue>
          <span className='truncate'>{props.label}</span>
        </SelectValue>
        {!isSingleOption && (
          <ChevronDown className='size-3.5 shrink-0 opacity-60' />
        )}
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align='start'>
        {props.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
