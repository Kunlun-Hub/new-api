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
import { useInfiniteQuery } from '@tanstack/react-query'

import { requireServerSuccess } from '@/lib/server-error-message'

import { getMyStudioShares, getStudioShares } from './api'
import type { StudioShareKind, StudioSharePage } from './types'

export type StudioShareScope = 'mine' | 'discover'

/** The discover gallery merges both media types unless a tab narrows it. */
export type StudioShareKindFilter = StudioShareKind | 'all'

/**
 * Cursor paginated gallery feed. The discover scope additionally shows the
 * caller's own pending submissions so they can review them.
 */
export function useStudioShareFeed(
  scope: StudioShareScope,
  kind: StudioShareKindFilter,
  signedIn: boolean
) {
  const includePending = scope === 'discover' && signedIn
  const mediaKind = kind === 'all' ? undefined : kind

  return useInfiniteQuery({
    queryKey: ['studio-shares', scope, kind, includePending],
    queryFn: async ({ pageParam }) =>
      scope === 'mine' && mediaKind
        ? requireServerSuccess(await getMyStudioShares(mediaKind, pageParam))
            .data
        : requireServerSuccess(
            await getStudioShares(mediaKind, pageParam, includePending)
          ).data,
    initialPageParam: '',
    getNextPageParam: (lastPage: StudioSharePage) =>
      lastPage.next_cursor || undefined,
    staleTime: 30 * 1000,
    retry: false,
  })
}
