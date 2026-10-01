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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { TocItem } from '../lib/content'
import {
  HelpBreadcrumbs,
  type HelpBreadcrumb,
  HelpContainer,
} from './help-container'

export function ArticleLayout(props: {
  breadcrumbs: HelpBreadcrumb[]
  toc: TocItem[]
  sidebar?: ReactNode
  children: ReactNode
}) {
  return (
    <HelpContainer>
      <HelpBreadcrumbs items={props.breadcrumbs} />
      <div className='flex items-start gap-10'>
        {props.sidebar && (
          <aside className='thin-scrollbar sticky top-28 mt-5 hidden max-h-[calc(100dvh-10rem)] w-52 shrink-0 overflow-y-auto lg:block'>
            {props.sidebar}
          </aside>
        )}
        <article className='min-w-0 flex-1'>{props.children}</article>
        {props.toc.length > 0 && <TableOfContents items={props.toc} />}
      </div>
    </HelpContainer>
  )
}

function TableOfContents(props: { items: TocItem[] }) {
  const { t } = useTranslation()

  return (
    <aside className='thin-scrollbar sticky top-28 hidden max-h-[calc(100dvh-10rem)] w-48 shrink-0 overflow-y-auto xl:block'>
      <nav className='space-y-2 text-sm'>
        <div className='mb-3 font-semibold'>{t('On this page')}</div>
        <ul className='space-y-1'>
          {props.items.map((item) => (
            <li key={`${item.level}-${item.text}`}>
              <a
                href={`#${item.text}`}
                title={item.text}
                className={cn(
                  'text-muted-foreground hover:text-foreground block truncate border-l-2 border-transparent py-1 transition-colors',
                  item.level > 2 ? 'pl-6' : 'pl-3'
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
