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
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { getLobeIcon } from '@/lib/lobe-icon'

import {
  ENDPOINT_TYPES,
  FILTER_ALL,
  QUOTA_TYPES,
  getEndpointTypeLabels,
  getQuotaTypeLabels,
} from '../constants'
import { hasTaskUsageSchema } from '../lib/dynamic-price'
import { parseTags } from '../lib/filters'
import type { PricingModel, PricingVendor } from '../types'

export type FilterOption = {
  value: string
  label: string
  count?: number
  suffix?: string
  icon?: ReactNode
}

export interface PricingFilterOptionsInput {
  quotaTypeFilter: string
  endpointTypeFilter: string
  vendorFilter: string
  groupFilter: string
  tagFilter: string
  vendors: PricingVendor[]
  groups: string[]
  groupRatios?: Record<string, number>
  tags: string[]
  models: PricingModel[]
}

export interface PricingFilterOptions {
  vendorOptions: FilterOption[]
  groupOptions: FilterOption[]
  tagOptions: FilterOption[]
  quotaOptions: FilterOption[]
  endpointOptions: FilterOption[]
}

function formatGroupRatio(ratio: number | undefined): string | undefined {
  if (ratio == null) return undefined
  const formatted = Number.isInteger(ratio)
    ? ratio.toString()
    : ratio.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `x${formatted}`
}

export function usePricingFilterOptions(
  props: PricingFilterOptionsInput
): PricingFilterOptions {
  const { t } = useTranslation()

  const counts = useMemo(() => {
    const vendors = new Map<string, number>()
    const tags = new Map<string, number>()
    const endpoints = new Map<string, number>()
    const quotas = { token: 0, request: 0, task: 0 }
    for (const model of props.models) {
      if (model.vendor_name) {
        vendors.set(
          model.vendor_name,
          (vendors.get(model.vendor_name) ?? 0) + 1
        )
      }
      for (const tag of new Set(
        parseTags(model.tags).map((tag) => tag.toLowerCase())
      )) {
        tags.set(tag, (tags.get(tag) ?? 0) + 1)
      }
      for (const endpoint of new Set(model.supported_endpoint_types ?? [])) {
        endpoints.set(endpoint, (endpoints.get(endpoint) ?? 0) + 1)
      }
      if (hasTaskUsageSchema(model)) {
        quotas.task++
      } else if (model.quota_type === 0) {
        quotas.token++
      } else if (model.quota_type === 1) {
        quotas.request++
      }
    }
    return { vendors, tags, endpoints, quotas }
  }, [props.models])

  const quotaTypeLabels = getQuotaTypeLabels(t)
  const endpointTypeLabels = getEndpointTypeLabels(t)

  const vendorOptions = useMemo<FilterOption[]>(
    () => [
      {
        value: FILTER_ALL,
        label: t('All'),
        count: props.models.length,
      },
      ...props.vendors
        .map((vendor) => ({
          value: vendor.name,
          label: vendor.name,
          count: counts.vendors.get(vendor.name) ?? 0,
          icon: vendor.icon ? getLobeIcon(vendor.icon, 14) : undefined,
        }))
        .filter((vendor) => vendor.count > 0),
    ],
    [counts.vendors, props.models.length, props.vendors, t]
  )

  const groupOptions = useMemo<FilterOption[]>(
    () => [
      {
        value: FILTER_ALL,
        label: t('All'),
      },
      ...props.groups.map((group) => ({
        value: group,
        label: group,
        suffix: formatGroupRatio(props.groupRatios?.[group]),
      })),
    ],
    [props.groupRatios, props.groups, t]
  )

  const quotaOptions = useMemo<FilterOption[]>(
    () => [
      {
        value: QUOTA_TYPES.ALL,
        label: quotaTypeLabels[QUOTA_TYPES.ALL],
        count: props.models.length,
      },
      {
        value: QUOTA_TYPES.TOKEN,
        label: quotaTypeLabels[QUOTA_TYPES.TOKEN],
        count: counts.quotas.token,
      },
      {
        value: QUOTA_TYPES.REQUEST,
        label: quotaTypeLabels[QUOTA_TYPES.REQUEST],
        count: counts.quotas.request,
      },
      {
        value: QUOTA_TYPES.TASK,
        label: quotaTypeLabels[QUOTA_TYPES.TASK],
        count: counts.quotas.task,
      },
    ],
    [counts.quotas, props.models.length, quotaTypeLabels]
  )

  const tagOptions = useMemo<FilterOption[]>(
    () => [
      {
        value: FILTER_ALL,
        label: t('All'),
        count: props.models.length,
      },
      ...props.tags.map((tag) => ({
        value: tag,
        label: tag,
        count: counts.tags.get(tag.toLowerCase()) ?? 0,
      })),
    ],
    [counts.tags, props.models.length, props.tags, t]
  )

  const endpointOptions = useMemo<FilterOption[]>(
    () => [
      {
        value: ENDPOINT_TYPES.ALL,
        label: endpointTypeLabels[ENDPOINT_TYPES.ALL],
        count: props.models.length,
      },
      ...Object.entries(endpointTypeLabels)
        .filter(([value]) => value !== ENDPOINT_TYPES.ALL)
        .map(([value, label]) => ({
          value,
          label,
          count: counts.endpoints.get(value) ?? 0,
        })),
    ],
    [counts.endpoints, endpointTypeLabels, props.models.length]
  )

  return {
    vendorOptions,
    groupOptions,
    tagOptions,
    quotaOptions,
    endpointOptions,
  }
}
