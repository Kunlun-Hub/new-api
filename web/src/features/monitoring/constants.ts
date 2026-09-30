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
export const MONITORING_WINDOW_HOURS = [1, 6, 24] as const

export type MonitoringSort = 'default' | 'availability' | 'ttft' | 'requests'

export const MONITORING_SORT_OPTIONS: readonly {
  value: MonitoringSort
  labelKey: string
}[] = [
  { value: 'default', labelKey: 'Default order' },
  { value: 'availability', labelKey: 'By availability' },
  { value: 'ttft', labelKey: 'By TTFT' },
  { value: 'requests', labelKey: 'By requests' },
]

/** Models listed per group before the "show all" toggle appears. */
export const MONITORING_MODEL_PREVIEW_LIMIT = 6
