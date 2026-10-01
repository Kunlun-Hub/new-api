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
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { IconBadge, type IconBadgeTone } from './icon-badge'

type ActionCardProps = {
  icon?: ReactNode
  iconTone?: IconBadgeTone
  iconClassName?: string
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Compact settings card: icon, title, description and an optional footer
 * action rendered at the bottom edge. Used by the account security surfaces.
 */
export function ActionCard(props: ActionCardProps) {
  return (
    <div
      className={cn(
        'border-border/40 flex flex-col gap-4 rounded-xl border bg-transparent p-5 transition-colors hover:border-border/60',
        props.className
      )}
    >
      <div className='flex items-start gap-3'>
        {props.icon != null && (
          <IconBadge
            size='lg'
            tone={props.iconTone}
            className={cn(
              'size-10 rounded-lg [&>svg]:size-5',
              props.iconTone == null && 'bg-foreground/5 text-foreground/70',
              props.iconClassName
            )}
          >
            {props.icon}
          </IconBadge>
        )}
        <div className='min-w-0'>
          <div className='text-sm font-medium'>{props.title}</div>
          {props.description != null && (
            <div className='text-muted-foreground mt-1 text-xs break-words'>
              {props.description}
            </div>
          )}
        </div>
      </div>
      {props.children != null && (
        <div className='space-y-3'>{props.children}</div>
      )}
      {props.footer != null && (
        <div className='mt-auto space-y-3'>{props.footer}</div>
      )}
    </div>
  )
}
