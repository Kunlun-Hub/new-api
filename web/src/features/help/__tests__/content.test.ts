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
import { describe, expect, it } from 'vitest'

import {
  blogCategoryLabel,
  blogCategorySlug,
  blogCoverUrl,
  getBlogPostsByCategory,
  getTutorialLesson,
  getTutorialLessons,
  searchHelpContent,
} from '../lib/content'
import { applyContentVars, prepareContentHtml } from '../lib/content-vars'

const VARS = { apiBase: 'https://api.example.com', siteName: 'Example API' }

describe('applyContentVars', () => {
  it('resolves site, API and console placeholders in stored content', () => {
    const html =
      '<a href="{{apiBase}}/v1/chat">{{siteName}}</a><a href="{{siteUrl}}/panel/token">token</a>'

    expect(applyContentVars(html, VARS)).toBe(
      '<a href="https://api.example.com/v1/chat">Example API</a><a href="/keys">token</a>'
    )
  })
})

describe('prepareContentHtml', () => {
  it('adds anchor ids to headings and strips the image referrer', () => {
    const html = prepareContentHtml(
      '<h2><a href="#usage">Usage</a></h2><p><img src="https://cdn.example.com/a.png" alt=""></p>'
    )

    expect(html).toContain('<h2 id="Usage">')
    expect(html).toContain('referrerpolicy="no-referrer"')
  })

  it('keeps an existing heading id', () => {
    const html = prepareContentHtml('<h2 id="custom">Usage</h2>')

    expect(html).toBe('<h2 id="custom">Usage</h2>')
  })
})

describe('tutorial lessons', () => {
  it('exposes lessons ordered by lesson number', () => {
    const lessons = getTutorialLessons('coding')

    expect(lessons.length).toBeGreaterThan(0)
    expect(lessons.map((lesson) => lesson.lesson)).toEqual(
      [...lessons].map((lesson) => lesson.lesson).sort((a, b) => a - b)
    )
  })

  it('returns the neighbouring lessons for navigation', () => {
    const [first, second] = getTutorialLessons('coding')
    const result = getTutorialLesson('coding', second.slug)

    expect(result?.lesson.slug).toBe(second.slug)
    expect(result?.previous?.slug).toBe(first.slug)
    expect(result?.next?.lesson).toBe(second.lesson + 1)
  })

  it('returns null for an unknown lesson', () => {
    expect(getTutorialLesson('coding', 'missing-lesson')).toBeNull()
  })
})

describe('blog helpers', () => {
  it('filters posts by category slug', () => {
    const posts = getBlogPostsByCategory('ai-guide')

    expect(posts?.length).toBeGreaterThan(0)
    expect(posts?.every((post) => post.category === 'AI指南')).toBe(true)
  })

  it('returns null for an unknown category', () => {
    expect(getBlogPostsByCategory('missing')).toBeNull()
  })

  it('maps reference category names to labels and slugs', () => {
    expect(blogCategoryLabel('AI资讯')).toBe('AI News')
    expect(blogCategorySlug('AI资讯')).toBe('ai-news')
  })

  it('requests a cover at the requested resize width', () => {
    const cover =
      'https://cdn.example.com/a.png?x-oss-process=image/resize,w_768/format,webp'

    expect(blogCoverUrl(cover, 160)).toContain('resize,w_160')
  })
})

describe('searchHelpContent', () => {
  it('returns nothing for a blank query', () => {
    expect(searchHelpContent('   ')).toEqual({
      lessons: [],
      docs: [],
      faqs: [],
    })
  })

  it('matches tutorials by title', () => {
    const result = searchHelpContent('Cline')

    expect(result.lessons.map((lesson) => lesson.slug)).toContain(
      'cline-api-binding-tutorial'
    )
  })

  it('matches FAQs by answer text', () => {
    const result = searchHelpContent('Fail to fetch')

    expect(result.faqs.length).toBeGreaterThan(0)
  })
})
