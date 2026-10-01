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
export interface InviteEligibility {
  eligible: boolean
  has_valid_topup: boolean
  min_used_quota: number
  current_used_quota: number
  used_quota_met: boolean
  min_invites: number
}

export interface InviteRewardConfig {
  invitee_reward_quota: number
  topup_reward_percentage: number
  topup_reward_times: number
  inviter_reward_quota: number
  unlock_requires_topup: boolean
}

export interface InviteWithdrawalConfig {
  enabled: boolean
  min_quota: number
  ratio: number
}

export interface InviteStatus {
  account_quota: number
  aff_code: string
  aff_count: number
  aff_history_quota: number
  aff_quota: number
  inviter_id: number
  eligibility: InviteEligibility
  rewards: InviteRewardConfig
  withdrawal: InviteWithdrawalConfig
}

export interface AffiliateLogItem {
  id: number
  create_time: number
  user_id: number
  user_name: string
  invitee_id: number
  invitee_name: string
  invitee_quota: number
  reward_quota: number
  status: number
  source: 'register' | 'topup'
  content: string
}

export interface WithdrawalRecord {
  id: number
  user_id: number
  amount: number
  amount_cny: number
  quota: number
  real_name: string
  account: string
  status: number
  create_time: number
  update_time: number
}

export interface PagedRecords<T> {
  page: number
  page_size: number
  total: number
  items: T[]
}
