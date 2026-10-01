import { describe, expect, it } from 'vitest'

import { DEFAULT_STUDIO_IMAGE_VALUES } from '../image-params'
import {
  isMjCustomZoom,
  mjButtonLabelKey,
  mjQuickButtons,
  mjSubmitPath,
  mjUsableButtons,
  normalizeMjButtons,
} from '../mj-actions'

const button = (customId: string, label = '', emoji = '') => ({
  customId,
  label,
  emoji,
})

const jobButtons = [
  button('MJ::JOB::upsample::1::hash', 'U1'),
  button('MJ::JOB::variation::2::hash', 'V2'),
  button('MJ::BOOKMARK::hash', '❤️', '❤️'),
  button('MJ::Inpaint::hash', 'Inpaint'),
  button('MJ::JOB::reroll::0::hash'),
  button('MJ::CustomZoom::hash'),
]

describe('normalizeMjButtons', () => {
  it('keeps custom ids and drops malformed entries', () => {
    expect(
      normalizeMjButtons([
        { customId: 'MJ::JOB::reroll::0::hash', label: 'Reroll' },
        { label: 'no id' },
        null,
        'nope',
        { customId: 5 },
      ])
    ).toEqual([
      {
        customId: 'MJ::JOB::reroll::0::hash',
        label: 'Reroll',
        emoji: undefined,
      },
    ])
  })

  it('returns an empty list for non-arrays', () => {
    expect(normalizeMjButtons(undefined)).toEqual([])
    expect(normalizeMjButtons('MJ::JOB')).toEqual([])
  })
})

describe('mjUsableButtons', () => {
  it('drops bookmark and inpaint buttons', () => {
    const ids = mjUsableButtons(normalizeMjButtons(jobButtons)).map(
      (item) => item.customId
    )
    expect(ids).toEqual([
      'MJ::JOB::upsample::1::hash',
      'MJ::JOB::variation::2::hash',
      'MJ::JOB::reroll::0::hash',
      'MJ::CustomZoom::hash',
    ])
  })
})

describe('mjQuickButtons', () => {
  it('keeps U1-U4 and V1-V4 only', () => {
    const labels = mjQuickButtons(normalizeMjButtons(jobButtons)).map(
      (item) => item.label
    )
    expect(labels).toEqual(['U1', 'V2'])
  })

  it('ignores labels that are not part of the quick grid', () => {
    expect(
      mjQuickButtons(
        normalizeMjButtons([button('MJ::JOB::upsample::5::h', 'U5')])
      )
    ).toEqual([])
  })
})

describe('mjButtonLabelKey', () => {
  it('keeps the upstream label for U and V buttons', () => {
    expect(mjButtonLabelKey(button('MJ::JOB::upsample::3::hash', 'U3'))).toBe(
      'U3'
    )
  })

  it('maps known custom ids to their studio labels', () => {
    expect(mjButtonLabelKey(button('MJ::JOB::reroll::0::hash'))).toBe('Reroll')
    expect(mjButtonLabelKey(button('MJ::Outpaint::50::hash'))).toBe(
      'Zoom out 2x'
    )
    expect(mjButtonLabelKey(button('MJ::pan_up::hash'))).toBe('↑ Pan up')
    expect(mjButtonLabelKey(button('MJ::JOB::upsample_v5_4x::hash'))).toBe(
      'Upscale 4x'
    )
    expect(mjButtonLabelKey(button('MJ::CustomZoom::hash'))).toBe('Custom zoom')
  })

  it('falls back to the label, emoji, then custom id', () => {
    expect(mjButtonLabelKey(button('MJ::unknown::hash', 'Weird'))).toBe('Weird')
    expect(mjButtonLabelKey(button('MJ::unknown::hash', '', '🔀'))).toBe('🔀')
    expect(mjButtonLabelKey(button('MJ::unknown::hash'))).toBe(
      'MJ::unknown::hash'
    )
  })
})

describe('isMjCustomZoom', () => {
  it('detects the custom zoom button', () => {
    expect(isMjCustomZoom(button('MJ::CustomZoom::hash'))).toBe(true)
    expect(isMjCustomZoom(button('MJ::JOB::reroll::0::hash'))).toBe(false)
  })
})

describe('mjSubmitPath', () => {
  it('keeps the default endpoint for fast mode', () => {
    expect(
      mjSubmitPath({ ...DEFAULT_STUDIO_IMAGE_VALUES }, '/mj/submit/action')
    ).toBe('/mj/submit/action')
    expect(mjSubmitPath(undefined, '/mj/submit/action')).toBe(
      '/mj/submit/action'
    )
  })

  it('uses the relax and turbo prefixes', () => {
    expect(
      mjSubmitPath(
        { ...DEFAULT_STUDIO_IMAGE_VALUES, mode: 'relax' },
        '/mj/submit/action'
      )
    ).toBe('/mj-relax/mj/submit/action')
    expect(
      mjSubmitPath(
        { ...DEFAULT_STUDIO_IMAGE_VALUES, mode: 'turbo' },
        '/mj/submit/modal'
      )
    ).toBe('/mj-turbo/mj/submit/modal')
  })
})
