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

export type StudioImageMode = 'fast' | 'relax' | 'turbo'

/** Midjourney imagine values mirrored from the reference studio image page. */
export type StudioImageValues = {
  mode: StudioImageMode
  aspectRatio: string
  version: string
  quality: string
  stylize: number
  chaos: number
  weird: number
  style: string
  view: string
  shot: string
  light: string
  art: string
  sref: string
  cref: string
  oref: string
  cw: number
}

export const DEFAULT_STUDIO_IMAGE_VALUES: StudioImageValues = {
  mode: 'fast',
  aspectRatio: '1:1',
  version: '7',
  quality: '1',
  stylize: 100,
  chaos: 0,
  weird: 0,
  style: '',
  view: '',
  shot: '',
  light: '',
  art: '',
  sref: '',
  cref: '',
  oref: '',
  cw: 0,
}

type StudioImageOption = { value: string; label: string }

export const MJ_MODES: StudioImageOption[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'relax', label: 'Relax' },
  { value: 'turbo', label: 'Turbo' },
]

export const MJ_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16']

export const MJ_VERSIONS: StudioImageOption[] = [
  { value: '7', label: 'MJ V7' },
  { value: '6.1', label: 'MJ V6.1' },
  { value: '6', label: 'MJ V6' },
  { value: '5.2', label: 'MJ V5.2' },
  { value: '5.1', label: 'MJ V5.1' },
  { value: 'niji6', label: 'Niji 6 (Anime)' },
  { value: 'niji5', label: 'Niji 5 (Anime)' },
  { value: 'niji4', label: 'Niji 4 (Anime)' },
]

export const MJ_QUALITIES: StudioImageOption[] = [
  { value: '.25', label: 'Basic (.25)' },
  { value: '.5', label: 'Clear (.5)' },
  { value: '1', label: 'High (1)' },
  { value: '2', label: 'Ultra (2)' },
]

export const MJ_STYLE_PRESETS: StudioImageOption[] = [
  { value: 'Warframe', label: 'Warframe' },
  { value: 'Cyberpunk', label: 'Cyberpunk' },
  { value: 'Ink Wash Painting Style', label: 'Ink wash' },
  { value: 'oil painting', label: 'Oil painting' },
  { value: 'pixel art', label: 'Pixel art' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'Ukiyo-e', label: 'Ukiyo-e' },
  { value: 'Studio Ghibli style', label: 'Ghibli' },
  { value: 'ACGN', label: 'Anime' },
  { value: 'Japanese comics/manga', label: 'Manga' },
  { value: 'Original', label: 'Original' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'Manga', label: 'Comics' },
  { value: 'modern organic', label: 'Modern organic' },
  { value: 'Genesis', label: 'Genesis' },
  { value: 'posterstyle', label: 'Poster style' },
  { value: 'surrealism', label: 'Surrealism' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'realism', label: 'Realism' },
  { value: 'Watercolor painting', label: 'Watercolor' },
  { value: 'Cubism', label: 'Cubism' },
  { value: 'black and white', label: 'Black and white' },
  { value: 'fm photography', label: 'Film photography' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'clear facial features', label: 'Clear facial features' },
]

export const MJ_VIEWPOINTS: StudioImageOption[] = [
  { value: 'Aerial view', label: 'Aerial view' },
  { value: 'Top view', label: 'Top view' },
  { value: 'Upview', label: 'Low-angle view' },
  { value: 'Front view', label: 'Front view' },
  { value: 'Side view', label: 'Side view' },
  { value: 'Back view', label: 'Back view' },
  { value: 'Isometric view', label: 'Isometric view' },
  { value: 'Wide view', label: 'Wide view' },
  { value: 'Ultrawideshot', label: 'Ultra-wide shot' },
  { value: 'Headshot', label: 'Headshot' },
  { value: 'Medium Shot(MS)', label: 'Medium shot' },
  { value: 'Long Shot(LS)', label: 'Long shot' },
  { value: 'depth of field(dof)', label: 'Depth of field' },
]

