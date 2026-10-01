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
import {
  AppWindow,
  BookOpen,
  CirclePlay,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  SquareTerminal,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Markdown } from '@/components/ui/markdown'

import type {
  HelpDoc,
  HelpFaq,
  HelpSearchResult,
  TutorialCategory,
} from '../lib/content'
import {
  useHelpDocs,
  useHelpFaqs,
  useHelpSearch,
  useTutorialCategories,
} from '../hooks/use-content'
import { useContentText } from '../lib/content-vars'
import { HelpContainer } from './help-container'
import { HelpHero } from './help-hero'
import { HelpCardLink, HelpSectionHeader } from './help-section-header'

const CATEGORY_ICONS = {
  terminal: SquareTerminal,
  'app-window': AppWindow,
  sparkles: Sparkles,
} as const

export function HelpCenter() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const results = useHelpSearch(query)
  const docs = useHelpDocs()
  const faqs = useHelpFaqs()
  const tutorialCategories = useTutorialCategories()

  return (
    <HelpContainer>
      <HelpHero query={query} onQueryChange={setQuery} />

      {searching ? (
        <SearchResults query={query} results={results} />
      ) : (
        <div className='mt-12 space-y-14'>
          <section>
            <HelpSectionHeader
              icon={GraduationCap}
              title={t('Tutorials')}
              description={t(
                'Step by step, master the platform lesson by lesson'
              )}
              actionLabel={t('View all')}
              actionTo='/tutorials'
            />
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {tutorialCategories.map((category) => (
                <TutorialCategoryCard key={category.key} category={category} />
              ))}
            </div>
          </section>

          <section>
            <HelpSectionHeader
              icon={BookOpen}
              title={t('Docs')}
              description={t('Usage guides, configuration and troubleshooting')}
              actionLabel={t('View all')}
              actionTo='/doc'
            />
            <div className='space-y-8'>
              <div>
                <div className='mb-3 flex items-center gap-2.5'>
                  <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'>
                    <FileText className='size-5' aria-hidden='true' />
                  </div>
                  <div className='min-w-0'>
                    <h3 className='font-semibold'>{t('Beginner guide')}</h3>
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
          </section>

          <section>
            <HelpSectionHeader
              icon={Search}
              title={t('FAQs')}
              description={t('Frequently asked questions')}
            />
            <FaqList faqs={faqs} />
          </section>
        </div>
      )}
    </HelpContainer>
  )
}

export function TutorialCategoryCard(props: { category: TutorialCategory }) {
  const { t } = useTranslation()
  const Icon = CATEGORY_ICONS[props.category.icon]

  return (
    <HelpCardLink
      to='/tutorials/$category'
      params={{ category: props.category.key }}
      className='flex-col p-5'
    >
      <div className='mb-2 flex items-center gap-2.5'>
        <div className='bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors'>
          <Icon className='size-4' aria-hidden='true' />
        </div>
        <h3 className='group-hover:text-primary line-clamp-1 font-semibold'>
          {t(props.category.title)}
        </h3>
      </div>
      <p className='text-muted-foreground text-sm'>
        {t(props.category.description)}
      </p>
      <p className='text-muted-foreground mt-3 text-xs'>
        {t('{{count}} lessons', { count: props.category.count })}
      </p>
    </HelpCardLink>
  )
}

export function DocCard(props: { doc: HelpDoc }) {
  const contentText = useContentText()

  return (
    <HelpCardLink
      to='/doc/$slug'
      params={{ slug: props.doc.slug }}
      className='p-4'
    >
      <FileText
        className='text-muted-foreground/60 group-hover:text-primary mt-0.5 size-5 shrink-0'
        aria-hidden='true'
      />
      <div className='min-w-0'>
        <h3 className='group-hover:text-primary line-clamp-1 font-medium'>
          {contentText(props.doc.title)}
        </h3>
        <p className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
          {contentText(props.doc.description)}
        </p>
      </div>
    </HelpCardLink>
  )
}

function FaqList(props: { faqs: HelpFaq[] }) {
  return (
    <div className='divide-border/50 border-border/50 divide-y rounded-xl border'>
      {props.faqs.map((faq) => (
        <details key={faq.question} className='group px-4 py-3'>
          <summary className='flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium'>
            {faq.question}
            <CirclePlay
              className='text-muted-foreground/50 size-4 shrink-0 transition-transform group-open:rotate-90'
              aria-hidden='true'
            />
          </summary>
          <div className='text-muted-foreground mt-3 text-sm'>
            <Markdown className='text-sm'>{faq.answer}</Markdown>
          </div>
        </details>
      ))}
    </div>
  )
}

function SearchResults(props: { query: string; results: HelpSearchResult }) {
  const { t } = useTranslation()
  const contentText = useContentText()
  const tutorialCategories = useTutorialCategories()
  const total =
    props.results.lessons.length +
    props.results.docs.length +
    props.results.faqs.length

  if (total === 0) {
    return (
      <div className='mt-12'>
        <EmptyState
          bordered
          icon={Search}
          title={t('No results found')}
          description={t('Try a different keyword')}
        />
      </div>
    )
  }

  return (
    <div className='mt-12 space-y-10'>
      {props.results.lessons.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-bold'>{t('Tutorials')}</h2>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {props.results.lessons.map((lesson) => {
              const category = tutorialCategories.find(
                (item) => item.key === lesson.category
              )
              return (
                <HelpCardLink
                  key={lesson.slug}
                  to='/tutorials/$category/$slug'
                  params={{ category: lesson.category, slug: lesson.slug }}
                  className='flex-col p-5'
                >
                  <div className='mb-2 flex items-center gap-2.5'>
                    <span className='bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
                      {lesson.lesson}
                    </span>
                    <h3 className='group-hover:text-primary line-clamp-1 min-w-0 flex-1 font-semibold'>
                      {contentText(lesson.title)}
                    </h3>
                  </div>
                  <p className='text-muted-foreground line-clamp-2 text-sm'>
                    {contentText(lesson.description)}
                  </p>
                  {category && (
                    <p className='text-muted-foreground mt-3 text-xs'>
                      {t(category.title)}
                    </p>
                  )}
                </HelpCardLink>
              )
            })}
          </div>
        </section>
      )}

      {props.results.docs.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-bold'>{t('Docs')}</h2>
          <div className='grid gap-3 sm:grid-cols-2'>
            {props.results.docs.map((doc) => (
              <DocCard key={doc.slug} doc={doc} />
            ))}
          </div>
        </section>
      )}

      {props.results.faqs.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-bold'>{t('FAQs')}</h2>
          <FaqList faqs={props.results.faqs} />
        </section>
      )}
    </div>
  )
}
