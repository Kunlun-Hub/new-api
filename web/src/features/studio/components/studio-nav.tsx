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
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Clapperboard,
  Compass,
  ImagePlay,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type StudioTab = {
  titleKey: string
  href: string
  icon: LucideIcon
}

const STUDIO_TABS: StudioTab[] = [
  { titleKey: 'studio.tab.discover', href: '/studio', icon: Compass },
  { titleKey: 'studio.tab.chat', href: '/studio/chat', icon: MessageCircle },
  { titleKey: 'studio.tab.image', href: '/studio/image', icon: ImagePlay },
  { titleKey: 'studio.tab.video', href: '/studio/video', icon: Clapperboard },
]

/** Studio tab bar shown centered inside the public header. */
export function StudioNav() {
  const { t } = useTranslation()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <nav className='sm:bg-background hidden items-center gap-0.5 rounded-full p-0 sm:gap-1 sm:p-1 md:flex'>
      {STUDIO_TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors sm:px-4',
              isActive
                ? 'text-foreground font-medium sm:bg-secondary'
                : 'hover:bg-secondary'
            )}
          >
            <tab.icon className='hidden size-4 sm:block' />
            {t(tab.titleKey)}
          </Link>
        )
      })}
    </nav>
  )
}
