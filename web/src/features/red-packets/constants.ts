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
import {
  RED_PACKET_CLAIM_MODE,
  RED_PACKET_DISTRIBUTION,
  RED_PACKET_TYPE,
} from './types'

/** Matches the server-side limits enforced by model.ValidateRedPacketParams. */
export const RED_PACKET_VALIDATION = {
  SHARE_COUNT_MIN: 1,
  SHARE_COUNT_MAX: 1000,
  MAX_DAYS: 3650,
  REMARK_MAX_LENGTH: 255,
} as const

export const RED_PACKET_TYPE_OPTIONS = [
  { value: RED_PACKET_TYPE.GIFT, labelKey: 'Gift Credit' },
  { value: RED_PACKET_TYPE.BALANCE, labelKey: 'Balance' },
] as const

export const RED_PACKET_DISTRIBUTION_OPTIONS = [
  { value: RED_PACKET_DISTRIBUTION.RANDOM, labelKey: 'Random split' },
  { value: RED_PACKET_DISTRIBUTION.AVERAGE, labelKey: 'Equal split' },
] as const

export const RED_PACKET_CLAIM_MODE_OPTIONS = [
  { value: RED_PACKET_CLAIM_MODE.DIRECT, labelKey: 'Direct claim' },
  { value: RED_PACKET_CLAIM_MODE.CODE, labelKey: 'Claim code' },
] as const

export const SUCCESS_MESSAGES = {
  RED_PACKET_CREATED: 'Red packet created successfully',
  RED_PACKET_DELETED: 'Red packet deleted successfully',
} as const

export const ERROR_MESSAGES = {
  LOAD_FAILED: 'Failed to load red packets',
  CREATE_FAILED: 'Failed to create red packet',
  DELETE_FAILED: 'Failed to delete red packet',
  CLAIMS_LOAD_FAILED: 'Failed to load red packet claims',
  RECORDS_LOAD_FAILED: 'Failed to load red packet records',
  LANDING_LOAD_FAILED: 'Failed to load red packet',
  CLAIM_FAILED: 'Failed to claim red packet',
} as const
