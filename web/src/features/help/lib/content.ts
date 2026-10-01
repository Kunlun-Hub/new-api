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
import blogData from '../content/blog.json'
import docsData from '../content/docs.json'
import faqsData from '../content/faqs.json'
import tutorialsData from '../content/tutorials.json'

export type TutorialCategoryKey = 'coding' | 'app' | 'openclaw'

export interface TocItem {
  text: string
  level: number
}

export interface TutorialCategory {
  key: TutorialCategoryKey
  count: number
  title: string
  description: string
  icon: 'terminal' | 'app-window' | 'sparkles'
}

export interface TutorialLesson {
  category: TutorialCategoryKey
  slug: string
  lesson: number
  title: string
  description: string
  time: string
  toc: TocItem[]
  html: string
}

export interface HelpDoc {
  slug: string
  title: string
  description: string
  time: string
  toc: TocItem[]
  html: string
}

export interface BlogPost {
  slug: string
  category: string
  title: string
  description: string
  time: string
  cover: string
  toc: TocItem[]
  html: string
}

export interface HelpFaq {
  question: string
  answer: string
}

export const tutorialCategories = tutorialsData.categories as TutorialCategory[]
export const tutorialLessons = tutorialsData.lessons as TutorialLesson[]
export const helpDocs = docsData as HelpDoc[]
export const blogPosts = blogData as BlogPost[]
export const helpFaqs = faqsData as HelpFaq[]

/** Reference site category names, mapped to their URL slugs and i18n keys. */
export const BLOG_CATEGORIES = [
  {
    name: 'AI资讯',
    slug: 'ai-news',
    label: 'AI News',
    description: 'AI行业最新资讯信息',
  },
  {
    name: 'AI项目',
    slug: 'ai-project',
    label: 'AI Projects',
    description: '推荐好用的AI应用、工具、开源项目',
  },
  {
    name: 'AI指南',
    slug: 'ai-guide',
    label: 'AI Guides',
    description: 'AI最佳实践指南教程',
  },
  {
    name: 'AI短剧',
    slug: 'ai-drama',
    label: 'AI Short Drama',
    description: '推荐最好看的AI漫剧、短剧',
  },
] as const

export interface HelpSearchResult {
  lessons: TutorialLesson[]
  docs: HelpDoc[]
  faqs: HelpFaq[]
}

const EMPTY_SEARCH_RESULT: HelpSearchResult = {
  lessons: [],
  docs: [],
  faqs: [],
}

/** Match tutorials, docs and FAQs against a free-text query. */
export function searchHelpContent(query: string): HelpSearchResult {
  const needle = query.trim().toLowerCase()
  if (!needle) return EMPTY_SEARCH_RESULT
  const matches = (value: string) => value.toLowerCase().includes(needle)
  return {
    lessons: tutorialLessons.filter(
      (lesson) =>
        matches(lesson.title) ||
        matches(lesson.description) ||
        matches(lesson.slug)
    ),
    docs: helpDocs.filter(
      (doc) =>
        matches(doc.title) || matches(doc.description) || matches(doc.slug)
    ),
    faqs: helpFaqs.filter(
      (faq) => matches(faq.question) || matches(faq.answer)
    ),
  }
}

export function getTutorialCategory(key: string) {
  return tutorialCategories.find((category) => category.key === key)
}

export function getTutorialLessons(category: string) {
  return tutorialLessons
    .filter((lesson) => lesson.category === category)
    .sort((a, b) => a.lesson - b.lesson)
}

export function getTutorialLesson(category: string, slug: string) {
  const lessons = getTutorialLessons(category)
  const index = lessons.findIndex((lesson) => lesson.slug === slug)
  if (index < 0) return null
  return {
    lesson: lessons[index],
    previous: lessons[index - 1],
    next: lessons[index + 1],
  }
}

export function getHelpDoc(slug: string) {
  return helpDocs.find((doc) => doc.slug === slug) ?? null
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null
}

export function getBlogPostsByCategory(slug: string) {
  const category = BLOG_CATEGORIES.find((item) => item.slug === slug)
  if (!category) return null
  return blogPosts.filter((post) => post.category === category.name)
}

export function blogCategoryLabel(name: string) {
  return BLOG_CATEGORIES.find((item) => item.name === name)?.label ?? name
}

export function blogCategorySlug(name: string) {
  return BLOG_CATEGORIES.find((item) => item.name === name)?.slug
}

/** Blog covers ship at several resize widths; the detail hero wants a large one. */
export function blogCoverUrl(cover: string, width: number) {
  return cover.replace(/resize,w_\d+/, `resize,w_${width}`)
}
