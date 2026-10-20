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

import { RED_PACKET_CLAIM_MODE } from '../types'

type LandingPacket = {
  landing_token: string
  claim_mode: string
  claim_code: string
  remark: string
}

/** Absolute landing page URL for the packet token. */
export function getRedPacketLandingUrl(token: string, origin?: string): string {
  const base =
    origin ?? (typeof window === 'undefined' ? '' : window.location.origin)
  return `${base}/r/${token}`
}

/**
 * Landing URL with the claim code pre-filled for code packets, so a shared
 * link opens the landing page with the code already in place.
 */
export function getRedPacketClaimLink(
  packet: LandingPacket,
  origin?: string
): string {
  const url = getRedPacketLandingUrl(packet.landing_token, origin)
  if (
    packet.claim_mode === RED_PACKET_CLAIM_MODE.CODE &&
    packet.claim_code !== ''
  ) {
    return `${url}?code=${encodeURIComponent(packet.claim_code)}`
  }
  return url
}

/** Ready-to-paste 口令信息 combining the remark, claim code and link. */
export function composeRedPacketShareText(
  packet: LandingPacket,
  t: TFunction
): string {
  const lines = [packet.remark.trim() || t('Red packet')]
  if (
    packet.claim_mode === RED_PACKET_CLAIM_MODE.CODE &&
    packet.claim_code !== ''
  ) {
    lines.push(`${t('Claim code')}: ${packet.claim_code}`)
  }
  lines.push(`${t('Landing page URL')}: ${getRedPacketClaimLink(packet)}`)
  return lines.join('\n')
}
