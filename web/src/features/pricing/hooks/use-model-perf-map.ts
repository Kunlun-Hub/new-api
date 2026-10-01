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

import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import type { ModelPerfBadgeData } from '../components/model-perf-badge'

/**
 * 24-hour success-rate summaries keyed by model name, shared by the model
 * square card grid and table so both render the same availability column.
 */
export function useModelPerfMap(): Map<string, ModelPerfBadgeData> {
  const query = useQuery({
    queryKey: ['perf-metrics-summary', 24],
    queryFn: async () => requireServerSuccess(await getPerfMetricsSummary(24)),
    staleTime: 60 * 1000,
    retry: false,
  })

  return useMemo(() => {
    const map = new Map<string, ModelPerfBadgeData>()
    for (const model of query.data?.data?.models ?? []) {
      map.set(model.model_name, {
        ...model,
        window_start: query.data?.data.window_start,
        window_end: query.data?.data.window_end,
      })
    }
    return map
  }, [query.data])
}
