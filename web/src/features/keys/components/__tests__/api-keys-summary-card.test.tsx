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
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { STATUS_QUERY_KEY } from '@/lib/status-query'

import { ApiKeysSummaryCard } from '../api-keys-summary-card'

let client: QueryClient

afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
})

it.each([
  {
    name: 'adds /v1 when the configured address has no path',
    url: 'https://gateway.example.com',
    expected: 'https://gateway.example.com/v1',
  },
  {
    name: 'does not duplicate an existing /v1 suffix',
    url: 'https://gateway.example.com/v1',
    expected: 'https://gateway.example.com/v1',
  },
  {
    name: 'preserves the configured path and trailing slash',
    url: 'https://gateway.example.com/proxy/v1/',
    expected: 'https://gateway.example.com/proxy/v1/',
  },
])('copies the displayed BaseURL and $name', async ({ url, expected }) => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  client = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, {
    api_info_enabled: true,
    api_info: [{ route: 'Default', url, color: 'blue' }],
  })

  render(
    <QueryClientProvider client={client}>
      <ApiKeysSummaryCard />
    </QueryClientProvider>
  )

  const expectedUrl = new URL(expected)
  expect(screen.getByText(expectedUrl.origin)).toBeVisible()
  expect(screen.getByText(expectedUrl.pathname)).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Copy' }))
  expect(writeText).toHaveBeenCalledWith(expected)
})
