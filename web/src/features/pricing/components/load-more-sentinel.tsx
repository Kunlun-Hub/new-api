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
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

/** Scroll sentinel that renders the model square "load more" affordance. */
export function LoadMoreSentinel(props: {
  sentinelRef: RefObject<HTMLDivElement | null>
  onLoadMore: () => void
}) {
  const { t } = useTranslation()

  return (
    <div
      ref={props.sentinelRef}
      role='button'
      tabIndex={0}
      aria-label={t('Load more...')}
      className='flex items-center justify-center py-8'
      onClick={props.onLoadMore}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          props.onLoadMore()
        }
      }}
    >
      <span className='text-muted-foreground text-sm'>{t('Load more...')}</span>
    </div>
  )
}
