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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { TooltipProvider } = await import('@/components/ui/tooltip')
const { ApiKeyGroupCell } = await import('../api-key-group-cell')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Auto: 'Auto',
        'Authorized models': 'Authorized models',
        'Follow user group': 'Follow user group',
        'Model restriction': 'Model restriction',
      },
    },
  },
})

function CellHarness(props: {
  group: string
  crossGroupRetry?: boolean
  groupDescription?: string
  modelLimits?: string
  modelLimitsEnabled?: boolean
}) {
  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ApiKeyGroupCell
          group={props.group}
          groupDescription={props.groupDescription}
          modelLimits={props.modelLimits}
          modelLimitsEnabled={props.modelLimitsEnabled}
          crossGroupRetry={props.crossGroupRetry ?? false}
        />
      </TooltipProvider>
    </I18nextProvider>
  )
}

describe('API key group table cell', () => {
  test('renders the group dot and name without a multiplier badge', () => {
    const { container } = render(<CellHarness group='default' />)
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(container.querySelector('.bg-primary.size-2')).not.toBeNull()
    expect(screen.queryByText('1x')).not.toBeInTheDocument()
    expect(screen.queryByText('Auto')).not.toBeInTheDocument()
  })

  test('marks cross-group retry keys with the automatic badge', () => {
    render(<CellHarness group='default' crossGroupRetry />)
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  test('exposes the group description through keyboard focus', async () => {
    const groupName = 'production-with-a-very-long-custom-group-name'
    render(
      <CellHarness group={groupName} groupDescription='Production traffic' />
    )
    expect(screen.getByText(groupName)).toBeInTheDocument()
    await userEvent.tab()
    expect(await screen.findByText('Production traffic')).toBeVisible()
  })

  test('falls back to the group name when no description is available', async () => {
    render(<CellHarness group='vip' />)
    await userEvent.tab()
    expect(
      await screen.findByText('vip', {
        selector: '[data-slot="tooltip-content"]',
      })
    ).toBeVisible()
  })

  test('lists the authorized models behind the restriction badge', async () => {
    render(
      <CellHarness
        group='default'
        modelLimitsEnabled
        modelLimits='gpt-4o, claude-3-5-sonnet'
      />
    )
    const badge = screen.getByText('Model restriction')
    expect(badge).toBeInTheDocument()
    await userEvent.hover(badge)
    expect(await screen.findByText('Authorized models')).toBeVisible()
    expect(screen.getByText('gpt-4o')).toBeVisible()
    expect(screen.getByText('claude-3-5-sonnet')).toBeVisible()
  })

  test('hides the restriction badge while model limits are disabled', () => {
    render(<CellHarness group='default' modelLimits='gpt-4o' />)
    expect(screen.queryByText('Model restriction')).not.toBeInTheDocument()
  })
})
