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
import { midjourneyEndpoint, type StudioImageValues } from './image-params'

/** One action button returned by the Midjourney task fetch endpoint. */
export type StudioMjButton = {
  customId: string
  label: string
  emoji?: string
}

/** Custom ids the studio labels itself, mirroring the upstream button set. */
const MJ_ACTION_LABELS: [string, string][] = [
  ['::reroll::', 'Reroll'],
  ['::high_variation::', 'Strong variation'],
  ['::low_variation::', 'Subtle variation'],
  ['::Outpaint::50', 'Zoom out 2x'],
  ['::Outpaint::75', 'Zoom out 1.5x'],
  ['::pan_left', '← Pan left'],
  ['::pan_right', '→ Pan right'],
  ['::pan_up', '↑ Pan up'],
  ['::pan_down', '↓ Pan down'],
  ['::upsample_v6_2x_subtle', 'Upscale (subtle)'],
  ['::upsample_v6_2x_creative', 'Upscale (creative)'],
  ['::upsample_v5_2x', 'Upscale 2x'],
  ['::upsample_v5_4x', 'Upscale 4x'],
  ['::CustomZoom::', 'Custom zoom'],
  ['::make_square::', 'Make square'],
]

/** Normalizes the raw upstream buttons of a Midjourney task. */
export function normalizeMjButtons(buttons: unknown): StudioMjButton[] {
  if (!Array.isArray(buttons)) return []
  const list: StudioMjButton[] = []
  for (const item of buttons) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    const customId = typeof raw.customId === 'string' ? raw.customId : ''
    if (!customId) continue
    list.push({
      customId,
      label: typeof raw.label === 'string' ? raw.label : '',
      emoji: typeof raw.emoji === 'string' ? raw.emoji : undefined,
    })
  }
  return list
}

/** Drops bookmark and inpaint buttons, which the studio does not surface. */
export function mjUsableButtons(buttons: StudioMjButton[]): StudioMjButton[] {
  return buttons.filter(
    (button) =>
      !button.customId.includes('BOOKMARK') &&
      !button.customId.includes('::Inpaint::')
  )
}

/** U1-U4 / V1-V4 quick actions shown on the artwork card and in the viewer. */
export function mjQuickButtons(buttons: StudioMjButton[]): StudioMjButton[] {
  return buttons.filter((button) => /^[UV][1-4]$/.test(button.label))
}

export function isMjCustomZoom(button: StudioMjButton): boolean {
  return button.customId.includes('::CustomZoom::')
}

/** i18n key of a button label; U/V keep their raw upstream label. */
export function mjButtonLabelKey(button: StudioMjButton): string {
  if (/^[UV][1-4]$/.test(button.label)) return button.label
  const known = MJ_ACTION_LABELS.find(([id]) => button.customId.includes(id))
  return known?.[1] ?? (button.label || button.emoji || button.customId)
}

/** Submit endpoint of an action, honouring the artwork's fast/relax/turbo mode. */
export function mjSubmitPath(
  values: StudioImageValues | undefined,
  path: string
): string {
  return midjourneyEndpoint(values?.mode ?? 'fast', path)
}
