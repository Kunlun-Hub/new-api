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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  act,
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { Toaster, toast } from 'sonner'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { apiKeySchema, type ApiKey } from '../../types'
import { ApiKeyQuotaCell } from '../api-key-quota-cell'
import { useApiKeysColumns } from '../api-keys-columns'
import { ApiKeysProvider } from '../api-keys-provider'
import { ApiKeysTable } from '../api-keys-table'

const now = 1_700_000_000_000
const key = apiKeySchema.parse({
  id: 7,
  name: 'production',
  key: 'demo********1234',
  status: 1,
  remain_quota: 40_000_000,
  used_quota: 60_000_000,
  unlimited_quota: false,
  expired_time: -1,
  created_time: 0,
  accessed_time: 0,
  group: 'default',
  model_limits_enabled: false,
})
const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: { en: { translation: {} } },
  initAsync: false,
})
const clients: QueryClient[] = []

function QuotaTable(props: { apiKey: ApiKey }) {
  const columns = useApiKeysColumns().filter((column) => column.id === 'quota')
  const table = useReactTable({
    columns,
    data: [props.apiKey],
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function renderQuota(apiKey: ApiKey = key) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  })
  clients.push(client)
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <QuotaTable apiKey={apiKey} />
      </QueryClientProvider>
    </I18nextProvider>
  )
}

function renderQuotaCard(apiKey: ApiKey = key) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ApiKeyQuotaCell apiKey={apiKey} now={now} variant='card' />
    </I18nextProvider>
  )
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.clear()
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: {} } })
})
afterEach(() => {
  cleanup()
  toast.dismiss()
  localStorage.clear()
  clients.splice(0).forEach((client) => client.clear())
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
})

it('shows the used then remaining amounts as outline badges like the reference', () => {
  renderQuota()
  expect(
    screen.getByRole('columnheader', { name: 'Used / Remaining' })
  ).toBeInTheDocument()
  const badges = screen.getAllByText(/^\$\d/)
  expect(badges.map((badge) => badge.textContent)).toEqual([
    '$120.00',
    '$80.00',
  ])
  expect(badges[0]).toHaveAttribute('data-slot', 'badge')
  expect(badges[0]).toHaveAttribute('data-variant', 'outline')
  expect(badges[0].parentElement).toHaveClass('whitespace-nowrap')
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it.each([
  ['unused', 500000, 0, 100, 'text-emerald-500'],
  ['low remaining', 150000, 350000, 30, 'text-amber-500'],
  ['critical remaining', 50000, 450000, 10, 'text-rose-500'],
  ['exhausted', 0, 500000, 0, null],
  ['overdrawn', -50000, 500000, 0, null],
  ['zero total', 0, 0, 0, null],
  ['negative total', -500000, 100000, 0, null],
])(
  'renders the %s progress without invalid values or hiding negative balances',
  (_label, remaining, used, percentage, color) => {
    renderQuotaCard({ ...key, remain_quota: remaining, used_quota: used })
    const button = screen.getByRole('button')
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow', String(percentage))
    if (color) expect(progress).toHaveClass(color)
    if (remaining < 0) {
      expect(
        within(button).getByText(remaining === -500000 ? '-1.00' : '-0.10')
      ).toHaveClass('text-destructive')
    }
  }
)

it('shows the used amount and the unlimited marker as badges', () => {
  renderQuota({ ...key, unlimited_quota: true })
  const badges = screen.getAllByText(/^\$\d|^Unlimited$/)
  expect(badges.map((badge) => badge.textContent)).toEqual([
    '$120.00',
    'Unlimited',
  ])
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('explains the unlimited marker in the mobile card details', async () => {
  renderQuotaCard({ ...key, unlimited_quota: true })
  const button = screen.getByRole('button', { name: /Unlimited/ })
  expect(button).toHaveTextContent('Unlimited')
  expect(button).toHaveTextContent('120.00')
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  await userEvent.click(button)
  const detail = await screen.findByRole('dialog')
  expect(within(detail).getByText('120.00')).toBeInTheDocument()
  expect(detail).toHaveTextContent(
    'This API key has no quota limit. Requests still require available wallet or subscription quota.'
  )
})

it('keeps small custom-currency amounts exact in the badges', () => {
  useSystemConfigStore.getState().setConfig({
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CUSTOM',
      customCurrencySymbol: '🐱',
    },
  })
  renderQuota({ ...key, remain_quota: 1900, used_quota: 1100 })
  expect(
    screen.getByRole('columnheader', { name: 'Used / Remaining' })
  ).toBeInTheDocument()
  expect(screen.getByText('🐱 0.0022')).toBeInTheDocument()
  expect(screen.getByText('🐱 0.0038')).toBeInTheDocument()
})

it.each([
  ['disabled', { status: 2 }],
  ['expired status', { status: 3 }],
  ['exhausted status', { status: 4 }],
  ['expired timestamp', { expired_time: now / 1000 - 1 }],
])('renders the %s progress bar in a neutral color', (_label, overrides) => {
  renderQuotaCard({ ...key, ...overrides })
  expect(screen.getByRole('progressbar')).toHaveClass(
    'text-muted-foreground/60'
  )
})

it('recalculates the progress when remaining quota is edited', () => {
  const { rerender } = render(
    <I18nextProvider i18n={i18n}>
      <ApiKeyQuotaCell apiKey={key} now={now} variant='card' />
    </I18nextProvider>
  )
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  rerender(
    <I18nextProvider i18n={i18n}>
      <ApiKeyQuotaCell
        apiKey={{ ...key, remain_quota: 90_000_000 }}
        now={now}
        variant='card'
      />
    </I18nextProvider>
  )
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
  expect(screen.getByText('180.00')).toBeInTheDocument()
})

it('opens details with the keyboard and restores focus when Escape closes them', async () => {
  renderQuotaCard()
  const user = userEvent.setup()
  const button = screen.getByRole('button')
  act(() => button.focus())
  await user.keyboard('{Enter}')
  const detail = await screen.findByRole('dialog')
  expect(within(detail).getByText('80.00')).toBeInTheDocument()
  expect(within(detail).getByText('120.00')).toBeInTheDocument()
  expect(within(detail).getByText('200.00')).toBeInTheDocument()
  expect(within(detail).getByText('Remaining percentage')).toBeInTheDocument()
  expect(within(detail).getByText('40%')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(button).toHaveFocus()
})

it('keeps a long amount in a single non-wrapping badge', () => {
  renderQuota({ ...key, remain_quota: 123456789000000, used_quota: 0 })
  const badge = screen.getByText('$246,913,578.00')
  expect(badge).toHaveAttribute('data-slot', 'badge')
  expect(badge.parentElement).toHaveClass('whitespace-nowrap')
})

function KeysPage() {
  return (
    <ApiKeysProvider>
      <ApiKeysTable />
      <Toaster />
    </ApiKeysProvider>
  )
}

async function renderKeysPage(status = 1, overrides: Partial<ApiKey> = {}) {
  let currentKey = { ...key, status, ...overrides }
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url.startsWith('/api/token/')) {
      return {
        data: { success: true, data: { items: [currentKey], total: 1 } },
      }
    }
    return { data: { success: true, data: { default: { ratio: 1 } } } }
  })
  const post = vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: true, data: { key: 'fake-key-for-test-only' } },
  })
  const put = vi.spyOn(api, 'put').mockImplementation(async (_url, data) => {
    const update = data as { id: number; status: number }
    currentKey = { ...currentKey, status: update.status }
    return { data: { success: true, data: currentKey } }
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['status'], {})
  clients.push(client)
  const root = createRootRoute()
  const auth = createRoute({ getParentRoute: () => root, id: '_authenticated' })
  const keysRoute = createRoute({
    getParentRoute: () => auth,
    path: 'keys/',
    component: KeysPage,
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([keysRoute])]),
    history: createMemoryHistory({ initialEntries: ['/keys/'] }),
  })
  await router.load()
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>
  )
  await screen.findByText(currentKey.name)
  return { post, put }
}

