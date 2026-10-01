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
import type {
  StudioShareArtwork,
  StudioShareItem,
  StudioShareParam,
  StudioShareStatus,
} from '../discover/types'
import type { StudioGeneration, StudioGenerationParam } from './generations'

/** Submitted works keep the reference site's IndexedDB id prefix. */
export const STUDIO_SHARE_ID_PREFIX = 'studio-share-'

export function studioShareArtworkId(shareId: number) {
  return `${STUDIO_SHARE_ID_PREFIX}${shareId}`
}

/** Favorites of shared works live in the same store as local artworks. */
export function isSharedArtwork(item: StudioGeneration) {
  return item.sourceShareId !== undefined
}

function scalarParams(
  params?: Record<string, StudioGenerationParam>
): Record<string, StudioShareParam> {
  const out: Record<string, StudioShareParam> = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === 'string' || typeof value === 'number') {
      out[key] = value
    }
  }
  return out
}

function stringValues(values?: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(values ?? {})) {
    out[key] = String(value)
  }
  return out
}

/** Builds the payload of `POST /api/studio/share` from an artwork record. */
export function serializeStudioShareArtwork(
  item: StudioGeneration
): StudioShareArtwork {
  if (item.status !== 'done' || !item.url) {
    throw new Error('Only finished artworks can be shared')
  }
  return {
    kind: item.kind,
    status: 'done',
    url: item.url,
    width: item.width ?? 0,
    height: item.height ?? 0,
    prompt: item.prompt,
    model: item.model,
    ...(item.provider ? { provider: item.provider } : {}),
    ...(item.schemaId ? { schemaId: item.schemaId } : {}),
    params: scalarParams(item.params),
    values: stringValues(item.values),
    createdAt: item.createdAt,
  }
}

/** Renders one gallery item with the artwork card of the studio screens. */
export function studioShareToArtwork(
  share: StudioShareItem,
  favorite: boolean
): StudioGeneration {
  const artwork = share.data
  return {
    id: studioShareArtworkId(share.id),
    kind: share.kind,
    status: 'done',
    url: artwork.url,
    width: artwork.width > 0 ? artwork.width : 1,
    height: artwork.height > 0 ? artwork.height : 1,
    prompt: artwork.prompt,
    model: artwork.model,
    provider: artwork.provider,
    schemaId: artwork.schemaId,
    params: scalarParams(artwork.params),
    values: stringValues(artwork.values),
    favorite,
    sourceShareId: share.id,
    createdAt: share.published_at || share.created_at,
  }
}

export type StudioShareCapabilities = {
  canDelete: boolean
  canReview: boolean
  canRemix: boolean
  canFavorite: boolean
}

/**
 * Mirrors the reference capability matrix: authors manage their own
 * submissions, everybody else may remix and favorite published works.
 */
export function studioShareCapabilities(
  scope: 'mine' | 'discover',
  isOwner: boolean,
  status: StudioShareStatus
): StudioShareCapabilities {
  const approved = status === 2
  return {
    canDelete: scope === 'mine' || isOwner,
    canReview: scope === 'discover' && isOwner && status === 1,
    canRemix: scope === 'mine' || approved,
    canFavorite: scope === 'discover' && approved,
  }
}