export const MJ_FRAMINGS: StudioImageOption[] = [
  { value: 'Face Shot(VCU)', label: 'Face shot' },
  { value: 'Big Close-Up(BCU)', label: 'Extreme close-up' },
  { value: 'Close-Up(CU)', label: 'Close-up' },
  { value: 'Waist Shot(WS)', label: 'Waist shot' },
  { value: 'Knee Shot(KS)', label: 'Knee shot' },
  { value: 'half-body shot', label: 'Half-body shot' },
  { value: 'Full Length Shot(FLS)', label: 'Full-length shot' },
  { value: 'Extra Long Shot(ELS)', label: 'Extreme long shot' },
  { value: 'wide-angle shot', label: 'Wide-angle shot' },
]

export const MJ_LIGHTINGS: StudioImageOption[] = [
  { value: 'Natural light', label: 'Natural light' },
  { value: 'Cold light', label: 'Cool light' },
  { value: 'Warm light', label: 'Warm light' },
  { value: 'hard lighting', label: 'Hard light' },
  { value: 'soft light', label: 'Soft light' },
  { value: 'Dramatic light', label: 'Dramatic light' },
  { value: 'reflection light', label: 'Reflected light' },
  { value: 'Misty foggy', label: 'Mist' },
  { value: 'Sun light', label: 'Sunlight' },
  { value: 'golden hour', label: 'Golden hour' },
  { value: 'neon light', label: 'Neon light' },
  { value: 'cinematic lighting', label: 'Cinematic lighting' },
  { value: 'moody', label: 'Moody' },
]

export const MJ_STYLIZATION_PRESETS: StudioImageOption[] = [
  { value: '--s 50', label: 'Low stylization' },
  { value: '--s 100', label: 'Medium stylization' },
  { value: '--s 250', label: 'High stylization' },
  { value: '--s 750', label: 'Very high stylization' },
]

/**
 * Builds the Midjourney prompt exactly like the reference studio: prompt
 * modifiers are appended as plain text, and flags are only emitted when the
 * value differs from the schema default.
 */
export function buildMidjourneyPrompt(
  prompt: string,
  values: StudioImageValues
): string {
  const changed = <K extends keyof StudioImageValues>(key: K) => {
    const value = values[key]
    return (
      value !== undefined &&
      value !== '' &&
      value !== DEFAULT_STUDIO_IMAGE_VALUES[key]
    )
  }

  const parts = [prompt.trim()]

  const modifiers = [
    values.style,
    values.view,
    values.shot,
    values.light,
  ].filter(Boolean)
  if (modifiers.length > 0) parts.push(modifiers.join(', '))

  const flags: string[] = []
  if (changed('aspectRatio')) flags.push(`--ar ${values.aspectRatio}`)
  if (changed('version')) {
    const version = String(values.version)
    flags.push(
      version.startsWith('niji')
        ? `--niji ${version.slice(4)}`
        : `--v ${version}`
    )
  }
  if (changed('quality')) flags.push(`--q ${values.quality}`)
  if (values.art) {
    flags.push(values.art)
  } else if (changed('stylize')) {
    flags.push(`--s ${values.stylize}`)
  }
  if (changed('chaos')) flags.push(`--c ${values.chaos}`)
  if (changed('weird')) flags.push(`--weird ${values.weird}`)
  if (values.sref) flags.push(`--sref ${values.sref}`)
  if (values.cref) {
    flags.push(`--cref ${values.cref}`)
    if (changed('cw')) flags.push(`--cw ${values.cw}`)
  }
  if (values.oref) flags.push(`--oref ${values.oref}`)

  if (flags.length > 0) parts.push(flags.join(' '))

  return parts.filter(Boolean).join(' ')
}

/** Relax and Turbo jobs run on dedicated upstream routes. */
export function midjourneyEndpoint(mode: string, endpoint: string): string {
  return mode === 'relax' || mode === 'turbo'
    ? `/mj-${mode}${endpoint}`
    : endpoint
}
