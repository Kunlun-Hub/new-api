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
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

import type { TopNavChildLink, TopNavLink } from '../types'

const plainLinkClassName =
  'text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 min-w-0 items-center truncate rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200'

export type TopNavMenuProps = {
  links: TopNavLink[]
  className?: string
  isLinkActive?: (link: TopNavLink) => boolean
  onLinkClick?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    link: TopNavChildLink
  ) => void
}

/**
 * Horizontal top navigation with hover dropdowns.
 *
 * Shared by the public header and the console header so both render the same
 * menu structure (plain link vs. dropdown with icon tiles).
 */
export function TopNavMenu({
  links,
  className,
  isLinkActive,
  onLinkClick,
}: TopNavMenuProps) {
  const { t } = useTranslation()

  return (
    <NavigationMenu className={cn('max-w-max', className)}>
      <NavigationMenuList className='gap-2'>
        {links.map((link) => {
          const key = `${link.title}:${link.href}`
          if (link.items?.length) {
            return (
              <NavigationMenuItem key={key}>
                <NavigationMenuTrigger
                  className={cn(
                    'text-muted-foreground hover:text-foreground data-popup-open:bg-muted h-8 gap-0 rounded-full bg-transparent px-3 py-1.5 text-sm font-medium',
                    link.disabled && 'pointer-events-none opacity-50'
                  )}
                >
                  {t(link.title)}
                </NavigationMenuTrigger>
                <NavigationMenuContent className='p-1'>
                  <ul className='w-72'>
                    {link.items.map((item) => (
                      <li key={`${item.title}:${item.href}`}>
                        <NavigationMenuLink
                          className={cn(
                            'group/card hover:bg-muted/30 relative block overflow-hidden rounded-lg p-2',
                            item.disabled && 'pointer-events-none opacity-50'
                          )}
                          render={
                            <Link
                              to={item.href}
                              onClick={(event) => onLinkClick?.(event, item)}
                            />
                          }
                        >
                          <div className='flex items-center gap-x-2'>
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm transition-all duration-500 group-hover/card:scale-[2] group-hover/card:opacity-30 group-hover/card:blur-md',
                                item.gradient
                              )}
                            >
                              {item.icon ? (
                                <item.icon className='size-5 transition-opacity duration-300 group-hover/card:opacity-0' />
                              ) : null}
                            </div>
                            <div className='relative min-w-0 flex-1 space-y-0.5 p-1.5 transition-transform duration-500 group-hover/card:-translate-x-9'>
                              <div className='flex items-center gap-0.5 font-medium'>
                                {t(item.title)}
                                <ChevronRight className='size-3.5 -translate-x-1 opacity-0 transition-all duration-500 group-hover/card:translate-x-0 group-hover/card:opacity-60' />
                              </div>
                              {item.description ? (
                                <p className='text-muted-foreground line-clamp-2 text-xs'>
                                  {t(item.description)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )
          }

          const active = isLinkActive?.(link) ?? false
          if (link.external) {
            return (
              <NavigationMenuItem key={key}>
                <a
                  href={link.href}
                  title={t(link.title)}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-disabled={link.disabled}
                  tabIndex={link.disabled ? -1 : undefined}
                  onClick={(event) => onLinkClick?.(event, link)}
                  className={cn(
                    plainLinkClassName,
                    link.disabled && 'pointer-events-none opacity-50'
                  )}
                >
                  {t(link.title)}
                </a>
              </NavigationMenuItem>
            )
          }

          return (
            <NavigationMenuItem key={key}>
              <Link
                to={link.href}
                title={t(link.title)}
                disabled={link.disabled}
                onClick={(event) => onLinkClick?.(event, link)}
                className={cn(
                  plainLinkClassName,
                  active && 'bg-muted text-foreground',
                  link.disabled && 'pointer-events-none opacity-50'
                )}
              >
                {t(link.title)}
              </Link>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
