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
import { createContext, useContext, useEffect } from 'react'

import { removeCookie } from '@/lib/cookies'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
export type Variant = 'inset' | 'sidebar' | 'floating'

type LayoutConfig = {
  collapsible: Collapsible
  variant: Variant
}

// The console ships a single shell layout: the sidebar collapses to an icon rail.
const LAYOUT: LayoutConfig = {
  collapsible: 'icon',
  variant: 'sidebar',
}

// Cookies were written by the retired theme-config drawer. A leftover
// `offcanvas` value would otherwise keep the sidebar fully hidden when
// collapsed, and `floating` would change the shell padding.
const LEGACY_LAYOUT_COOKIES = ['layout_collapsible', 'layout_variant']

const LayoutContext = createContext<LayoutConfig | null>(null)

type LayoutProviderProps = {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  useEffect(() => {
    for (const name of LEGACY_LAYOUT_COOKIES) {
      removeCookie(name)
    }
  }, [])

  return <LayoutContext value={LAYOUT}>{children}</LayoutContext>
}

// Define the hook for the provider
// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
