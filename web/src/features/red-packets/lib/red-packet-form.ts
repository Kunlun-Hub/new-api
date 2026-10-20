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
import { z } from 'zod'

import { parseQuotaFromDollars } from '@/lib/format'

import { RED_PACKET_VALIDATION } from '../constants'
import {
  RED_PACKET_CLAIM_MODE,
  RED_PACKET_DISTRIBUTION,
  RED_PACKET_TYPE,
  type CreateRedPacketPayload,
} from '../types'

// ============================================================================
// Form Schema (use getRedPacketFormSchema(t) in components for i18n messages)
// ============================================================================

export function getRedPacketFormSchema(t: TFunction) {
  return z
    .object({
      type: z.enum([RED_PACKET_TYPE.GIFT, RED_PACKET_TYPE.BALANCE]),
      claim_mode: z.enum([
        RED_PACKET_CLAIM_MODE.DIRECT,
        RED_PACKET_CLAIM_MODE.CODE,
      ]),
      distribution: z.enum([
        RED_PACKET_DISTRIBUTION.RANDOM,
        RED_PACKET_DISTRIBUTION.AVERAGE,
      ]),
      total_dollars: z.number().min(0, t('Please enter a valid amount')),
      share_count: z
        .number()
        .int()
        .min(RED_PACKET_VALIDATION.SHARE_COUNT_MIN)
        .max(RED_PACKET_VALIDATION.SHARE_COUNT_MAX),
      expire_days: z.number().int().min(0).max(RED_PACKET_VALIDATION.MAX_DAYS),
      gift_expire_days: z
        .number()
        .int()
        .min(0)
        .max(RED_PACKET_VALIDATION.MAX_DAYS),
      remark: z.string().max(RED_PACKET_VALIDATION.REMARK_MAX_LENGTH),
    })
    .refine(
      (values) =>
        parseQuotaFromDollars(values.total_dollars) >= values.share_count,
      {
        message: t('Total amount must cover at least one unit per share'),
        path: ['total_dollars'],
      }
    )
}

export type RedPacketFormValues = z.infer<
  ReturnType<typeof getRedPacketFormSchema>
>

// ============================================================================
// Form Defaults
// ============================================================================

export const RED_PACKET_FORM_DEFAULT_VALUES: RedPacketFormValues = {
  type: RED_PACKET_TYPE.GIFT,
  claim_mode: RED_PACKET_CLAIM_MODE.DIRECT,
  distribution: RED_PACKET_DISTRIBUTION.RANDOM,
  total_dollars: 10,
  share_count: 5,
  expire_days: 7,
  gift_expire_days: 30,
  remark: '',
}

// ============================================================================
// Form Data Transformation
// ============================================================================

export function transformRedPacketFormToPayload(
  values: RedPacketFormValues
): CreateRedPacketPayload {
  return {
    type: values.type,
    claim_mode: values.claim_mode,
    distribution: values.distribution,
    total_quota: parseQuotaFromDollars(values.total_dollars),
    share_count: values.share_count,
    expire_days: values.expire_days,
    gift_expire_days:
      values.type === RED_PACKET_TYPE.GIFT ? values.gift_expire_days : 0,
    remark: values.remark.trim(),
  }
}
