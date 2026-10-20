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
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { useSystemConfigStore } from '@/stores/system-config-store'

import { RED_PACKET_CLAIM_MODE, RED_PACKET_TYPE } from '../../types'
import {
  getRedPacketFormSchema,
  transformRedPacketFormToPayload,
  type RedPacketFormValues,
} from '../red-packet-form'

const t = ((key: string) => key) as unknown as TFunction
const previousConfig = useSystemConfigStore.getState().config

const baseValues: RedPacketFormValues = {
  type: RED_PACKET_TYPE.GIFT,
  claim_mode: RED_PACKET_CLAIM_MODE.DIRECT,
  distribution: 'random',
  total_dollars: 10,
  share_count: 5,
  expire_days: 7,
  gift_expire_days: 30,
  remark: '  team reward  ',
}

beforeEach(() => {
  useSystemConfigStore.getState().setConfig({
    currency: {
      displayInCurrency: true,
      quotaDisplayType: 'USD',
      quotaPerUnit: 500000,
      usdExchangeRate: 1,
      customCurrencySymbol: '¤',
      customCurrencyExchangeRate: 1,
    },
  })
})

afterEach(() => {
  useSystemConfigStore.getState().setConfig(previousConfig)
})

describe('transformRedPacketFormToPayload', () => {
  test('converts the entered amount to quota and keeps the gift credit window', () => {
    const payload = transformRedPacketFormToPayload(baseValues)

    expect(payload.total_quota).toBe(5_000_000)
    expect(payload.gift_expire_days).toBe(30)
    expect(payload.claim_mode).toBe(RED_PACKET_CLAIM_MODE.DIRECT)
    expect(payload.remark).toBe('team reward')
  })

  test('keeps the claim mode selected for the landing page', () => {
    const payload = transformRedPacketFormToPayload({
      ...baseValues,
      claim_mode: RED_PACKET_CLAIM_MODE.CODE,
    })

    expect(payload.claim_mode).toBe(RED_PACKET_CLAIM_MODE.CODE)
  })

  test('drops the gift credit window for balance packets', () => {
    const payload = transformRedPacketFormToPayload({
      ...baseValues,
      type: RED_PACKET_TYPE.BALANCE,
    })

    expect(payload.gift_expire_days).toBe(0)
  })
})

describe('getRedPacketFormSchema', () => {
  test('rejects a total that cannot cover every share', () => {
    const result = getRedPacketFormSchema(t).safeParse({
      ...baseValues,
      total_dollars: 0,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['total_dollars'])
  })

  test('rejects a share count above the server limit', () => {
    const result = getRedPacketFormSchema(t).safeParse({
      ...baseValues,
      share_count: 1001,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['share_count'])
  })
})
