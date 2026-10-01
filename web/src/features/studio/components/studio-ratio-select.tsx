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
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Pixel size of a ratio such as `9:16`, `1.5`, or `1280:768`. */
function dimsOf(ratio: string): { width: number; height: number } {
  const value = ratio || '16:9'
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    if (numeric === 1) return { width: 1024, height: 1024 }
    if (numeric > 1) {
      return { width: 1280, height: Math.max(1, Math.round(1280 / numeric)) }
    }
    return { width: Math.max(1, Math.round(1280 * numeric)), height: 1280 }
  }
  const pair = value.match(/^(\d+)[*x](\d+)$/)
  if (pair) return { width: Number(pair[1]), height: Number(pair[2]) }
  const colon = value.match(/^(\d+):(\d+)$/)
  if (colon) {
    return { width: 80 * Number(colon[1]), height: 80 * Number(colon[2]) }
  }
  return { width: 1280, height: 720 }
}

/** Preview box scaled so its longest edge matches `max`, never below 10px. */
function boxOf(ratio: string, max: number) {
  const { width, height } = dimsOf(ratio)
  const scale = max / Math.max(width, height)
  return {
    width: Math.max(10, Math.round(width * scale)),
    height: Math.max(10, Math.round(height * scale)),
  }
}

type StudioRatioSelectProps = {
  options: string[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

/** Aspect ratio picker chip shared by the studio image and video composers. */
export function StudioRatioSelect(props: StudioRatioSelectProps) {
  const [open, setOpen] = useState(false)
  const chipBox = boxOf(props.value, 14)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  aria-expanded={open}
                  className='text-muted-foreground h-8 cursor-pointer gap-1.5 px-2.5 font-normal'
                  disabled={props.disabled}
                  size='sm'
                  variant='ghost'
                />
              }
            />
          }
        >
          <span
            aria-hidden='true'
            className='inline-block rounded-[3px] border-[1.5px] border-current'
            style={chipBox}
          />
          {props.value}
        </TooltipTrigger>
        <TooltipContent>
          <p>{props.value}</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align='start'
        className='w-auto max-w-[90vw] p-2'
        collisionPadding={8}
        sideOffset={4}
      >
        <div
          className='grid gap-1.5'
          style={{
            gridTemplateColumns: `repeat(${Math.min(props.options.length, 5)}, minmax(0, 1fr))`,
          }}
        >
          {props.options.map((ratio) => {
            const box = boxOf(ratio, 18)
            const selected = props.value === ratio
            return (
              <button
                className={cn(
                  'flex h-16 min-w-14 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition-colors',
                  selected
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/50'
                )}
                key={ratio}
                onClick={() => {
                  props.onChange(ratio)
                  setOpen(false)
                }}
                type='button'
              >
                <span
                  aria-hidden='true'
                  className='rounded-[3px] border-[1.5px] border-current'
                  style={box}
                />
                {ratio}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
