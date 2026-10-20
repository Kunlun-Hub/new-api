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
import type { TFunction } from 'i18next'
import { describe, expect, test } from 'vitest'

import { RED_PACKET_CLAIM_MODE } from '../../types'
import {
  composeRedPacketShareText,
  getRedPacketClaimLink,
  getRedPacketLandingUrl,
} from '../red-packet-links'

const t = ((key: string) => key) as unknown as TFunction
const origin = 'https://example.com'

describe('red packet landing links', () => {
  test('builds the landing URL from the packet token', () => {
    expect(getRedPacketLandingUrl('token123', origin)).toBe(
      'https://example.com/r/token123'
    )
  })

  test('appends the claim code for code packets', () => {
    const link = getRedPacketClaimLink(
      {
        landing_token: 'token123',
        claim_mode: RED_PACKET_CLAIM_MODE.CODE,
        claim_code: 'AB12CD34',
        remark: '',
      },
      origin
    )

    expect(link).toBe('https://example.com/r/token123?code=AB12CD34')
  })

  test('keeps direct packets free of claim parameters', () => {
    const link = getRedPacketClaimLink(
      {
        landing_token: 'token123',
        claim_mode: RED_PACKET_CLAIM_MODE.DIRECT,
        claim_code: '',
        remark: '',
      },
      origin
    )

    expect(link).toBe('https://example.com/r/token123')
  })

  test('composes share text with the remark, claim code and link', () => {
    const text = composeRedPacketShareText(
      {
        landing_token: 'token123',
        claim_mode: RED_PACKET_CLAIM_MODE.CODE,
        claim_code: 'AB12CD34',
        remark: '  Team lucky draw  ',
      },
      t
    )

    expect(text).toBe(
      `Team lucky draw\nClaim code: AB12CD34\nLanding page URL: ${window.location.origin}/r/token123?code=AB12CD34`
    )
  })
})
