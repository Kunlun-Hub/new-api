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
import { api, type ApiRequestConfig } from '@/lib/api'

import { buildQueryParams } from './lib/query-params'
import { parseTaskArtifactsResponse } from './lib/task-artifacts'
import type {
  GetLogsParams,
  GetLogsResponse,
  GetLogStatsParams,
  GetLogStatsResponse,
  GetMidjourneyLogsParams,
  GetTaskLogsParams,
  TaskArtifactsResponse,
  UserInfo,
} from './types'

// ============================================================================
// Generic API Helpers
// ============================================================================

function buildApiPath(endpoint: string, isAdmin: boolean): string {
  return isAdmin ? endpoint : `${endpoint}/self`
}

async function fetchLogs<T>(
  endpoint: string,
  params: T,
  isAdmin: boolean
): Promise<GetLogsResponse> {
  const paramRecord = params as unknown as Record<string, unknown>
  const queryParams = buildQueryParams({
    p: paramRecord.p || 1,
    page_size: paramRecord.page_size || 20,
    ...params,
  })
  const path = buildApiPath(endpoint, isAdmin)
  const res = await api.get(`${path}?${queryParams}`)
  return res.data
}

async function fetchLogStats<T>(
  endpoint: string,
  params: T,
  isAdmin: boolean
): Promise<GetLogStatsResponse> {
  const queryParams = buildQueryParams(
    params as unknown as Record<string, unknown>
  )
  const path = buildApiPath(endpoint, isAdmin)
  const res = await api.get(`${path}/stat?${queryParams}`)
  return res.data
}

// ============================================================================
// Common Log APIs
// ============================================================================

export const getAllLogs = (params: GetLogsParams = {}) =>
  fetchLogs('/api/log', params, true)

export const getUserLogs = (
  params: Omit<GetLogsParams, 'username' | 'channel'> = {}
) => fetchLogs('/api/log', params, false)

export const getLogStats = (params: GetLogStatsParams = {}) =>
  fetchLogStats('/api/log', params, true)

export const getUserLogStats = (
  params: Omit<GetLogStatsParams, 'username' | 'channel'> = {}
) => fetchLogStats('/api/log', params, false)

export type LogsExportResult =
  | { ok: true; filename: string; csv: string }
  | { ok: false; code?: string; message?: string }

function filenameFromDisposition(disposition: string | undefined) {
  const match = /filename="?([^";]+)"?/.exec(disposition ?? '')
  return match?.[1] ?? `logs-${Date.now()}.csv`
}

/**
 * Downloads the filtered logs as a CSV file. The backend answers with JSON when
 * the filter set matches no record, so the payload is inspected by type.
 */
export async function exportLogs(
  params: GetLogsParams,
  isAdmin: boolean
): Promise<LogsExportResult> {
  const queryParams = buildQueryParams(
    params as unknown as Record<string, unknown>
  )
  const path = buildApiPath('/api/log', isAdmin)
  const res = await api.get<Blob>(`${path}/export?${queryParams}`, {
    responseType: 'blob',
    skipBusinessError: true,
    skipErrorHandler: true,
  })
  const contentType = String(res.headers?.['content-type'] ?? '')
  if (contentType.includes('application/json')) {
    const text = await (res.data as Blob).text()
    try {
      return { ok: false, ...(JSON.parse(text) as Record<string, unknown>) }
    } catch {
      return { ok: false }
    }
  }
  return {
    ok: true,
    filename: filenameFromDisposition(
      res.headers?.['content-disposition'] as string | undefined
    ),
    csv: await (res.data as Blob).text(),
  }
}

export async function getUserInfo(
  userId: number
): Promise<{ success: boolean; message?: string; data?: UserInfo }> {
  const res = await api.get(`/api/user/${userId}`)
  return res.data
}

// ============================================================================
// MjProxy (Drawing) Logs API
// ============================================================================

export const getAllMidjourneyLogs = (params: GetMidjourneyLogsParams) =>
  fetchLogs('/api/mj', params, true)

export const getUserMidjourneyLogs = (params: GetMidjourneyLogsParams) =>
  fetchLogs('/api/mj', params, false)

// ============================================================================
// Task Logs API
// ============================================================================

export const getAllTaskLogs = (params: GetTaskLogsParams) =>
  fetchLogs('/api/task', params, true)

export const getUserTaskLogs = (params: GetTaskLogsParams) =>
  fetchLogs('/api/task', params, false)

const taskArtifactRequestConfig = {
  skipBusinessError: true,
  skipErrorHandler: true,
} satisfies ApiRequestConfig

export async function getTaskArtifacts(
  taskId: string,
  options?: { includeData?: boolean }
) {
  const query = options?.includeData ? '?include_data=1' : ''
  const response = await api.get<TaskArtifactsResponse>(
    `/api/task/${encodeURIComponent(taskId)}/artifacts${query}`,
    taskArtifactRequestConfig
  )
  return parseTaskArtifactsResponse(response.data)
}
