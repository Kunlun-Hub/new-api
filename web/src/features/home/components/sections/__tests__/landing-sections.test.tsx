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
import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { CTA } from '@/features/home/components/sections/cta'
import { Features } from '@/features/home/components/sections/features'
import { Hero } from '@/features/home/components/sections/hero'
import { HowItWorks } from '@/features/home/components/sections/how-it-works'
import { Stats } from '@/features/home/components/sections/stats'
import { UseCases } from '@/features/home/components/sections/use-cases'
import type { HomeStats } from '@/features/home/types'

const { getHomeStats } = vi.hoisted(() => ({ getHomeStats: vi.fn() }))

vi.mock('@/features/home/api', () => ({
  getHomePageContent: vi.fn(),
  getHomeStats,
}))

function mockHomeStats(overrides: Partial<HomeStats> = {}) {
  getHomeStats.mockResolvedValue({
    success: true,
    data: {
      model_count: 42,
      total_requests: 1234567,
      success_rate: 99.9,
      success_rate_hours: 24,
      ...overrides,
    },
  })
}

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { systemName: 'Test API' },
    loading: false,
    error: null,
  }),
}))

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

afterAll(() => {
  vi.unstubAllGlobals()
})

function Placeholder() {
  return <div>placeholder</div>
}

async function renderWithRouter(ui: React.ReactNode) {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => ui,
  })
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: 'dashboard',
    component: Placeholder,
  })
  const signUp = createRoute({
    getParentRoute: () => root,
    path: 'sign-up',
    component: Placeholder,
  })
  const pricing = createRoute({
    getParentRoute: () => root,
    path: 'pricing',
    component: Placeholder,
  })
  const router = createRouter({
    routeTree: root.addChildren([index, dashboard, signUp, pricing]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('landing sections', () => {
  it('hero shows the headline and signup call-to-action for visitors', async () => {
    await renderWithRouter(<Hero isAuthenticated={false} />)
    expect(
      screen.getByRole('heading', { name: /Just One Interface/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Get Started/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Help Docs/ })
    ).toBeInTheDocument()
  })

  it('hero links to the dashboard for signed-in users', async () => {
    await renderWithRouter(<Hero isAuthenticated />)
    expect(
      screen.getByRole('button', { name: /Get Started/ })
    ).toBeInTheDocument()
  })

  it('stats renders the live platform metrics', async () => {
    mockHomeStats()
    await renderWithRouter(<Stats />)
    expect(await screen.findByText('AI models available')).toBeInTheDocument()
    expect(screen.getByText('Requests served')).toBeInTheDocument()
    expect(screen.getByText('service availability')).toBeInTheDocument()
  })

  it('stats omits availability while the platform has no recorded traffic', async () => {
    mockHomeStats({ success_rate: 0, success_rate_hours: 0 })
    await renderWithRouter(<Stats />)
    expect(await screen.findByText('AI models available')).toBeInTheDocument()
    expect(screen.queryByText('service availability')).not.toBeInTheDocument()
  })

  it('features renders all six service cards', async () => {
    await renderWithRouter(<Features />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(6)
    expect(screen.getByText('Tutorial')).toBeInTheDocument()
    expect(screen.getByText('Seamless Integration')).toBeInTheDocument()
  })

  it('how-it-works lists three steps and a curl example', async () => {
    await renderWithRouter(<HowItWorks />)
    expect(screen.getByText('Sign up and top up')).toBeInTheDocument()
    expect(screen.getByText('Create an API token')).toBeInTheDocument()
    expect(screen.getByText('Swap the endpoint and call')).toBeInTheDocument()
    expect(screen.getByText('REQUEST')).toBeInTheDocument()
    expect(screen.getByText('/v1/chat/completions')).toBeInTheDocument()
  })

  it('use-cases renders all five scenario cards', async () => {
    await renderWithRouter(<UseCases />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(5)
    expect(screen.getByText('Conversational apps')).toBeInTheDocument()
    expect(screen.getByText('Data processing & analysis')).toBeInTheDocument()
    expect(screen.getByText('Image & multimodal')).toBeInTheDocument()
  })

  it('cta shows the signup banner for visitors', async () => {
    await renderWithRouter(<CTA isAuthenticated={false} />)
    expect(
      screen.getByRole('button', { name: /Create free account/ })
    ).toBeInTheDocument()
  })

  it('cta renders nothing for signed-in users', async () => {
    const { container } = await renderWithRouter(<CTA isAuthenticated />)
    expect(container).toBeEmptyDOMElement()
  })
})
