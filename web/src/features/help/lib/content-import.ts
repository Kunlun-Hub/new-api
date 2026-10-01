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
import type { AdminContentPayload, SiteContentKind } from './content-api'
import {
  blogPosts,
  helpDocs,
  helpFaqs,
  tutorialCategories,
  tutorialLessons,
} from './content'

/** Stable short hash so imported FAQ entries keep their identity across runs. */
function stableFaqSlug(question: string): string {
  let hash = 5381
  for (let i = 0; i < question.length; i++) {
    hash = ((hash << 5) + hash + question.charCodeAt(i)) | 0
  }
  return `faq-${(hash >>> 0).toString(16)}`
}

/**
 * Built-in content shaped as import payloads.
 *
 * The bundled content ships with every deployment; importing it into the
 * database moves publishing into the backend without retyping anything.
 */
export function buildBuiltinContentPayloads(
  kind: SiteContentKind
): AdminContentPayload[] {
  if (kind === 'doc') {
    return helpDocs.map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      data: doc,
    }))
  }
  if (kind === 'blog') {
    return blogPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      category: post.category,
      data: post,
    }))
  }
  if (kind === 'faq') {
    return helpFaqs.map((faq) => ({
      slug: stableFaqSlug(faq.question),
      title: faq.question,
      description: faq.answer.slice(0, 160),
      data: faq,
    }))
  }
  if (kind === 'tutorial') {
    return tutorialLessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      category: lesson.category,
      sort_order: lesson.lesson,
      data: lesson,
    }))
  }
  return tutorialCategories.map((category) => ({
    slug: category.key,
    title: category.title,
    description: category.description,
    sort_order: category.count,
    data: category,
  }))
}
