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
import type { ReactNode, RefObject } from 'react'

import { cn } from '@/lib/utils'

type StudioGalleryLayoutProps = {
  scrollRef: RefObject<HTMLDivElement | null>
  header: ReactNode
  children: ReactNode
  /** Floating composer pinned above the gallery scroll area. */
  bottomContent?: ReactNode
  overlay?: ReactNode
}

/**
 * Gallery shell of the studio screens: sticky header, scrollable masonry and a
 * floating composer pinned to the bottom edge.
 */
export function StudioGalleryLayout(props: StudioGalleryLayoutProps) {
  const hasBottom = props.bottomContent != null

  return (
    <div className='relative min-h-0 flex-1'>
      <div
        ref={props.scrollRef}
        className={cn(
          'thin-scrollbar h-full overflow-y-auto px-4 md:px-6',
          hasBottom ? 'pb-48' : 'pb-20'
        )}
      >
        <div className='from-background via-background/85 sticky top-0 z-20 flex justify-center bg-linear-to-b to-transparent px-4 py-8'>
          {props.header}
        </div>
        {props.children}
      </div>
      <div className='from-background via-background/70 pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t to-transparent px-4 pt-10 pb-4 md:pb-6'>
        {hasBottom && (
          <div className='pointer-events-auto mx-auto max-w-3xl'>
            {props.bottomContent}
          </div>
        )}
      </div>
      {props.overlay}
    </div>
  )
}
