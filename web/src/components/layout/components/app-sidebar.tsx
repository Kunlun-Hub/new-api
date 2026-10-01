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
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProfileDropdown } from '@/components/profile-dropdown'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useLayout } from '@/context/layout-provider'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { MOTION_TRANSITION, MOTION_VARIANTS } from '@/lib/motion'

import { NavGroup } from './nav-group'
import { SidebarViewHeader } from './sidebar-view-header'

/**
 * Application sidebar.
 *
 * Adopts the Vercel / Cloudflare "drill-in" pattern: the URL drives
 * which sidebar *view* is rendered. Clicking a top-level entry like
 * `System Settings` swaps the sidebar to a contextual workspace —
 * with a `← Back to Dashboard` affordance — instead of stacking the
 * sub-navigation inside the root tree.
 *
 * Architecture:
 *   - View resolution + filtering: {@link useSidebarView}
 *   - View registry: `layout/lib/sidebar-view-registry.ts`
 *   - Per-view header: {@link SidebarViewHeader}
 *
 * Adding a new nested view only requires registering a {@link SidebarView}
 * in the registry; this component requires no changes.
 */
export function AppSidebar() {
  const { t } = useTranslation()
  const { collapsible, variant } = useLayout()
  const { key, view, navGroups } = useSidebarView()
  const shouldReduce = useReducedMotion()
  const isWalletVisible = useIsSidebarModuleVisible('/wallet')

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      {view && <SidebarViewHeader view={view} />}

      <SidebarContent className='py-2'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={key}
            initial={
              shouldReduce ? false : MOTION_VARIANTS.sidebarSlide.initial
            }
            animate={MOTION_VARIANTS.sidebarSlide.animate}
            exit={shouldReduce ? undefined : MOTION_VARIANTS.sidebarSlide.exit}
            transition={MOTION_TRANSITION.fast}
            className='flex flex-col'
          >
            {navGroups.map((props) => (
              <NavGroup key={props.id || props.title} {...props} />
            ))}
          </motion.div>
        </AnimatePresence>
      </SidebarContent>

      {!view && (
        <SidebarFooter className='group-data-[collapsible=icon]:hidden gap-2'>
          {isWalletVisible && (
            <SidebarMenu>
              <SidebarMenuItem>
                <a
                  href='/wallet'
                  className='border-border/60 bg-card/50 hover:bg-muted flex items-center gap-3 rounded-xl border p-3 transition-colors'
                >
                  <span className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg'>
                    <Wallet className='size-4' />
                  </span>
                  <span className='flex min-w-0 flex-col gap-0.5'>
                    <span className='text-foreground truncate text-sm font-semibold'>
                      {t('Top Up')}
                    </span>
                    <span className='text-muted-foreground truncate text-xs'>
                      {t('Self-service recharge, fast and secure!')}
                    </span>
                  </span>
                </a>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <ProfileDropdown variant='card' />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  )
}
