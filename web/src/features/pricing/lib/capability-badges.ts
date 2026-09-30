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
import type { PricingModel } from '../types'

function normalizeItems(items?: string[]): string[] {
  if (!items) return []
  return items.map((item) => item.toLowerCase())
}

/** Compact context-length label, e.g. 1048576 -> "1M", 512000 -> "500K". */
export function formatContextLength(tokens?: number): string | null {
  if (!tokens || !Number.isFinite(tokens) || tokens <= 0) return null
  if (tokens >= 1_000_000) {
    const v = tokens / 1_000_000
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    const v = tokens / 1_000
    return `${Number.isInteger(v) ? v : v.toFixed(1)}K`
  }
  return `${tokens}`
}

export interface CapabilityBadge {
  key: string
  labelKey: string
}

/** Derive display badges from catalog capabilities and modalities. */
export function getCapabilityBadges(model: PricingModel): CapabilityBadge[] {
  const capabilities = normalizeItems(model.capabilities)
  const inputModalities = normalizeItems(model.input_modalities)
  const outputModalities = normalizeItems(model.output_modalities)

  const badges: CapabilityBadge[] = []
  if (inputModalities.includes('text')) {
    badges.push({ key: 'text-chat', labelKey: 'Text chat' })
  }
  if (
    capabilities.includes('vision') ||
    inputModalities.includes('image') ||
    inputModalities.includes('video')
  ) {
    badges.push({ key: 'image-analysis', labelKey: 'Image analysis' })
  }
  if (
    outputModalities.includes('image') ||
    outputModalities.includes('video')
  ) {
    badges.push({ key: 'image-generation', labelKey: 'Image generation' })
  }
  if (capabilities.includes('reasoning')) {
    badges.push({ key: 'deep-reasoning', labelKey: 'Deep reasoning' })
  }
  if (capabilities.includes('web_search')) {
    badges.push({ key: 'web-search', labelKey: 'Web search' })
  }
  return badges
}
