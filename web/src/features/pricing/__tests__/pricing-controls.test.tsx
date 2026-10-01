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
import { describe, expect, it, vi } from 'vitest'

import {
  PricingFilterBar,
  type PricingFilterBarProps,
} from '../components/pricing-filter-bar'
import {
  PricingToolbar,
  type PricingToolbarProps,
} from '../components/pricing-toolbar'
import type { PricingModel } from '../types'

function toolbarProps(): PricingToolbarProps {
  return {
    filteredCount: 2,
    totalCount: 2,
    vendorLabel: 'All Vendors',
    showRechargePrice: false,
    viewMode: 'card',
    onRechargePriceChange: vi.fn(),
    onViewModeChange: vi.fn(),
    onDownload: vi.fn(),
  }
}

function filterBarProps(): PricingFilterBarProps {
  return {
    quotaTypeFilter: 'all',
    endpointTypeFilter: 'all',
    vendorFilter: 'all',
    groupFilter: 'all',
    tagFilter: 'all',
    onQuotaTypeChange: vi.fn(),
    onEndpointTypeChange: vi.fn(),
    onVendorChange: vi.fn(),
    onGroupChange: vi.fn(),
    onTagChange: vi.fn(),
    vendors: [],
    groups: ['default', 'premium'],
    groupRatios: { default: 1, premium: 3 },
    tags: [],
    models: [],
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    onModelSelect: vi.fn(),
  }
}

describe('pricing controls', () => {
  it('counts each model once per filter and updates counts when the catalog changes', async () => {
    const props = filterBarProps()
    const user = userEvent.setup()
    const base: PricingModel = {
      id: 1,
      model_name: 'text-model',
      vendor_name: 'Vendor A',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['default'],
      tags: 'Chat,chat',
      supported_endpoint_types: ['openai', 'openai'],
    }
    const models: PricingModel[] = [
      base,
      {
        ...base,
        id: 2,
        model_name: 'image-model',
        quota_type: 1,
        tags: 'chat,Image',
        supported_endpoint_types: ['image-generation'],
      },
      {
        ...base,
        id: 3,
        model_name: 'task-model',
        vendor_name: 'Vendor B',
        tags: 'Video',
        supported_endpoint_types: ['openai-video'],
        billing_usage_schema: { seconds: { type: 'number', unit: 'second' } },
      },
    ]
    const barProps = {
      ...props,
      vendors: [
        { id: 1, name: 'Vendor A' },
        { id: 2, name: 'Vendor B' },
      ],
      tags: ['Chat', 'Image', 'Video'],
    }
    const { rerender } = render(
      <PricingFilterBar {...barProps} models={models} />
    )

    await user.click(screen.getByRole('button', { name: /Vendors/ }))
    expect(
      await screen.findByRole('menuitem', { name: /^All\s*3$/ })
    ).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: /^Vendor A\s*2$/ })
    ).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: /^Vendor B\s*1$/ })
    ).toBeVisible()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /Billing/ }))
    expect(
      await screen.findByRole('menuitem', { name: /^Token-based\s*1$/ })
    ).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: /^Per Request\s*1$/ })
    ).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: /^Task billing\s*1$/ })
    ).toBeVisible()
    await user.keyboard('{Escape}')

    rerender(<PricingFilterBar {...barProps} models={[models[1]]} />)

    await user.click(screen.getByRole('button', { name: /Vendors/ }))
    expect(
      await screen.findByRole('menuitem', { name: /^All\s*1$/ })
    ).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: /^Vendor A\s*1$/ })
    ).toBeVisible()
    expect(
      screen.queryByRole('menuitem', { name: /^Vendor B\s*1$/ })
    ).toBeNull()
    await user.keyboard('{Escape}')
  })

  it('changes the recharge display mode with an accessible selected state', async () => {
    const changes: boolean[] = []
    const props = {
      ...toolbarProps(),
      onRechargePriceChange: (value: boolean) => changes.push(value),
    }
    const user = userEvent.setup()
    const { rerender } = render(<PricingToolbar {...props} />)
    const rateSwitch = screen.getByRole('switch', { name: 'Multiplier' })
    expect(rateSwitch).toHaveAttribute('aria-checked', 'false')
    await user.click(rateSwitch)
    expect(changes).toEqual([true])
    rerender(<PricingToolbar {...props} showRechargePrice />)
    expect(screen.getByRole('switch', { name: 'Multiplier' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('switches to table view with the keyboard and exposes the selected view', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    const { rerender } = render(<PricingToolbar {...props} />)
    const tableButton = screen.getByRole('button', { name: 'Table view' })
    tableButton.focus()
    await user.keyboard('{Enter}')
    expect(props.onViewModeChange).toHaveBeenCalledWith('table')
    rerender(<PricingToolbar {...props} viewMode='table' />)
    expect(tableButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Card view' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('selects the vendor from the mobile filter sheet', async () => {
    const props = filterBarProps()
    const user = userEvent.setup()
    render(
      <PricingFilterBar
        {...props}
        vendors={[{ id: 1, name: 'Vendor A' }]}
        models={[
          {
            id: 1,
            model_name: 'text-model',
            vendor_name: 'Vendor A',
            quota_type: 0,
            model_ratio: 1,
            completion_ratio: 1,
            enable_groups: ['default'],
          },
        ]}
      />
    )
    await user.click(screen.getByRole('button', { name: /Filter/ }))
    await user.click(await screen.findByRole('button', { name: 'Vendor A' }))
    expect(props.onVendorChange).toHaveBeenCalledWith('Vendor A')
    expect(props.onModelSelect).not.toHaveBeenCalled()
  })

  it('downloads the filtered model list from the toolbar', async () => {
    const props = toolbarProps()
    const user = userEvent.setup()
    render(<PricingToolbar {...props} />)
    await user.click(screen.getByRole('button', { name: 'Download' }))
    expect(props.onDownload).toHaveBeenCalledTimes(1)
  })
})
