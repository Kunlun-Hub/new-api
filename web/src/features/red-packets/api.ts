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
import { api } from '@/lib/api'

import type {
  ApiResponse,
  CreateRedPacketPayload,
  RedPacket,
  RedPacketClaim,
  RedPacketClaimResult,
  RedPacketLandingInfo,
  RedPacketMyClaimState,
  RedPacketUserClaim,
} from './types'

export const RED_PACKETS_QUERY_KEY = 'red-packets'
export const RED_PACKET_RECORDS_QUERY_KEY = 'red-packet-records'
export const RED_PACKET_LANDING_QUERY_KEY = 'red-packet-landing'

// ============================================================================
// Administrator: issuing and monitoring
// ============================================================================

// List every packet with distribution statistics (administrators only).
export async function getRedPackets(): Promise<ApiResponse<RedPacket[]>> {
  const res = await api.get('/api/red_packet')
  return res.data
}

// Issue a new gift credit or balance red packet (administrators only).
export async function createRedPacket(
  payload: CreateRedPacketPayload
): Promise<ApiResponse<RedPacket>> {
  const res = await api.post('/api/red_packet', payload)
  return res.data
}

// Remove a packet (administrators only).
export async function deleteRedPacket(
  packetId: number
): Promise<ApiResponse<null>> {
  const res = await api.delete(`/api/red_packet/${packetId}`)
  return res.data
}

// List the claim records of one packet (administrators only).
export async function getRedPacketClaims(
  packetId: number
): Promise<ApiResponse<RedPacketClaim[]>> {
  const res = await api.get(`/api/red_packet/${packetId}/claims`)
  return res.data
}

// ============================================================================
// Landing page and claim records
// ============================================================================

// Public landing payload addressed by the packet token.
export async function getRedPacketLanding(
  token: string
): Promise<ApiResponse<RedPacketLandingInfo>> {
  const res = await api.get(`/api/red_packet/landing/${token}`)
  return res.data
}

// The signed-in viewer's claim state for a landing page.
export async function getMyRedPacketClaim(
  token: string
): Promise<ApiResponse<RedPacketMyClaimState>> {
  const res = await api.get(`/api/red_packet/landing/${token}/claim`)
  return res.data
}

// Claim one share through the landing page; the code is required for code packets.
export async function claimRedPacketByLanding(
  token: string,
  code?: string
): Promise<ApiResponse<RedPacketClaimResult>> {
  const res = await api.post(`/api/red_packet/landing/${token}/claim`, {
    code: code ?? '',
  })
  return res.data
}

// List the signed-in user's claim records.
export async function getMyRedPacketClaims(): Promise<
  ApiResponse<RedPacketUserClaim[]>
> {
  const res = await api.get('/api/red_packet/my_claims')
  return res.data
}