it('matches the reference column order for the token table', async () => {
  const createdAt = Math.floor(new Date(2023, 10, 14, 22, 13).getTime() / 1000)
  await renderKeysPage(1, { created_time: createdAt })
  for (const name of [
    'Name',
    'ApiKey',
    'Group',
    'Used / Remaining',
    'Created',
    'Expires',
    'Actions',
    'Status',
  ]) {
    expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
  }
  expect(
    screen.queryByRole('columnheader', { name: 'Models' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('columnheader', { name: 'IP Restriction' })
  ).not.toBeInTheDocument()
  const createdCell = screen.getByText('2023-11-14 22:13')
  expect(createdCell).toHaveClass('whitespace-nowrap')
  expect(screen.queryByText('Last Used')).not.toBeInTheDocument()
})

it.each([
  [1, true, 2],
  [2, false, 1],
])(
  'toggles status %s through the row switch without fetching a full key',
  async (status, checked, nextStatus) => {
    const { post, put } = await renderKeysPage(status)
    const user = userEvent.setup()
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', String(checked))
    await user.click(toggle)
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/api/token/?status_only=true', {
        id: 7,
        status: nextStatus,
      })
    )
    expect(post).not.toHaveBeenCalled()
  }
)

it('keeps expired status when the server refuses reactivation', async () => {
  const { put, post } = await renderKeysPage(3)
  put.mockResolvedValue({ data: { success: false, message: 'Token expired' } })
  await userEvent.click(screen.getByRole('switch'))
  await screen.findByText('Token expired')
  expect(screen.getByText('Expired')).toBeInTheDocument()
  expect(post).not.toHaveBeenCalled()
})

it.each([true, false])(
  'fetches a full key only when the key cell copies it and honors permission success=%s',
  async (success) => {
    const user = userEvent.setup()
    const { post } = await renderKeysPage()
    post.mockResolvedValue(
      success
        ? { data: { success: true, data: { key: 'fake-key-for-test-only' } } }
        : { data: { success: false, message: 'Verification required' } }
    )
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const copyButton = screen.getByRole('button', { name: 'Copy API key' })
    expect(post).not.toHaveBeenCalled()
    await user.click(copyButton)
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/token/7/key'))
    if (success) {
      await waitFor(() =>
        expect(copy).toHaveBeenCalledWith('sk-fake-key-for-test-only')
      )
    } else {
      await screen.findByText('Verification required')
      expect(copy).not.toHaveBeenCalled()
    }
  }
)
