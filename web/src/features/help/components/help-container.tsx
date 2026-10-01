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
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { cn } from '@/lib/utils'

export interface HelpBreadcrumb {
  label: string
  to?: string
  params?: Record<string, string>
}

export function HelpContainer(props: {
  children: ReactNode
  narrow?: boolean
  className?: string
}) {
  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition>
        <div
          className={cn(
            'mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10',
            props.narrow && 'max-w-3xl',
            props.className
          )}
        >
          {props.children}
        </div>
      </PageTransition>
    </PublicLayout>
  )
}

export function HelpBreadcrumbs(props: { items: HelpBreadcrumb[] }) {
  return (
    <nav aria-label='breadcrumb' className='mb-6'>
      <ol className='text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm'>
        {props.items.map((item, index) => (
          <li
            key={`${item.label}-${item.to ?? 'current'}`}
            className='inline-flex items-center gap-1.5'
          >
            {index > 0 && (
              <ChevronRight className='size-3.5' aria-hidden='true' />
            )}
            {item.to ? (
              <Link
                to={item.to}
                params={item.params}
                className='hover:text-foreground inline-flex items-center gap-1.5 transition-colors'
              >
                {index === 0 && (
                  <ArrowLeft className='size-3.5' aria-hidden='true' />
                )}
                {item.label}
              </Link>
            ) : (
              <span className='text-foreground'>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
