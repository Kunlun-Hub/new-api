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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

import {
  blogPosts as staticBlogPosts,
  helpDocs as staticHelpDocs,
  helpFaqs as staticHelpFaqs,
  tutorialCategories as staticTutorialCategories,
  tutorialLessons as staticTutorialLessons,
  type BlogPost,
  type HelpDoc,
  type HelpFaq,
  type HelpSearchResult,
  type TocItem,
  type TutorialCategory,
  type TutorialLesson,
} from '../lib/content'
import {
  fetchSiteContent,
  type SiteContentKind,
  type SiteContentRecord,
} from '../lib/content-api'

const CONTENT_STALE_TIME = 5 * 60 * 1000

type ContentModule = 'docs' | 'blog' | 'help'

function contentModuleOf(kind: SiteContentKind): ContentModule {
  if (kind === 'doc') return 'docs'
  if (kind === 'blog') return 'blog'
  return 'help'
}

/**
 * Read one published content collection.
 *
 * Content publishing is optional: while the backend has no published items the
 * bundled content keeps the site complete, and only an explicit module switch
 * turns a collection off.
 */
function usePublishedContent<T>(
  kind: SiteContentKind
): SiteContentRecord<T>[] | undefined {
  const { status } = useStatus()
  const enabled =
    parseHeaderNavModulesFromStatus(status as Record<string, unknown> | null)[
      contentModuleOf(kind)
    ] !== false

  const query = useQuery({
    queryKey: ['site-content', kind],
    queryFn: () => fetchSiteContent<T>(kind),
    enabled,
    staleTime: CONTENT_STALE_TIME,
  })

  if (!enabled) return []
  return query.data
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function pickToc(value: unknown): TocItem[] {
  return Array.isArray(value) ? (value as TocItem[]) : []
}

/**
 * Whether the optional help-center module is enabled. The docs pages are
 * gated by their own `docs` switch, so they must not link back to a help
 * center that the site owner has turned off.
 */
export function useHelpCenterEnabled(): boolean {
  const { status } = useStatus()

  return (
    parseHeaderNavModulesFromStatus(status as Record<string, unknown> | null)
      .help !== false
  )
}

export function useHelpDocs(): HelpDoc[] {
  const items = usePublishedContent<Partial<HelpDoc>>('doc')
  return useMemo(() => {
    if (!items || items.length === 0) return staticHelpDocs
    return items.map((item) => ({
      slug: item.slug,
      title: pickString(item.title, item.data?.title ?? item.slug),
      description: pickString(item.description, item.data?.description ?? ''),
      time: pickString(item.data?.time, ''),
      toc: pickToc(item.data?.toc),
      html: pickString(item.data?.html, ''),
    }))
  }, [items])
}

export function useBlogPosts(): BlogPost[] {
  const items = usePublishedContent<Partial<BlogPost>>('blog')
  return useMemo(() => {
    if (!items || items.length === 0) return staticBlogPosts
    return items.map((item) => ({
      slug: item.slug,
      category: pickString(item.category, item.data?.category ?? ''),
      title: pickString(item.title, item.data?.title ?? item.slug),
      description: pickString(item.description, item.data?.description ?? ''),
      time: pickString(item.data?.time, ''),
      cover: pickString(item.data?.cover, ''),
      toc: pickToc(item.data?.toc),
      html: pickString(item.data?.html, ''),
    }))
  }, [items])
}

export function useHelpFaqs(): HelpFaq[] {
  const items = usePublishedContent<Partial<HelpFaq>>('faq')
  return useMemo(() => {
    if (!items || items.length === 0) return staticHelpFaqs
    return items.map((item) => ({
      question: pickString(item.data?.question, item.title),
      answer: pickString(item.data?.answer, item.description),
    }))
  }, [items])
}

export function useTutorialCategories(): TutorialCategory[] {
  const items =
    usePublishedContent<Partial<TutorialCategory>>('tutorial_category')
  return useMemo(() => {
    if (!items || items.length === 0) return staticTutorialCategories
    return items.map((item) => ({
      key: item.slug as TutorialCategory['key'],
      count: typeof item.data?.count === 'number' ? item.data.count : 0,
      title: pickString(item.title, item.data?.title ?? item.slug),
      description: pickString(item.description, item.data?.description ?? ''),
      icon: item.data?.icon ?? 'terminal',
    }))
  }, [items])
}

export function useTutorialLessons(): TutorialLesson[] {
  const items = usePublishedContent<Partial<TutorialLesson>>('tutorial')
  return useMemo(() => {
    if (!items || items.length === 0) return staticTutorialLessons
    return items.map((item) => ({
      category: pickString(
        item.category,
        item.data?.category ?? ''
      ) as TutorialLesson['category'],
      slug: item.slug,
      lesson: typeof item.data?.lesson === 'number' ? item.data.lesson : 0,
      title: pickString(item.title, item.data?.title ?? item.slug),
      description: pickString(item.description, item.data?.description ?? ''),
      time: pickString(item.data?.time, ''),
      toc: pickToc(item.data?.toc),
      html: pickString(item.data?.html, ''),
    }))
  }, [items])
}

export function useBlogPost(slug: string): BlogPost | undefined {
  const posts = useBlogPosts()
  return useMemo(() => posts.find((post) => post.slug === slug), [posts, slug])
}

export function useBlogPostsByCategory(category: string): BlogPost[] {
  const posts = useBlogPosts()
  return useMemo(
    () => posts.filter((post) => post.category === category),
    [posts, category]
  )
}

export function useHelpDoc(slug: string): HelpDoc | undefined {
  const docs = useHelpDocs()
  return useMemo(() => docs.find((doc) => doc.slug === slug), [docs, slug])
}

export function useTutorialCategory(key: string): TutorialCategory | undefined {
  const categories = useTutorialCategories()
  return useMemo(
    () => categories.find((category) => category.key === key),
    [categories, key]
  )
}

export function useTutorialLessonsOf(category: string): TutorialLesson[] {
  const lessons = useTutorialLessons()
  return useMemo(
    () =>
      lessons
        .filter((lesson) => lesson.category === category)
        .sort((a, b) => a.lesson - b.lesson),
    [lessons, category]
  )
}

export function useTutorialLessonNav(
  category: string,
  slug: string
): {
  lesson: TutorialLesson
  previous?: TutorialLesson
  next?: TutorialLesson
} | null {
  const lessons = useTutorialLessonsOf(category)
  return useMemo(() => {
    const index = lessons.findIndex((lesson) => lesson.slug === slug)
    if (index < 0) return null
    return {
      lesson: lessons[index],
      previous: lessons[index - 1],
      next: lessons[index + 1],
    }
  }, [lessons, slug])
}

/** Search across the published tutorials, docs and FAQs. */
export function useHelpSearch(query: string): HelpSearchResult {
  const lessons = useTutorialLessons()
  const docs = useHelpDocs()
  const faqs = useHelpFaqs()

  return useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (keyword === '') {
      return { lessons: [], docs: [], faqs: [] }
    }
    const matches = (value: string) => value.toLowerCase().includes(keyword)
    return {
      lessons: lessons.filter(
        (lesson) => matches(lesson.title) || matches(lesson.description)
      ),
      docs: docs.filter(
        (doc) => matches(doc.title) || matches(doc.description)
      ),
      faqs: faqs.filter((faq) => matches(faq.question) || matches(faq.answer)),
    }
  }, [query, lessons, docs, faqs])
}
