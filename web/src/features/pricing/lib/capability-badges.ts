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
import { hasTaskUsageSchema } from './dynamic-price'

function normalizeItems(items?: readonly string[]): string[] {
  if (!items) return []
  return items.map((item) => item.toLowerCase())
}

function splitTags(tags?: string): string[] {
  if (!tags) return []
  return tags
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
}

function includesTag(
  tags: string[] | undefined,
  candidates: string[]
): boolean {
  if (!tags) return false
  return tags.some((tag) => candidates.includes(tag))
}

/** Compact context-length label, e.g. 1050000 -> "1M", 991000 -> "991K". */
export function formatContextLength(tokens?: number): string | null {
  if (!tokens || !Number.isFinite(tokens) || tokens <= 0) return null
  if (tokens >= 1_000_000) {
    return `${Math.round(tokens / 1_000_000)}M`
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`
  }
  return `${Math.round(tokens)}`
}

export interface CapabilityBadge {
  key: string
  labelKey: string
}

/**
 * Derive display badges from catalog capabilities, modalities and metadata
 * tags, mirroring the reference model square taxonomy.
 */
export function getCapabilityBadges(model: PricingModel): CapabilityBadge[] {
  const capabilities = normalizeItems(model.capabilities)
  const inputModalities = normalizeItems(model.input_modalities)
  const outputModalities = normalizeItems(model.output_modalities)
  const tags = splitTags(model.tags)

  const badges: CapabilityBadge[] = []
  if (
    capabilities.includes('web_search') ||
    includesTag(tags, ['联网', 'web search', 'search'])
  ) {
    badges.push({ key: 'web-search', labelKey: 'Web search' })
  }
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
    capabilities.includes('file_analysis') ||
    includesTag(tags, ['文件', 'files', 'file']) ||
    inputModalities.includes('file')
  ) {
    badges.push({ key: 'file-analysis', labelKey: 'File analysis' })
  }
  if (
    capabilities.includes('reasoning') ||
    includesTag(tags, ['推理', 'reasoning'])
  ) {
    badges.push({ key: 'deep-reasoning', labelKey: 'Deep reasoning' })
  }
  if (
    capabilities.includes('image_generation') ||
    outputModalities.includes('image')
  ) {
    badges.push({ key: 'image-generation', labelKey: 'Image generation' })
  }
  if (
    capabilities.includes('video_generation') ||
    outputModalities.includes('video')
  ) {
    badges.push({ key: 'video-generation', labelKey: 'Video generation' })
  }
  if (capabilities.includes('tts')) {
    badges.push({ key: 'text-to-speech', labelKey: 'Text to speech' })
  }
  if (capabilities.includes('async_task') || hasTaskUsageSchema(model)) {
    badges.push({ key: 'async-task', labelKey: 'Async task' })
  }
  return badges
}

const META_TAG_RULES: { key: string; labelKey: string; aliases: string[] }[] = [
  {
    key: 'generic-model',
    labelKey: 'Generic model',
    aliases: ['泛模型', 'generic model'],
  },
  {
    key: 'alias',
    labelKey: 'Alias',
    aliases: ['别名', 'alias'],
  },
  {
    key: 'reverse-engineered',
    labelKey: 'Reverse-engineered',
    aliases: ['逆向', 'reverse-engineered', 'reverse engineered'],
  },
  {
    key: 'deprecated',
    labelKey: 'Deprecated',
    aliases: ['弃用', 'deprecated'],
  },
]

/**
 * Status tags the reference model square renders next to the billing chip,
 * ahead of the capability chips (泛模型 / 别名 / 逆向 / 弃用).
 */
export function getMetaTagBadges(model: PricingModel): CapabilityBadge[] {
  const tags = splitTags(model.tags)
  return META_TAG_RULES.filter((rule) =>
    rule.aliases.some((alias) => tags.includes(alias))
  ).map((rule) => ({ key: rule.key, labelKey: rule.labelKey }))
}

/** Model square "NEW" flag: released within the last eight weeks. */
export function isNewModel(model: PricingModel, now = Date.now()): boolean {
  if (!model.release_date) return false
  const released = Date.parse(model.release_date)
  if (Number.isNaN(released)) return false
  const eightWeeks = 8 * 7 * 24 * 60 * 60 * 1000
  return now - released >= 0 && now - released <= eightWeeks
}
