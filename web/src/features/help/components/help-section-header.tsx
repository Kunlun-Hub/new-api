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
import { Link } from '@tanstack/react-router'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function HelpSectionHeader(props: {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className='mb-4 flex items-end justify-between gap-4'>
      <div className='flex items-start gap-3'>
        <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
          <props.icon className='size-5' aria-hidden='true' />
        </div>
        <div>
          <h2 className='text-xl font-bold'>{props.title}</h2>
          <p className='text-muted-foreground text-sm'>{props.description}</p>
        </div>
      </div>
      {props.actionLabel && props.actionTo && (
        <Link
          to={props.actionTo}
          className='text-primary inline-flex shrink-0 items-center gap-1 text-sm hover:underline'
        >
          {props.actionLabel}
          <ArrowRight className='size-3.5' aria-hidden='true' />
        </Link>
      )}
    </div>
  )
}

export function HelpCardLink(props: {
  to: string
  params?: Record<string, string>
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={props.to}
      params={props.params}
      className={cn(
        'group border-border/50 hover:border-primary/40 hover:shadow-sm flex gap-3 rounded-xl border p-4 transition-all',
        props.className
      )}
    >
      {props.children}
    </Link>
  )
}
