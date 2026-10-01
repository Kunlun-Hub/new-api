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
import { Menu } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import type { TopNavLink } from '../types'
import { TopNavMenu } from './top-nav-menu'

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: TopNavLink[]
}

/**
 * 顶部导航栏组件
 * 在大屏幕显示水平导航，在小屏幕显示下拉菜单
 */
export function TopNav({ className, links }: TopNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // 规范化链接，确保所有可选属性都有默认值；
  // 未显式指定 isActive 时，根据当前路由自动判定激活态
  const normalizedLinks = useMemo(
    () =>
      links.map((link) => {
        const normalized = {
          isActive: false,
          disabled: false,
          external: false,
          ...link,
        }
        if (!link.external && !link.isActive) {
          normalized.isActive =
            pathname === link.href ||
            (link.href !== '/' && pathname.startsWith(`${link.href}/`))
        }
        return normalized
      }),
    [links, pathname]
  )

  return (
    <>
      {/* 移动端下拉菜单 */}
      <div className='lg:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={<Button size='icon' variant='outline' className='size-7' />}
          >
            <Menu />
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {normalizedLinks.flatMap(
              ({ title, href, isActive, disabled, external, items }) => {
                const linkClassName = isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'

                if (items?.length) {
                  return [
                    <DropdownMenuLabel
                      key={`group-${title}`}
                      className='text-muted-foreground text-xs font-normal'
                    >
                      {title}
                    </DropdownMenuLabel>,
                    ...items.map((item) => (
                      <DropdownMenuItem
                        key={`${item.title}-${item.href}`}
                        render={
                          <Link to={item.href} className={linkClassName}>
                            <span className='flex items-center gap-2'>
                              <span
                                className={cn(
                                  'flex size-5 shrink-0 items-center justify-center rounded-md bg-linear-to-br text-white',
                                  item.gradient
                                )}
                              >
                                {item.icon ? (
                                  <item.icon className='size-3' />
                                ) : null}
                              </span>
                              {item.title}
                            </span>
                          </Link>
                        }
                      />
                    )),
                  ]
                }

                return [
                  <DropdownMenuItem
                    key={`${title}-${href}`}
                    render={
                      external ? (
                        <a
                          href={href}
                          target='_blank'
                          rel='noopener noreferrer'
                          className={linkClassName}
                        >
                          {title}
                        </a>
                      ) : (
                        <Link
                          to={href}
                          className={linkClassName}
                          disabled={disabled}
                        >
                          {title}
                        </Link>
                      )
                    }
                  />,
                ]
              }
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 桌面端水平导航 */}
      <TopNavMenu
        className={cn('hidden lg:flex', className)}
        links={normalizedLinks}
        isLinkActive={(link) => Boolean(link.isActive)}
      />
    </>
  )
}
