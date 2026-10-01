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
import { BookOpen, CalendarDays, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'

import {
  useHelpCenterEnabled,
  useHelpDoc,
  useHelpDocs,
} from '../hooks/use-content'
import { ArticleContent } from './article-content'
import { DocCard } from './help-center'
import { HelpBreadcrumbs, HelpContainer } from './help-container'

export function DocIndexPage() {
  const { t } = useTranslation()
  const docs = useHelpDocs()
  const helpCenterEnabled = useHelpCenterEnabled()

  return (
    <HelpContainer>
      <HelpBreadcrumbs
        items={[
          ...(helpCenterEnabled
            ? [{ label: t('Help Center'), to: '/help' }]
            : []),
          { label: t('Docs') },
        ]}
      />
      <header className='mb-8'>
        <div className='flex items-center gap-2.5'>
          <BookOpen className='size-6' aria-hidden='true' />
          <h1 className='text-2xl font-bold tracking-tight'>{t('Docs')}</h1>
        </div>
        <p className='text-muted-foreground mt-2'>
          {t(
            'Usage guides, configuration and troubleshooting, browse by category.'
          )}
        </p>
      </header>
      <div className='space-y-8'>
        <div>
          <div className='mb-4 flex items-center gap-2.5'>
            <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'>
              <FileText className='size-5' aria-hidden='true' />
            </div>
            <div className='min-w-0'>
              <h2 className='font-semibold'>{t('Beginner guide')}</h2>
              <p className='text-muted-foreground line-clamp-1 text-sm'>
                {t('Read the beginner docs and avoid common pitfalls')}
              </p>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            {docs.map((doc) => (
              <DocCard key={doc.slug} doc={doc} />
            ))}
          </div>
        </div>
      </div>
    </HelpContainer>
  )
}

export function DocArticlePage(props: { slug: string }) {
  const { t } = useTranslation()
  const doc = useHelpDoc(props.slug)
  const helpCenterEnabled = useHelpCenterEnabled()

  if (!doc) {
    return (
      <HelpContainer>
        <EmptyState
          bordered
          icon={FileText}
          title={t('No Data')}
          description={t('Document not found')}
        />
      </HelpContainer>
    )
  }

  return (
    <HelpContainer>
      <div className='flex justify-center'>
        <article className='w-full max-w-3xl min-w-0'>
          <HelpBreadcrumbs
            items={[
              ...(helpCenterEnabled
                ? [{ label: t('Help Center'), to: '/help' }]
                : []),
              { label: t('Beginner guide'), to: '/doc' },
            ]}
          />
          <header className='border-border/50 space-y-3 border-b pb-6'>
            <h1 className='text-2xl leading-tight font-bold md:text-3xl'>
              {doc.title}
            </h1>
            <div className='text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
              <span className='inline-flex items-center gap-1'>
                <CalendarDays className='size-3.5' aria-hidden='true' />
                {t('Updated {{time}}', { time: doc.time })}
              </span>
            </div>
          </header>
          <div className='mt-8'>
            <ArticleContent html={doc.html} />
          </div>
        </article>
      </div>
    </HelpContainer>
  )
}
