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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { AffiliateRecords } from '../components/affiliate-records'

function renderRecords(withdrawalEnabled = true) {
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url.startsWith('/api/afflog')) {
      return {
        data: {
          success: true,
          data: {
            page: 1,
            page_size: 10,
            total: 1,
            items: [
              {
                id: 1,
                create_time: 1788840000,
                user_id: 1,
                user_name: 'inviter',
                invitee_id: 2,
                invitee_name: 'invitee',
                invitee_quota: 20,
                reward_quota: 2,
                status: 1,
                source: 'topup',
                content: '',
              },
            ],
          },
        },
      }
    }
    if (url.startsWith('/api/withdrawal')) {
      return {
        data: {
          success: true,
          data: {
            page: 1,
            page_size: 10,
            total: 2,
            items: [
              {
                id: 1,
                user_id: 2,
                amount: 20,
                amount_cny: 32,
                quota: 10000000,
                real_name: 'tester',
                account: 'alipay@example.com',
                status: 3,
                create_time: 1788840000,
                update_time: 1788840000,
              },
              {
                id: 2,
                user_id: 2,
                amount: 15,
                amount_cny: 24,
                quota: 7500000,
                real_name: 'tester',
                account: 'alipay@example.com',
                status: 0,
                create_time: 1788840100,
                update_time: 1788840100,
              },
            ],
          },
        },
      }
    }
    return { data: { success: true, data: { items: [], total: 0 } } }
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AffiliateRecords
        isAdmin={false}
        withdrawalEnabled={withdrawalEnabled}
        reloadToken={0}
        onQuotaChanged={() => {}}
      />
    </QueryClientProvider>
  )
}

test('renders reward records with the reference columns', async () => {
  renderRecords()
  expect(await screen.findByText('Reward Records')).toBeVisible()
  expect(await screen.findByText('Invitee Top-up')).toBeVisible()
  expect(await screen.findByText('Reward')).toBeVisible()
  expect(await screen.findByText('Invite top-up reward')).toBeVisible()
  await waitFor(() => {
    expect(screen.getByText('$20.00')).toBeVisible()
    expect(screen.getByText('$2.00')).toBeVisible()
    expect(screen.getByText('Rewarded')).toBeVisible()
  })
})

test('maps withdrawal statuses to the reference labels', async () => {
  const user = userEvent.setup()
  renderRecords()
  await user.click(await screen.findByText('Withdrawal Records'))
  await waitFor(() => {
    expect(screen.getByText('Rejected')).toBeVisible()
    expect(screen.getByText('Pending review')).toBeVisible()
  })
  expect(screen.getByText('¥32.00')).toBeVisible()
})
