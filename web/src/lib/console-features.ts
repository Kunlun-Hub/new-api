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
import type { QueryClient } from '@tanstack/react-query'

import { useStatus } from '@/hooks/use-status'
import { readCachedStatus, statusQueryOptions } from '@/lib/status-query'

/** Console features an administrator can switch off in system settings. */
export interface ConsoleFeatures {
  orders: boolean
  invoices: boolean
  tickets: boolean
}

function readFlag(status: Record<string, unknown> | null, key: string): boolean {
  const value = status?.[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    return value === 'true' || value === '1'
  }
  return true
}

export function parseConsoleFeatures(status: unknown): ConsoleFeatures {
  const record = (status ?? null) as Record<string, unknown> | null
  return {
    orders: readFlag(record, 'orders_enabled'),
    invoices: readFlag(record, 'invoices_enabled'),
    tickets: readFlag(record, 'tickets_enabled'),
  }
}

export function getConsoleFeatures(): ConsoleFeatures {
  return parseConsoleFeatures(readCachedStatus())
}

export function useConsoleFeatures(): ConsoleFeatures {
  const { status } = useStatus()
  return parseConsoleFeatures(status)
}

/** Resolve one console feature for a router `beforeLoad` guard. */
export async function getConsoleFeatureForGuard(
  queryClient: QueryClient,
  feature: keyof ConsoleFeatures
): Promise<boolean> {
  try {
    const status = await queryClient.fetchQuery(statusQueryOptions)
    return parseConsoleFeatures(status)[feature]
  } catch {
    return false
  }
}
