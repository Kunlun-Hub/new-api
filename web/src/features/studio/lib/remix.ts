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
import type { StudioGeneration, StudioGenerationKind } from './generations'

const STUDIO_REMIX_KEY = 'studio:remix-draft'

export type StudioRemixDraft = {
  kind: StudioGenerationKind
  prompt: string
  provider?: string
  schemaId?: string
  model?: string
  values?: Record<string, string>
}

/**
 * Carries a gallery work into the composer of its screen, mirroring the
 * reference one-click remix without navigating through the URL.
 */
export function saveStudioRemix(artwork: StudioGeneration) {
  const draft: StudioRemixDraft = {
    kind: artwork.kind,
    prompt: artwork.prompt,
    provider: artwork.provider,
    schemaId: artwork.schemaId,
    model: artwork.model,
    values: artwork.values,
  }
  try {
    window.sessionStorage.setItem(STUDIO_REMIX_KEY, JSON.stringify(draft))
  } catch {
    // Storage can be unavailable in private mode; the URL prompt still works.
  }
}

/** Reads and clears the draft saved for one screen. */
export function takeStudioRemix(kind: StudioGenerationKind) {
  try {
    const raw = window.sessionStorage.getItem(STUDIO_REMIX_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(STUDIO_REMIX_KEY)
    const draft = JSON.parse(raw) as StudioRemixDraft
    if (!draft || draft.kind !== kind || !draft.prompt) return null
    return draft
  } catch {
    return null
  }
}
