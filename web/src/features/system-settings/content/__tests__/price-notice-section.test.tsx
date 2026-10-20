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
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { PriceNoticeSection } from '../price-notice-section'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('edits price updates visually and saves them as valid notice data', async () => {
  const user = userEvent.setup()
  const put = vi.spyOn(api, 'put').mockResolvedValue({
    data: { success: true },
  } as never)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <PriceNoticeSection
        enabled
        data={JSON.stringify([
          {
            content: 'Existing price cut',
            publishDate: '2026-10-20T12:00:00+08:00',
            type: 'price_cut',
          },
        ])}
      />
    </QueryClientProvider>
  )

  const table = await screen.findByRole('table')
  expect(await within(table).findByText('Existing price cut')).toBeVisible()
  expect(within(table).getByText('Price Cut')).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Add Price Update' }))
  const dialog = await screen.findByRole('dialog')
  await user.type(
    within(dialog).getByLabelText('Content'),
    '## New price update'
  )
  await user.click(within(dialog).getByRole('button', { name: 'Add' }))
  expect(await within(table).findByText('## New price update')).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Save Settings' }))
  await waitFor(() => expect(put).toHaveBeenCalled())

  const request = put.mock.calls.at(-1)?.[1] as {
    key: string
    value: string
  }
  expect(request.key).toBe('console_setting.price_notice')
  const saved = JSON.parse(request.value) as Array<Record<string, unknown>>
  expect(saved).toHaveLength(2)
  expect(saved).toContainEqual(
    expect.objectContaining({
      content: '## New price update',
      type: 'update',
      publishDate: expect.any(String),
    })
  )
  expect(saved).toContainEqual(
    expect.objectContaining({
      content: 'Existing price cut',
      type: 'price_cut',
      publishDate: '2026-10-20T12:00:00+08:00',
    })
  )
})
