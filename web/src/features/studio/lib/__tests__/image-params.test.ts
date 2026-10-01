import { describe, expect, it } from 'vitest'

import {
  DEFAULT_STUDIO_IMAGE_VALUES,
  buildMidjourneyPrompt,
  midjourneyEndpoint,
} from '../image-params'

describe('buildMidjourneyPrompt', () => {
  it('keeps default values out of the prompt', () => {
    expect(buildMidjourneyPrompt('a cat', DEFAULT_STUDIO_IMAGE_VALUES)).toBe(
      'a cat'
    )
  })

  it('appends flags only for changed values', () => {
    const prompt = buildMidjourneyPrompt('a cat', {
      ...DEFAULT_STUDIO_IMAGE_VALUES,
      aspectRatio: '16:9',
      version: '6.1',
      quality: '2',
      stylize: 500,
      chaos: 30,
      weird: 100,
      sref: 'https://example.com/a.png',
      cref: 'https://example.com/b.png',
      cw: 50,
      oref: 'https://example.com/c.png',
    })

    expect(prompt).toBe(
      'a cat --ar 16:9 --v 6.1 --q 2 --s 500 --c 30 --weird 100 ' +
        '--sref https://example.com/a.png --cref https://example.com/b.png --cw 50 ' +
        '--oref https://example.com/c.png'
    )
  })

  it('uses the niji flag for niji versions', () => {
    expect(
      buildMidjourneyPrompt('a cat', {
        ...DEFAULT_STUDIO_IMAGE_VALUES,
        version: 'niji6',
      })
    ).toBe('a cat --niji 6')
  })

  it('prepends prompt modifiers and lets artistic intensity win over stylize', () => {
    expect(
      buildMidjourneyPrompt('a cat', {
        ...DEFAULT_STUDIO_IMAGE_VALUES,
        style: 'Cyberpunk',
        view: 'Aerial view',
        stylize: 800,
        art: '--s 250',
      })
    ).toBe('a cat Cyberpunk, Aerial view --s 250')
  })

  it('trims the prompt and drops the flag block when nothing changed', () => {
    expect(
      buildMidjourneyPrompt('  a cat  ', DEFAULT_STUDIO_IMAGE_VALUES)
    ).toBe('a cat')
  })
})

describe('midjourneyEndpoint', () => {
  it('routes relax and turbo jobs to the mode specific endpoints', () => {
    expect(midjourneyEndpoint('fast', '/mj/submit/imagine')).toBe(
      '/mj/submit/imagine'
    )
    expect(midjourneyEndpoint('relax', '/mj/submit/imagine')).toBe(
      '/mj-relax/mj/submit/imagine'
    )
    expect(midjourneyEndpoint('turbo', '/mj/submit/imagine')).toBe(
      '/mj-turbo/mj/submit/imagine'
    )
  })
})
