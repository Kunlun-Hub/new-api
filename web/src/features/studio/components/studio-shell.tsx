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
import type { ReactNode } from 'react'

import { PublicLayout } from '@/components/layout/components/public-layout'

import { StudioNav } from './studio-nav'

/**
 * Full-height app shell for the studio pages.
 *
 * Mirrors the reference layout: the studio tab bar replaces the site links in
 * the header and the page body owns its own scroll container.
 */
export function StudioShell(props: { children: ReactNode }) {
  return (
    <PublicLayout
      showMainContainer={false}
      navContent={<StudioNav />}
      className='flex h-dvh flex-col'
    >
      <main className='relative flex min-h-0 flex-1 flex-col'>
        {props.children}
      </main>
    </PublicLayout>
  )
}
