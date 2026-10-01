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
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GraduationCap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'

import {
  useTutorialCategory,
  useTutorialLessonNav,
  useTutorialLessonsOf,
} from '../hooks/use-content'
import { ArticleContent } from './article-content'
import { ArticleLayout } from './article-layout'
import { HelpContainer } from './help-container'

export function TutorialLessonPage(props: { category: string; slug: string }) {
  const { t } = useTranslation()
  const data = useTutorialLessonNav(props.category, props.slug)
  const category = useTutorialCategory(props.category)
  const lessons = useTutorialLessonsOf(props.category)

  if (!data || !category) {
    return (
      <HelpContainer>
        <EmptyState
          bordered
          icon={GraduationCap}
          title={t('No Data')}
          description={t('Tutorial not found')}
        />
      </HelpContainer>
    )
  }

  const { lesson, previous, next } = data

  return (
    <ArticleLayout
      breadcrumbs={[
        { label: t('Help Center'), to: '/help' },
        { label: t('Tutorials'), to: '/tutorials' },
        {
          label: t(category.title),
          to: '/tutorials/$category',
          params: { category: category.key },
        },
      ]}
      toc={lesson.toc}
      sidebar={
        <nav className='space-y-6 text-sm'>
          <div>
            <div className='mb-2 px-3 text-xs font-semibold tracking-wide uppercase'>
              {t(category.title)}
            </div>
            <ul className='space-y-2'>
              {lessons.map((item) => (
                <li key={item.slug}>
                  <Link
                    to='/tutorials/$category/$slug'
                    params={{ category: item.category, slug: item.slug }}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 transition-colors',
                      'hover:bg-muted hover:text-foreground',
                      item.slug === lesson.slug &&
                        'bg-muted text-primary font-medium'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                        item.slug === lesson.slug
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-primary'
                      )}
                    >
                      {item.lesson}
                    </span>
                    <span
                      className='min-w-0 flex-1 truncate'
                      title={item.title}
                    >
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      }
    >
      <header className='mb-8'>
        <div className='text-muted-foreground mb-3 flex items-center gap-4 text-sm'>
          <span>{t('Lesson {{number}}', { number: lesson.lesson })}</span>
          <span className='flex items-center gap-1.5'>
            <CalendarDays className='size-3.5' aria-hidden='true' />
            {lesson.time}
          </span>
        </div>
        <h1 className='text-3xl leading-tight font-bold md:text-4xl'>
          {lesson.title}
        </h1>
      </header>

      <ArticleContent html={lesson.html} />

      <nav className='border-border/50 mt-12 grid gap-4 border-t pt-6 sm:grid-cols-2'>
        {previous ? (
          <LessonNavCard lesson={previous} direction='previous' />
        ) : (
          <span className='hidden sm:block' />
        )}
        {next && <LessonNavCard lesson={next} direction='next' />}
      </nav>
    </ArticleLayout>
  )
}

function LessonNavCard(props: {
  lesson: { category: string; slug: string; title: string }
  direction: 'previous' | 'next'
}) {
  const { t } = useTranslation()
  const isNext = props.direction === 'next'

  return (
    <Link
      to='/tutorials/$category/$slug'
      params={{ category: props.lesson.category, slug: props.lesson.slug }}
      className={cn(
        'group border-border/60 hover:border-primary/40 flex flex-col gap-1 rounded-xl border p-4 transition-colors',
        isNext && 'items-end text-right sm:col-start-2'
      )}
    >
      <span className='text-muted-foreground flex items-center gap-1 text-xs'>
        {isNext ? (
          <>
            {t('Next lesson')}
            <ArrowRight className='size-3' aria-hidden='true' />
          </>
        ) : (
          <>
            <ArrowLeft className='size-3' aria-hidden='true' />
            {t('Previous lesson')}
          </>
        )}
      </span>
      <span className='group-hover:text-primary line-clamp-1 font-medium'>
        {props.lesson.title}
      </span>
    </Link>
  )
}
