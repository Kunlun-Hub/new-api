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
import { Clapperboard, Compass, ImagePlay, MessageCircle } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { TopNavLink } from '@/components/layout/types'
import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Generate top navigation links based on HeaderNavModules configuration from backend /api/status
 * Backend format example (stringified JSON):
 * {
 *   home: true,
 *   console: true,
 *   pricing: { enabled: true, requireAuth: false },
 *   rankings: { enabled: true, requireAuth: false },
 *   monitoring: { enabled: true, requireAuth: false },
 *   docs: true,
 *   about: true
 * }
 */
export function useTopNavLinks(): TopNavLink[] {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { auth } = useAuthStore()

  // Parse HeaderNavModules
  const modules = useMemo(() => {
    return parseHeaderNavModulesFromStatus(
      status as Record<string, unknown> | null
    )
  }, [status])

  // Documentation link (may be external)
  const docsLink: string | undefined = status?.docs_link as string | undefined

  const isAuthed = !!auth?.user

  const links: TopNavLink[] = []

  // Home
  if (modules?.home !== false) {
    links.push({ title: t('Home'), href: '/' })
  }

  // Console -> /dashboard (new console path)
  if (modules?.console !== false) {
    links.push({ title: t('Console'), href: '/dashboard' })
  }

  // Pricing
  const pricing = modules?.pricing
  if (pricing && typeof pricing === 'object' && pricing.enabled) {
    const requiresAuth = pricing.requireAuth && !isAuthed
    links.push({ title: t('Model Square'), href: '/pricing', requiresAuth })
  }

  // Studio - creation hub with hover dropdown (discover / chat / image / video)
  if (modules?.studio !== false) {
    links.push({
      title: t('Studio'),
      href: '/studio',
      items: [
        {
          title: t('Discover'),
          href: '/studio',
          description: t('Explore images and videos shared by the community'),
          icon: Compass,
          gradient: 'from-emerald-400 to-cyan-300',
        },
        {
          title: t('studio.menu.chat'),
          href: '/studio/chat',
          description: t('More than chat — your personal think tank'),
          icon: MessageCircle,
          gradient: 'from-sky-400 to-cyan-300',
          requiresAuth: !isAuthed,
        },
        {
          title: t('Image Generation'),
          href: '/studio/image',
          description: t('Infinite imagination lives between the pixels'),
          icon: ImagePlay,
          gradient: 'from-violet-400 to-fuchsia-300',
          requiresAuth: !isAuthed,
        },
        {
          title: t('Video Generation'),
          href: '/studio/video',
          description: t('Every frame with intent — you are the director'),
          icon: Clapperboard,
          gradient: 'from-amber-400 to-orange-300',
          requiresAuth: !isAuthed,
        },
      ],
    })
  }

  // Blog
  if (modules?.blog !== false) {
    links.push({ title: t('Blog'), href: '/blog' })
  }

  // Help center (tutorials, docs and FAQs)
  if (modules?.help !== false) {
    links.push({ title: t('Help Center'), href: '/help' })
  }

  // Model monitoring (public by default, mirrors the /monitoring page)
  const monitoring = modules?.monitoring
  if (monitoring && typeof monitoring === 'object' && monitoring.enabled) {
    const requiresAuth = monitoring.requireAuth && !isAuthed
    links.push({
      title: t('Model Monitoring'),
      href: '/monitoring',
      requiresAuth,
    })
  }

  // Rankings
  const rankings = modules?.rankings
  if (rankings && typeof rankings === 'object' && rankings.enabled) {
    const requiresAuth = rankings.requireAuth && !isAuthed
    links.push({ title: t('Rankings'), href: '/rankings', requiresAuth })
  }

  // Docs (supports external links)
  if (modules?.docs !== false) {
    if (docsLink) {
      links.push({ title: t('Docs'), href: docsLink, external: true })
    } else {
      links.push({ title: t('Docs'), href: '/doc' })
    }
  }

  // About
  if (modules?.about !== false) {
    links.push({ title: t('About'), href: '/about' })
  }

  return links
}
