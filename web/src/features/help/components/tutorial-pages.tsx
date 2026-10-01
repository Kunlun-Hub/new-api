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
import { CirclePlay, GraduationCap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'

import {
  useTutorialCategories,
  useTutorialCategory,
  useTutorialLessonsOf,
} from '../hooks/use-content'
import { TutorialCategoryCard } from './help-center'
import { HelpBreadcrumbs, HelpContainer } from './help-container'
import { HelpCardLink } from './help-section-header'

export function TutorialsIndex() {
  const { t } = useTranslation()
  const tutorialCategories = useTutorialCategories()

  return (
    <HelpContainer>
      <HelpBreadcrumbs
        items={[
          { label: t('Help Center'), to: '/help' },
          { label: t('Tutorials') },
        ]}
      />
      <header className='mb-8'>
        <div className='flex items-center gap-2.5'>
          <GraduationCap className='size-6' aria-hidden='true' />
          <h1 className='text-2xl font-bold tracking-tight'>
            {t('Tutorials')}
          </h1>
        </div>
        <p className='text-muted-foreground mt-2'>
          {t('Step by step, master the platform lesson by lesson')}
        </p>
      </header>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {tutorialCategories.map((category) => (
          <TutorialCategoryCard key={category.key} category={category} />
        ))}
      </div>
    </HelpContainer>
  )
}

export function TutorialCategoryPage(props: { category: string }) {
  const { t } = useTranslation()
  const category = useTutorialCategory(props.category)
  const lessons = useTutorialLessonsOf(props.category)

  if (!category) {
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

  return (
    <HelpContainer>
      <HelpBreadcrumbs
        items={[
          { label: t('Help Center'), to: '/help' },
          { label: t('Tutorials'), to: '/tutorials' },
          { label: t(category.title) },
        ]}
      />
      <header className='mb-8'>
        <h1 className='text-2xl font-bold tracking-tight'>
          {t(category.title)}
        </h1>
        <p className='text-muted-foreground mt-2'>{t(category.description)}</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          {t('{{count}} lessons', { count: lessons.length })}
        </p>
      </header>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {lessons.map((lesson) => (
          <HelpCardLink
            key={lesson.slug}
            to='/tutorials/$category/$slug'
            params={{ category: lesson.category, slug: lesson.slug }}
            className='flex-col p-5'
          >
            <div className='mb-2 flex items-center gap-2.5'>
              <span className='bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors'>
                {lesson.lesson}
              </span>
              <h3 className='group-hover:text-primary line-clamp-1 min-w-0 flex-1 font-semibold'>
                {lesson.title}
              </h3>
              <CirclePlay
                className='text-muted-foreground/50 group-hover:text-primary size-5 shrink-0'
                aria-hidden='true'
              />
            </div>
            <p className='text-muted-foreground line-clamp-2 text-sm'>
              {lesson.description}
            </p>
          </HelpCardLink>
        ))}
      </div>
    </HelpContainer>
  )
}
