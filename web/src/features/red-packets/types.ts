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
export const RED_PACKET_TYPE = {
  GIFT: 'gift',
  BALANCE: 'balance',
} as const

export type RedPacketType =
  (typeof RED_PACKET_TYPE)[keyof typeof RED_PACKET_TYPE]

export const RED_PACKET_DISTRIBUTION = {
  RANDOM: 'random',
  AVERAGE: 'average',
} as const

export type RedPacketDistribution =
  (typeof RED_PACKET_DISTRIBUTION)[keyof typeof RED_PACKET_DISTRIBUTION]

/** Landing page shape: claim directly or require the generated claim code. */
export const RED_PACKET_CLAIM_MODE = {
  DIRECT: 'direct',
  CODE: 'code',
} as const

export type RedPacketClaimMode =
  (typeof RED_PACKET_CLAIM_MODE)[keyof typeof RED_PACKET_CLAIM_MODE]

export const RED_PACKET_STATUS = {
  ACTIVE: 'active',
  SOLD_OUT: 'sold_out',
  EXPIRED: 'expired',
} as const

export type RedPacketStatus =
  (typeof RED_PACKET_STATUS)[keyof typeof RED_PACKET_STATUS]

/** Administrator view of a packet, including distribution statistics. */
export interface RedPacket {
  id: number
  type: RedPacketType
  claim_mode: RedPacketClaimMode
  /** Claim code of code packets; empty for direct packets. */
  claim_code: string
  /** Random token addressed by the landing page URL `/r/{{landing_token}}`. */
  landing_token: string
  total_quota: number
  share_count: number
  claimed_count: number
  distribution: RedPacketDistribution
  /** Days the packet stays claimable; 0 means it never expires. */
  expire_days: number
  /** Days a claimed gift credit grant stays valid; 0 means it never expires. */
  gift_expire_days: number
  remark: string
  creator_id: number
  creator_name: string
  created_at: number
  expires_at: number
  status: RedPacketStatus
  /** Quota claimed by every user so far. */
  claimed_amount: number
  remaining_count: number
}

export interface RedPacketClaim {
  id: number
  packet_id: number
  user_id: number
  username: string
  quota: number
  expires_at: number
  created_at: number
}

export interface RedPacketClaimResult {
  packet_id: number
  quota: number
  expires_at: number
}

/** Public landing page payload; never contains the claim code. */
export interface RedPacketLandingInfo {
  remark: string
  type: RedPacketType
  claim_mode: RedPacketClaimMode
  total_quota: number
  share_count: number
  claimed_count: number
  remaining_count: number
  /** Days a claimed gift credit grant stays valid; 0 means it never expires. */
  gift_expire_days: number
  created_at: number
  expires_at: number
  status: RedPacketStatus
}

/** Signed-in viewer's claim state for one landing page. */
export interface RedPacketMyClaimState {
  claimed: boolean
  quota: number
  expires_at: number
}

/** One row of the user-facing claim records page. */
export interface RedPacketUserClaim {
  id: number
  packet_id: number
  quota: number
  expires_at: number
  created_at: number
  remark: string
  type: RedPacketType
  claim_mode: RedPacketClaimMode
  creator_name: string
  share_count: number
  claimed_count: number
  packet_expires_at: number
}

export interface CreateRedPacketPayload {
  type: RedPacketType
  claim_mode: RedPacketClaimMode
  distribution: RedPacketDistribution
  total_quota: number
  share_count: number
  expire_days: number
  gift_expire_days: number
  remark: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

export type RedPacketsDialogType = 'create' | 'detail'
