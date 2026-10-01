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
import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { Separator } from '@/components/ui/separator'
import { SidebarTrigger, useOptionalSidebar } from '@/components/ui/sidebar'

import { Main } from './main'
import { PageFooterProvider } from './page-footer'

type SlotProps = { children?: ReactNode }

function SectionPageLayoutTitle(_props: SlotProps) {
  return null
}
SectionPageLayoutTitle.displayName = 'SectionPageLayout.Title'

function SectionPageLayoutActions(_props: SlotProps) {
  return null
}
SectionPageLayoutActions.displayName = 'SectionPageLayout.Actions'

function SectionPageLayoutContent(_props: SlotProps) {
  return null
}
SectionPageLayoutContent.displayName = 'SectionPageLayout.Content'

function SectionPageLayoutBreadcrumb(_props: SlotProps) {
  return null
}
SectionPageLayoutBreadcrumb.displayName = 'SectionPageLayout.Breadcrumb'

export type SectionPageLayoutProps = {
  children: ReactNode
  stackActionsOnMobile?: boolean
}

export function SectionPageLayout(props: SectionPageLayoutProps) {
  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(
    null
  )
  const sidebar = useOptionalSidebar()

  let title: ReactNode = null
  let actions: ReactNode = null
  let content: ReactNode = null
  let breadcrumb: ReactNode = null

  Children.forEach(props.children, (node) => {
    if (!isValidElement(node)) return
    const child = node as ReactElement<SlotProps>
    if (child.type === SectionPageLayoutTitle) title = child.props.children
    else if (child.type === SectionPageLayoutActions) {
      actions = child.props.children
    } else if (child.type === SectionPageLayoutContent) {
      content = child.props.children
    } else if (child.type === SectionPageLayoutBreadcrumb) {
      breadcrumb = child.props.children
    }
  })

  return (
    <PageFooterProvider container={footerContainer}>
      <Main>
        <header className='flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 lg:px-8'>
          {sidebar != null && (
            <>
              <SidebarTrigger
                variant='ghost'
                className='-ml-1 size-8 shrink-0'
              />
              <Separator
                orientation='vertical'
                className='mr-2 h-4 self-center bg-border/60'
              />
            </>
          )}
          <div className='min-w-0 flex-1'>{breadcrumb}</div>
        </header>

        <div className='flex flex-1 flex-col gap-5 p-4 lg:px-20 lg:py-8'>
          {(title != null || actions != null) && (
            <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-x-4'>
              <div
                className={
                  props.stackActionsOnMobile
                    ? 'min-w-0 flex-1 max-sm:basis-full'
                    : 'min-w-0 flex-1'
                }
              >
                {title != null && (
                  <h2 className='truncate text-2xl font-semibold tracking-tight'>
                    {title}
                  </h2>
                )}
              </div>
              {actions != null && (
                <div className='flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-x-4'>
                  {actions}
                </div>
              )}
            </div>
          )}
          {content}
        </div>

        <div
          ref={setFooterContainer}
          className='bg-background sticky bottom-0 z-20 shrink-0 border-t px-4 py-2.5 empty:hidden sm:py-3 lg:px-20'
        />
      </Main>
    </PageFooterProvider>
  )
}

SectionPageLayout.Title = SectionPageLayoutTitle
SectionPageLayout.Actions = SectionPageLayoutActions
SectionPageLayout.Content = SectionPageLayoutContent
SectionPageLayout.Breadcrumb = SectionPageLayoutBreadcrumb
