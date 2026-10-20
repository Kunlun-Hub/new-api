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
export interface FooterColumnLink {
  text: string
  href: string
}

export interface FooterColumn {
  title: string
  links: FooterColumnLink[]
}

/**
 * Parse the admin-configured footer columns JSON.
 * Returns null when the value is empty or does not match the expected shape,
 * so the caller can fall back to the built-in columns.
 */
export function parseFooterColumns(value?: string): FooterColumn[] | null {
  if (!value || !value.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const columns: FooterColumn[] = []
  for (const column of parsed) {
    if (!column || typeof column !== 'object') return null
    const { title, links } = column as { title?: unknown; links?: unknown }
    if (typeof title !== 'string' || !title.trim() || !Array.isArray(links)) {
      return null
    }
    const parsedLinks: FooterColumnLink[] = []
    for (const link of links) {
      if (!link || typeof link !== 'object') return null
      const { text, href } = link as { text?: unknown; href?: unknown }
      if (typeof text !== 'string' || !text.trim()) return null
      if (typeof href !== 'string' || !href.trim()) return null
      parsedLinks.push({ text, href })
    }
    columns.push({ title, links: parsedLinks })
  }
  return columns
}
