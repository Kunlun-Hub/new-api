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
import { describe, expect, test, vi } from 'vitest'

import {
  RED_PACKET_CLAIM_MODE,
  RED_PACKET_STATUS,
  RED_PACKET_TYPE,
  type RedPacketLandingInfo,
} from '@/features/red-packets/types'

import { RedPacketLandingCard } from '../red-packet-landing-card'

function landingInfo(
  overrides: Partial<RedPacketLandingInfo> = {}
): RedPacketLandingInfo {
  return {
    remark: 'Team lucky draw',
    type: RED_PACKET_TYPE.GIFT,
    claim_mode: RED_PACKET_CLAIM_MODE.DIRECT,
    total_quota: 50_000_000,
    share_count: 10,
    claimed_count: 2,
    remaining_count: 8,
    gift_expire_days: 30,
    created_at: 1_700_000_000,
    expires_at: 0,
    status: RED_PACKET_STATUS.ACTIVE,
    ...overrides,
  }
}

type CardProps = React.ComponentProps<typeof RedPacketLandingCard>

function renderCard(overrides: Partial<CardProps> = {}) {
  const props: CardProps = {
    info: landingInfo(),
    isAuthenticated: true,
    claimState: undefined,
    code: '',
    onCodeChange: vi.fn(),
    onClaim: vi.fn(),
    onSignIn: vi.fn(),
    isClaiming: false,
    claimError: null,
    ...overrides,
  }
  render(<RedPacketLandingCard {...props} />)
  return props
}

describe('RedPacketLandingCard', () => {
  test('invites anonymous visitors to sign in before claiming', async () => {
    const props = renderCard({ isAuthenticated: false })

    expect(screen.queryByRole('button', { name: 'Claim now' })).toBeNull()

    await userEvent.click(
      screen.getByRole('button', { name: 'Log in to claim' })
    )

    expect(props.onSignIn).toHaveBeenCalledOnce()
  })

  test('claims a direct packet without asking for a code', async () => {
    const props = renderCard()

    expect(screen.queryByLabelText('Claim code')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Claim now' }))

    expect(props.onClaim).toHaveBeenCalledOnce()
  })

  test('requires the claim code before submitting a code packet', async () => {
    const props = renderCard({
      info: landingInfo({ claim_mode: RED_PACKET_CLAIM_MODE.CODE }),
    })

    const submit = screen.getByRole('button', { name: 'Claim now' })
    expect(submit).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Claim code'), 'AB12CD34')

    expect(props.onCodeChange).toHaveBeenCalled()
  })

  test('shows the server error for a rejected claim code inline', () => {
    renderCard({
      info: landingInfo({ claim_mode: RED_PACKET_CLAIM_MODE.CODE }),
      claimError: 'Incorrect claim code. Please check it and try again.',
    })

    expect(
      screen.getByText('Incorrect claim code. Please check it and try again.')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Claim code')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  test('reports the amount already claimed by the signed-in viewer', () => {
    renderCard({
      claimState: { claimed: true, quota: 5_000_000, expires_at: 0 },
    })

    expect(screen.getByText(/You already claimed/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim now' })).toBeNull()
  })

  test('shows the remaining percentage instead of the remaining share count', () => {
    renderCard()

    expect(screen.getByText('80% remaining')).toBeInTheDocument()
    expect(screen.queryByText('2/10 shares claimed')).toBeNull()
    expect(screen.queryByText('Remaining')).toBeNull()
    expect(screen.queryByText('8/10 left')).toBeNull()
    expect(screen.queryByText(/Issued by/)).toBeNull()
  })

  test('reports a sold out packet instead of the claim action', () => {
    renderCard({
      info: landingInfo({
        status: RED_PACKET_STATUS.SOLD_OUT,
        claimed_count: 10,
        remaining_count: 0,
      }),
    })

    expect(screen.getByText('This red packet is sold out')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim now' })).toBeNull()
  })

  test('reports an expired packet instead of the claim action', () => {
    renderCard({
      info: landingInfo({
        status: RED_PACKET_STATUS.EXPIRED,
        expires_at: 1_700_000_000,
      }),
    })

    expect(screen.getByText('This red packet has expired')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim now' })).toBeNull()
  })
})
