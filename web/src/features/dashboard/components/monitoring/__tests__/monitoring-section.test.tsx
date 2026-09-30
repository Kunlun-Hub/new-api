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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MonitoringSection } from '@/features/dashboard/components/monitoring/monitoring-section'
import type { MonitoringData } from '@/features/performance-metrics/types'

let client: QueryClient
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
})
afterEach(() => client.clear())

function seedMonitoring(hours: number, groups: MonitoringData['data']['groups']) {
  client.setQueryData(['perf-metrics-monitoring', hours], {
    success: true,
    data: { window_start: 1_789_387_200, window_end: 1_789_390_800, groups },
  })
}

function renderSection() {
  return render(
    <QueryClientProvider client={client}>
      <MonitoringSection />
    </QueryClientProvider>
  )
}

const groups: MonitoringData['data']['groups'] = [
  {
    group: 'vip_1',
    request_count: 120,
    success_rate: 99.17,
    avg_ttft_ms: 4820,
    avg_latency_ms: 17600,
    models: [
      {
        model_name: 'gpt-5-mini',
        request_count: 100,
        avg_ttft_ms: 4460,
        avg_latency_ms: 17600,
        success_rate: 100,
        avg_tps: 82.14,
        recent_success_series: [
          { ts: 1_789_387_200, success_rate: 100 },
          { ts: 1_789_390_800, success_rate: 98.5 },
        ],
      },
      {
        model_name: 'gpt-5-nano',
        request_count: 20,
        avg_ttft_ms: 5130,
        avg_latency_ms: 19050,
        success_rate: 95,
        avg_tps: 99.2,
        recent_success_series: [],
      },
    ],
  },
]

describe('MonitoringSection', () => {
  it('renders one card per group with per-model TTFT, latency, TPS and success', () => {
    seedMonitoring(1, groups)
    renderSection()

    expect(screen.getByText('vip_1')).toBeVisible()
    expect(screen.getByText('gpt-5-mini')).toBeVisible()
    expect(screen.getByText('gpt-5-nano')).toBeVisible()
    // TTFT values are formatted as seconds.
    expect(screen.getByText('4.46s')).toBeVisible()
    expect(screen.getByText('5.13s')).toBeVisible()
    // Latency values.
    expect(screen.getByText('17.60s')).toBeVisible()
    // Throughput values.
    expect(screen.getByText('82.1 t/s')).toBeVisible()
    // Success rates.
    expect(screen.getByText('100.00%')).toBeVisible()
    expect(screen.getByText('95.00%')).toBeVisible()
  })

  it('shows an empty state when the server returns no groups', () => {
    seedMonitoring(1, [])
    renderSection()

    expect(screen.getByText('No monitoring data available')).toBeVisible()
  })

  it('switches the time window and queries the matching hours', async () => {
    seedMonitoring(1, groups)
    seedMonitoring(6, [])
    const user = userEvent.setup()
    renderSection()

    expect(screen.getByText('gpt-5-mini')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Last 6h' }))

    expect(screen.getByText('No monitoring data available')).toBeVisible()
    expect(screen.queryByText('gpt-5-mini')).not.toBeInTheDocument()
  })
})
