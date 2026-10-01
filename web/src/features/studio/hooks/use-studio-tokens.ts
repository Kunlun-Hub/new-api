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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getApiKeys } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'

/** Enabled API keys of the current user, used by the studio key pickers. */
export function useStudioTokens() {
  const query = useQuery({
    queryKey: ['studio-tokens'],
    queryFn: async () => {
      const res = await getApiKeys({ p: 1, size: 100 })
      return res.data?.items ?? []
    },
    staleTime: 60 * 1000,
    retry: false,
  })

  const tokens = useMemo<ApiKey[]>(
    () => (query.data ?? []).filter((token) => token.status === 1),
    [query.data]
  )

  return {
    tokens,
    isLoading: query.isPending,
    refresh: () => query.refetch(),
  }
}
