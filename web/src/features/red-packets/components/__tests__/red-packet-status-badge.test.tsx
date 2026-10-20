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
import { describe, expect, test } from 'vitest'

import { RED_PACKET_STATUS } from '../../types'
import { RedPacketStatusBadge } from '../red-packet-status-badge'

describe('RedPacketStatusBadge', () => {
  test('marks a packet users can still claim as active', () => {
    render(<RedPacketStatusBadge status={RED_PACKET_STATUS.ACTIVE} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  test('reports a fully claimed packet as sold out', () => {
    render(<RedPacketStatusBadge status={RED_PACKET_STATUS.SOLD_OUT} />)

    expect(screen.getByText('Sold out')).toBeInTheDocument()
  })

  test('reports an elapsed packet as expired', () => {
    render(<RedPacketStatusBadge status={RED_PACKET_STATUS.EXPIRED} />)

    expect(screen.getByText('Expired')).toBeInTheDocument()
  })
})
