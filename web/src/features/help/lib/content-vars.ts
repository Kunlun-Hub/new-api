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
import { useCallback, useMemo } from 'react'

import { useStatus } from '@/hooks/use-status'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'

export interface ContentVars {
  apiBase: string
  siteName: string
}

/**
 * Help content is authored against the upstream deployment, so absolute links
 * and product names are stored as placeholders and resolved on render.
 */
export function applyContentVars(html: string, vars: ContentVars): string {
  return html
    .replaceAll('{{siteUrl}}/panel/token', '/keys')
    .replaceAll('{{siteUrl}}/panel', '/dashboard')
    .replaceAll('{{apiBase}}', vars.apiBase)
    .replaceAll('{{siteUrl}}', vars.apiBase)
    .replaceAll('{{siteName}}', vars.siteName)
}

/**
 * Heading anchors exist in the source content; give the targets matching ids.
 * Article images are hosted on a CDN that rejects foreign referrers, so strip
 * the referrer on every image.
 */
export function prepareContentHtml(html: string): string {
  if (typeof document === 'undefined') return html
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const text = heading.textContent?.trim()
    if (text && !heading.id) heading.id = text
  })
  template.content.querySelectorAll('img').forEach((image) => {
    image.setAttribute('referrerpolicy', 'no-referrer')
  })
  return template.innerHTML
}

export function useContentVars(): ContentVars {
  const { status } = useStatus()
  return useMemo(() => {
    const serverAddress =
      typeof status?.server_address === 'string'
        ? status.server_address.trim().replace(/\/+$/, '')
        : ''
    return {
      siteName:
        (typeof status?.system_name === 'string' &&
          status.system_name.trim()) ||
        DEFAULT_SYSTEM_NAME,
      apiBase:
        serverAddress ||
        (typeof window === 'undefined' ? '' : window.location.origin),
    }
  }, [status])
}

/** Resolve placeholders inside stored text (titles, descriptions, answers). */
export function useContentText(): (text: string) => string {
  const vars = useContentVars()
  return useCallback((text: string) => applyContentVars(text, vars), [vars])
}
