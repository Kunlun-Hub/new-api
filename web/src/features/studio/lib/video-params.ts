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

/**
 * Video generation schemas mirrored from the reference studio.
 *
 * The reference site ships these schemas in the front end instead of loading
 * them from the pricing API, so the vendor/model catalog is identical for every
 * deployment. Values stay strings so switch/slider fields share one state type.
 */

export type StudioVideoValues = Record<string, string>

export type StudioVideoOption = {
  value: string
  label?: string
  /** Model filters: `kling-v3` includes, `!master` excludes. */
  models?: string[]
}

export type StudioVideoFieldType =
  | 'buttons'
  | 'select'
  | 'slider'
  | 'switch'
  | 'number'
  | 'textarea'
  | 'alert'

export type StudioVideoField = {
  name: string
  /** i18n key of the field label. */
  label: string
  type: StudioVideoFieldType
  default?: string
  options?: StudioVideoOption[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  description?: string
  /** Renders the muted `Billable item` suffix inside the label. */
  billable?: boolean
  section?: 'advanced'
  alertVariant?: 'info' | 'warning'
  /** Media field metadata; media fields render as composer chips. */
  media?: {
    kind: 'image' | 'video' | 'audio'
    multiple?: boolean
    min?: number
    max?: number
    accept?: string
  }
  /** Media fields marked as toolbar render inside the composer chip row. */
  toolbar?: boolean
  /** Requires a value before the request can be submitted. */
  required?: boolean
  /** Maps the field onto the request body key; defaults to snake_case. */
  submitKey?: string
  /** Overrides the request body value type; sliders/numbers are numeric. */
  submitType?: 'string' | 'boolean' | 'number'
  visible?: (values: StudioVideoValues, model: string) => boolean
}

export type StudioVideoSchema = {
  id: string
  vendor: string
  title: string
  models: { value: string; label: string }[]
  fields: StudioVideoField[]
  /** Image/avatar schemas accept an empty prompt. */
  promptOptional?: boolean
}

export type StudioVideoVendor = {
  id: string
  name: string
  schemas: StudioVideoSchema[]
}

const KLING_MODELS = [
  'kling-v3',
  'kling-v2-6',
  'kling-v2-5-turbo',
  'kling-v2-1-master',
  'kling-v2-master',
  'kling-v1-6',
  'kling-v1-5',
  'kling-v1',
].map((value) => ({ value, label: value }))

/** Models that accept the extended 3-15s duration list. */
const KLING_LONG_DURATION_MODELS = [
  'kling-video-o1',
  'kling-v2-6',
  'kling-v3',
  'kling-v3-turbo',
  'kling-v3-omni',
]

/** Models that accept 11-15s durations. */
const KLING_EXTENDED_DURATION_MODELS = [
  'kling-v3',
  'kling-v3-turbo',
  'kling-v3-omni',
]

function secondsOptions(values: number[]): StudioVideoOption[] {
  return values.map((value) => ({ value: String(value), label: `${value}s` }))
}

const KLING_DURATION: StudioVideoField = {
  name: 'duration',
  label: 'Duration',
  type: 'buttons',
  billable: true,
  default: '5',
  options: [
    ...secondsOptions([3, 4]).map((option) => ({
      ...option,
      models: [
        ...KLING_LONG_DURATION_MODELS,
        ...KLING_EXTENDED_DURATION_MODELS,
      ],
    })),
    ...secondsOptions([5]),
    ...secondsOptions([6, 7, 8, 9]).map((option) => ({
      ...option,
      models: [
        ...KLING_LONG_DURATION_MODELS,
        ...KLING_EXTENDED_DURATION_MODELS,
      ],
    })),
    ...secondsOptions([10]),
    ...secondsOptions([11, 12, 13, 14, 15]).map((option) => ({
      ...option,
      models: KLING_EXTENDED_DURATION_MODELS,
    })),
  ],
}

const KLING_MODE: StudioVideoField = {
  name: 'mode',
  label: 'Mode',
  type: 'buttons',
  billable: true,
  default: 'std',
  options: [
    { value: 'std', label: 'Standard', models: ['!master'] },
    { value: 'pro', label: 'High quality' },
    { value: '4k', label: 'High quality 4K', models: ['kling-v3'] },
  ],
}

const KLING_SOUND: StudioVideoField = {
  name: 'sound',
  label: 'Video sound',
  type: 'switch',
  billable: true,
  default: 'off',
  visible: (values, model) =>
    model === 'kling-v3' || (model === 'kling-v2-6' && values.mode === 'pro'),
}

const KLING_CREATIVITY: StudioVideoField = {
  name: 'cfgScale',
  label: 'Creativity',
  type: 'slider',
  default: '0.5',
  min: 0,
  max: 1,
  step: 0.01,
  section: 'advanced',
  description:
    'Higher values make the result follow the input prompt more closely',
  submitKey: 'cfg_scale',
}

const KLING_NEGATIVE_PROMPT: StudioVideoField = {
  name: 'negativePrompt',
  label: 'Negative prompt',
  type: 'textarea',
  section: 'advanced',
  placeholder: 'Describe objects, colors, or details to avoid',
  description: 'Guides the model away from the described content',
  submitKey: 'negative_prompt',
}

const KLING_RATIO: StudioVideoField = {
  name: 'aspectRatio',
  label: 'Aspect ratio',
  type: 'buttons',
  default: '9:16',
  options: ['1:1', '16:9', '9:16'].map((value) => ({ value, label: value })),
  submitKey: 'aspect_ratio',
}

const SEED_FIELD: StudioVideoField = {
  name: 'seed',
  label: 'Seed',
  type: 'number',
  min: 0,
  step: 1,
  placeholder: 'Random',
  section: 'advanced',
}

const RESOLUTION_FIELD: StudioVideoField = {
  name: 'resolution',
  label: 'Resolution',
  type: 'buttons',
  billable: true,
  default: '1080P',
  options: [
    { value: '720P', label: '720P' },
    { value: '1080P', label: '1080P' },
  ],
}

const VIDEO_DURATION_SLIDER: StudioVideoField = {
  name: 'duration',
  label: 'Video duration',
  type: 'slider',
  default: '5',
  min: 3,
  max: 15,
  step: 1,
  description: 'Unit: seconds, from 3 to 15 seconds; billable item',
}

const SEED_RANGE_FIELD: StudioVideoField = {
  name: 'seed',
  label: 'Seed',
  type: 'number',
  min: 0,
  max: 2147483647,
  step: 1,
  section: 'advanced',
  description: 'Random seed, from 0 to 2147483647',
}

const MEDIA_PLACEHOLDER_REQUIRED = 'Required'
const MEDIA_PLACEHOLDER_OPTIONAL = 'Optional'

const HAILUO_MODERN_MODELS: StudioVideoSchema['models'] = [
  { value: 'MiniMax-Hailuo-2.3', label: 'Hailuo 2.3' },
  { value: 'MiniMax-Hailuo-02', label: 'Hailuo 02' },
]

const HAILUO_IMAGE_MODELS: StudioVideoSchema['models'] = [
  { value: 'MiniMax-Hailuo-2.3', label: 'Hailuo 2.3' },
  { value: 'MiniMax-Hailuo-2.3-Fast', label: 'Hailuo 2.3 Fast' },
  { value: 'MiniMax-Hailuo-02', label: 'Hailuo 02' },
]

const HAILUO_H3_MODELS: StudioVideoSchema['models'] = [
  { value: 'MiniMax-H3', label: 'MiniMax H3' },
]

const HAILUO_DURATION: StudioVideoField = {
  name: 'duration',
  label: 'Duration',
  type: 'buttons',
  billable: true,
  default: '6',
  options: [
    { value: '6', label: '6s' },
    { value: '10', label: '10s' },
  ],
}

const HAILUO_H3_DURATION: StudioVideoField = {
  name: 'duration',
  label: 'Duration',
  type: 'slider',
  billable: true,
  default: '5',
  min: 4,
  max: 15,
  step: 1,
}

const HAILUO_RESOLUTION: StudioVideoField = {
  name: 'resolution',
  label: 'Resolution',
  type: 'buttons',
  default: '768P',
  options: [
    { value: '768P', label: '768P' },
    { value: '1080P', label: '1080P' },
    { value: '512P', label: '512P', models: ['MiniMax-Hailuo-02'] },
  ],
}

const HAILUO_H3_RESOLUTION: StudioVideoField = {
  name: 'resolution',
  label: 'Resolution',
  type: 'buttons',
  default: '768P',
  options: [
    { value: '768P', label: '768P' },
    { value: '2K', label: '2K' },
  ],
}

const HAILUO_RATIO: StudioVideoField = {
  name: 'ratio',
  label: 'Aspect ratio',
  type: 'buttons',
  default: '16:9',
  options: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'].map((value) => ({
    value,
    label: value,
  })),
}

const HAILUO_FIRST_FRAME: StudioVideoField = {
  name: 'firstFrameImage',
  label: 'Start frame',
  type: 'buttons',
  placeholder: MEDIA_PLACEHOLDER_OPTIONAL,
  media: { kind: 'image', max: 1 },
  toolbar: true,
  submitKey: 'first_frame_image',
}

const HAILUO_REQUIRED_FIRST_FRAME: StudioVideoField = {
  ...HAILUO_FIRST_FRAME,
  placeholder: MEDIA_PLACEHOLDER_REQUIRED,
  required: true,
}

const HAILUO_REFERENCE_VIDEO: StudioVideoField = {
  name: 'referenceVideo',
  label: 'Reference video',
  type: 'buttons',
  placeholder: 'Optional (up to 3 videos)',
  media: { kind: 'video', multiple: true, max: 3 },
  toolbar: true,
  submitKey: 'reference_video',
}

const HAILUO_REFERENCE_AUDIO: StudioVideoField = {
  name: 'referenceAudio',
  label: 'Reference audio',
  type: 'buttons',
  placeholder: 'Optional (up to 3 audio files)',
  media: { kind: 'audio', multiple: true, max: 3 },
  toolbar: true,
  submitKey: 'reference_audio',
}

export const STUDIO_VIDEO_VENDORS: StudioVideoVendor[] = [
  {
    id: 'kling',
    name: 'Kling',
    schemas: [
      {
        id: 'kling/text2video',
        vendor: 'kling',
        title: 'Text to video',
        models: KLING_MODELS,
        fields: [
          KLING_RATIO,
          KLING_DURATION,
          KLING_MODE,
          KLING_SOUND,
          KLING_CREATIVITY,
          KLING_NEGATIVE_PROMPT,
        ],
      },
      {
        id: 'kling/image2video',
        vendor: 'kling',
        title: 'Image to video',
        models: KLING_MODELS,
        promptOptional: true,
        fields: [
          {
            name: 'image',
            label: 'Start frame',
            type: 'buttons',
            placeholder: MEDIA_PLACEHOLDER_REQUIRED,
            media: { kind: 'image', max: 1 },
            toolbar: true,
            required: true,
          },
          {
            name: 'imageTail',
            label: 'End frame',
            type: 'buttons',
            placeholder: MEDIA_PLACEHOLDER_OPTIONAL,
            media: { kind: 'image', max: 1 },
            toolbar: true,
          },
          KLING_DURATION,
          KLING_MODE,
          KLING_SOUND,
          KLING_CREATIVITY,
          KLING_NEGATIVE_PROMPT,
        ],
      },
      {
        id: 'kling/avatar',
        vendor: 'kling',
        title: 'Digital avatar',
        models: [],
        promptOptional: true,
        fields: [
          {
            name: 'image',
            label: 'Reference image',
            type: 'buttons',
            placeholder: MEDIA_PLACEHOLDER_REQUIRED,
            media: { kind: 'image', max: 1 },
            toolbar: true,
            required: true,
          },
          {
            name: 'sound_file',
            label: 'Audio file',
            type: 'buttons',
            placeholder: 'Paste a URL or upload an .mp3, .wav, or .m4a file',
            media: { kind: 'audio', max: 1 },
            toolbar: true,
          },
          KLING_MODE,
        ],
      },
    ],
  },
  {
    id: 'vidu',
    name: 'Vidu',
    schemas: [
      {
        id: 'vidu/text2video',
        vendor: 'vidu',
        title: 'Text to video',
        models: ['viduq3-turbo', 'viduq3-pro'].map((value) => ({
          value,
          label: value,
        })),
        fields: [
          viduRatio(['9:16', '16:9', '3:4', '4:3', '1:1']),
          viduDuration(1),
          viduResolution('standard'),
          viduSound(),
          SEED_FIELD,
        ],
      },
      {
        id: 'vidu/img2video',
        vendor: 'vidu',
        title: 'Image to video',
        promptOptional: true,
        models: ['viduq3-turbo', 'viduq3-pro', 'viduq3-pro-fast'].map(
          (value) => ({ value, label: value })
        ),
        fields: [
          viduMedia('1 image', 1, 1),
          viduDuration(1),
          viduResolution('image'),
          viduSound(),
          SEED_FIELD,
        ],
      },
      {
        id: 'vidu/start-end2video',
        vendor: 'vidu',
        title: 'Start/end frame video',
        promptOptional: true,
        models: ['viduq3-turbo', 'viduq3-pro'].map((value) => ({
          value,
          label: value,
        })),
        fields: [
          viduMedia('2 images', 2, 2),
          viduDuration(1),
          viduResolution('standard'),
          viduSound(),
          SEED_FIELD,
        ],
      },
      {
        id: 'vidu/reference2video',
        vendor: 'vidu',
        title: 'Reference to video',
        models: ['viduq3-mix', 'viduq3-turbo', 'viduq3'].map((value) => ({
          value,
          label: value,
        })),
        fields: [
          viduMedia('Up to 7 images', 1, 7),
          viduRatio(['9:16', '16:9', '1:1']),
          viduDuration(3),
          viduResolution('reference'),
          viduSound(),
          SEED_FIELD,
        ],
      },
    ],
  },
  {
    id: 'jimeng',
    name: 'Dreamina',
    schemas: [
      {
        id: 'jimeng/text2video',
        vendor: 'jimeng',
        title: 'Text to video',
        models: [
          { value: 'jimeng_t2v_v30', label: 'V3.0 720P' },
          { value: 'jimeng_t2v_v30_1080p', label: 'V3.0 1080P' },
          { value: 'jimeng_ti2v_v30_pro', label: 'V3.0 1080P (Pro)' },
        ],
        fields: [
          {
            name: 'aspectRatio',
            label: 'Aspect ratio',
            type: 'buttons',
            default: '16:9',
            options: ['16:9', '4:3', '3:4', '1:1', '9:16', '21:9'].map(
              (value) => ({ value, label: value })
            ),
            submitKey: 'aspect_ratio',
          },
          jimengDuration(),
          SEED_FIELD,
        ],
      },
      {
        id: 'jimeng/image2video_first',
        vendor: 'jimeng',
        title: 'Start frame video',
        models: [
          { value: 'jimeng_i2v_first_v30', label: 'V3.0 720P' },
          { value: 'jimeng_i2v_first_v30_1080', label: 'V3.0 1080P' },
          { value: 'jimeng_ti2v_v30_pro', label: 'V3.0 1080P (Pro)' },
        ],
        fields: [
          jimengMedia('Start frame', 1, 1),
          jimengDuration(),
          SEED_FIELD,
        ],
      },
      {
        id: 'jimeng/image2video_tail',
        vendor: 'jimeng',
        title: 'Start/end frame video',
        models: [
          { value: 'jimeng_i2v_first_tail_v30', label: 'V3.0 720P' },
          { value: 'jimeng_i2v_first_tail_v30_1080', label: 'V3.0 1080P' },
        ],
        fields: [
          jimengMedia('Start and end frames', 2, 2),
          jimengDuration(),
          SEED_FIELD,
        ],
      },
    ],
  },
  {
    id: 'happyhorse',
    name: 'HappyHorse',
    schemas: [
      {
        id: 'happyhorse/text2video',
        vendor: 'happyhorse',
        title: 'Text to video',
        models: [
          { value: 'happyhorse-1.1-t2v', label: 'V1.1' },
          { value: 'happyhorse-1.0-t2v', label: 'V1.0' },
        ],
        fields: [
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          happyhorseRatio(),
        ],
      },
      {
        id: 'happyhorse/image2video',
        vendor: 'happyhorse',
        title: 'Start frame video',
        models: [
          { value: 'happyhorse-1.1-i2v', label: 'V1.1' },
          { value: 'happyhorse-1.0-i2v', label: 'V1.0' },
        ],
        fields: [
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          happyhorseRatio(),
          {
            name: 'url',
            label: 'Start frame',
            type: 'buttons',
            placeholder: MEDIA_PLACEHOLDER_REQUIRED,
            media: { kind: 'image', max: 1 },
            toolbar: true,
            required: true,
          },
        ],
      },
      {
        id: 'happyhorse/ref2video',
        vendor: 'happyhorse',
        title: 'Image to video',
        models: [
          { value: 'happyhorse-1.1-r2v', label: 'V1.1' },
          { value: 'happyhorse-1.0-r2v', label: 'V1.0' },
        ],
        fields: [
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          happyhorseRatio(),
          {
            name: 'url',
            label: 'Reference image',
            type: 'buttons',
            placeholder: 'Required (up to 6 images)',
            media: { kind: 'image', multiple: true, max: 6 },
            toolbar: true,
            required: true,
          },
        ],
      },
      {
        id: 'happyhorse/edit2video',
        vendor: 'happyhorse',
        title: 'Video editing',
        models: [{ value: 'happyhorse-1.0-video-edit', label: 'V1.0' }],
        fields: [
          editNotice('info'),
          soundControl(),
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          sourceVideoField(),
          referenceImageField(),
        ],
      },
    ],
  },
  {
    id: 'bailian',
    name: '阿里万相',
    schemas: [
      {
        id: 'wan/text2video',
        vendor: 'bailian',
        title: 'Text to video',
        models: [
          { value: 'wan2.7-t2v', label: 'V2.7' },
          { value: 'wan2.6-t2v', label: 'V2.6' },
        ],
        fields: [
          {
            name: 'promptExtend',
            label: 'Automatically enhance prompt',
            type: 'switch',
            default: 'on',
            submitKey: 'prompt_extend',
            submitType: 'boolean',
          },
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          wanRatio(),
          SEED_RANGE_FIELD,
          KLING_NEGATIVE_PROMPT,
          {
            name: 'audioUrl',
            label: 'Audio',
            type: 'buttons',
            placeholder: MEDIA_PLACEHOLDER_OPTIONAL,
            media: { kind: 'audio', max: 1, accept: '.wav,.mp3' },
            toolbar: true,
            submitKey: 'audio_url',
          },
        ],
      },
      {
        id: 'wan/image2video',
        vendor: 'bailian',
        title: 'Start frame video',
        models: [
          { value: 'wan2.7-i2v', label: 'V2.7' },
          { value: 'wan2.6-i2v', label: 'V2.6' },
        ],
        fields: [
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          wanRatio(),
          {
            name: 'url',
            label: 'Start frame',
            type: 'buttons',
            placeholder: MEDIA_PLACEHOLDER_REQUIRED,
            media: { kind: 'image', max: 1 },
            toolbar: true,
            required: true,
          },
        ],
      },
      {
        id: 'wan/ref2video',
        vendor: 'bailian',
        title: 'Image to video',
        models: [
          { value: 'wan2.7-r2v', label: 'V2.7' },
          { value: 'wan2.6-r2v', label: 'V2.6' },
        ],
        fields: [
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          wanRatio(),
          {
            name: 'url',
            label: 'Reference image',
            type: 'buttons',
            placeholder: 'Required (up to 6 images)',
            media: { kind: 'image', multiple: true, max: 6 },
            toolbar: true,
            required: true,
          },
        ],
      },
      {
        id: 'wan/edit2video',
        vendor: 'bailian',
        title: 'Video editing',
        models: [{ value: 'wan2.7-videoedit', label: 'V2.7' }],
        fields: [
          editNotice(),
          editRatio(),
          soundControl(),
          RESOLUTION_FIELD,
          VIDEO_DURATION_SLIDER,
          SEED_RANGE_FIELD,
          sourceVideoField(),
          KLING_NEGATIVE_PROMPT,
          referenceImageField(),
        ],
      },
    ],
  },
  {
    id: 'hailuo',
    name: 'Hailuo',
    schemas: [
      {
        id: 'hailuo/text2video',
        vendor: 'hailuo',
        title: 'Text to video',
        models: HAILUO_MODERN_MODELS,
        fields: [HAILUO_DURATION, HAILUO_RESOLUTION],
      },
      {
        id: 'hailuo/image2video',
        vendor: 'hailuo',
        title: 'Image to video',
        models: HAILUO_IMAGE_MODELS,
        promptOptional: true,
        fields: [
          HAILUO_REQUIRED_FIRST_FRAME,
          HAILUO_DURATION,
          HAILUO_RESOLUTION,
        ],
      },
      {
        id: 'hailuo/h3',
        vendor: 'hailuo',
        title: 'Multimodal video',
        models: HAILUO_H3_MODELS,
        fields: [
          HAILUO_FIRST_FRAME,
          HAILUO_REFERENCE_VIDEO,
          HAILUO_REFERENCE_AUDIO,
          HAILUO_RATIO,
          HAILUO_H3_RESOLUTION,
          HAILUO_H3_DURATION,
        ],
      },
    ],
  },
]

function viduRatio(options: string[]): StudioVideoField {
  return {
    name: 'aspectRatio',
    label: 'Aspect ratio',
    type: 'buttons',
    default: '9:16',
    options: options.map((value) => ({ value, label: value })),
    submitKey: 'aspect_ratio',
  }
}

function viduDuration(start: number): StudioVideoField {
  return {
    name: 'duration',
    label: 'Duration',
    type: 'select',
    default: '5',
    options: Array.from({ length: 16 - start + 1 }, (_, index) => {
      const value = String(start + index)
      return { value, label: `${value}s` }
    }),
  }
}

function viduResolution(
  kind: 'standard' | 'image' | 'reference'
): StudioVideoField {
  const options: StudioVideoOption[] = [
    { value: '540p', label: '540p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
  ]
  if (kind === 'image') {
    return {
      name: 'resolution',
      label: 'Resolution',
      type: 'buttons',
      default: '720p',
      options: options.map((option) =>
        option.value === '540p'
          ? { ...option, models: ['!viduq3-pro-fast'] }
          : option
      ),
    }
  }
  if (kind === 'reference') {
    return {
      name: 'resolution',
      label: 'Resolution',
      type: 'buttons',
      default: '720p',
      options: options.map((option) =>
        option.value === '540p'
          ? { ...option, models: ['!viduq3-mix'] }
          : option
      ),
    }
  }
  return {
    name: 'resolution',
    label: 'Resolution',
    type: 'buttons',
    default: '720p',
    options,
  }
}

function viduSound(): StudioVideoField {
  return {
    name: 'audio',
    label: 'Video sound',
    type: 'switch',
    default: 'on',
    section: 'advanced',
    submitType: 'boolean',
  }
}

function viduMedia(
  placeholder: string,
  min: number,
  max: number
): StudioVideoField {
  return {
    name: 'images',
    label: 'Reference image',
    type: 'buttons',
    placeholder,
    media: { kind: 'image', multiple: true, min, max },
    toolbar: true,
    required: true,
  }
}

function jimengDuration(): StudioVideoField {
  return {
    name: 'frames',
    label: 'Duration',
    type: 'buttons',
    default: '121',
    options: [
      { value: '121', label: '5s' },
      { value: '241', label: '10s' },
    ],
    submitKey: 'frames',
  }
}

function jimengMedia(
  label: string,
  min: number,
  max: number
): StudioVideoField {
  return {
    name: 'imageUrls',
    label,
    type: 'buttons',
    media: { kind: 'image', multiple: max > 1, min, max },
    toolbar: true,
    submitKey: 'image_urls',
    required: true,
  }
}

function happyhorseRatio(): StudioVideoField {
  return {
    name: 'ratio',
    label: 'Aspect ratio',
    type: 'buttons',
    default: '9:16',
    options: [
      '1:1',
      '4:3',
      '3:4',
      '4:5',
      '5:4',
      '16:9',
      '9:16',
      '21:9',
      '9:21',
    ].map((value) => ({ value, label: value })),
  }
}

function wanRatio(): StudioVideoField {
  return {
    name: 'ratio',
    label: 'Aspect ratio',
    type: 'buttons',
    default: '9:16',
    options: ['1:1', '4:3', '3:4', '16:9', '9:16'].map((value) => ({
      value,
      label: value,
    })),
  }
}

function soundControl(): StudioVideoField {
  return {
    name: 'audio_setting',
    label: 'Audio control',
    type: 'buttons',
    default: 'auto',
    options: [
      { value: 'auto', label: 'Auto generate' },
      { value: 'origin', label: 'Original video audio' },
    ],
  }
}

function sourceVideoField(): StudioVideoField {
  return {
    name: 'video',
    label: 'Source video',
    type: 'buttons',
    placeholder: 'Required (3–15 seconds)',
    media: { kind: 'video', max: 1 },
    toolbar: true,
    required: true,
  }
}

function referenceImageField(): StudioVideoField {
  return {
    name: 'image',
    label: 'Reference image',
    type: 'buttons',
    placeholder: MEDIA_PLACEHOLDER_OPTIONAL,
    media: { kind: 'image', max: 1 },
    toolbar: true,
  }
}

/** Aspect ratio of the video editing schemas; `auto` keeps the source ratio. */
function editRatio(): StudioVideoField {
  return {
    name: 'ratio',
    label: 'Aspect ratio',
    type: 'buttons',
    default: 'auto',
    options: [
      { value: 'auto', label: 'auto' },
      ...['1:1', '4:3', '3:4', '16:9', '9:16'].map((value) => ({
        value,
        label: value,
      })),
    ],
  }
}

function editNotice(variant: 'info' | 'warning' = 'warning'): StudioVideoField {
  return {
    name: 'edit_notice',
    label: 'Notice',
    type: 'alert',
    alertVariant: variant,
    description:
      'Billable duration is the total input and output video duration. At most 15 seconds of the input video are used; avoid oversized files.',
  }
}

export const RATIO_FIELD_NAMES = ['aspectRatio', 'ratio']

export const DEFAULT_VIDEO_SCHEMA = STUDIO_VIDEO_VENDORS[0].schemas[0]

export function videoVendorById(id: string): StudioVideoVendor {
  return (
    STUDIO_VIDEO_VENDORS.find((vendor) => vendor.id === id) ??
    STUDIO_VIDEO_VENDORS[0]
  )
}

/**
 * Keeps only vendors, schemas, and models that are enabled on at least one
 * channel. Falls back to the full catalog when nothing is available so the
 * composer stays usable while pricing is still loading.
 */
export function filterAvailableVideoVendors(
  vendors: StudioVideoVendor[],
  availableModels: Set<string>
): StudioVideoVendor[] {
  // An empty set means the pricing catalog has not loaded, so keep the full
  // catalog for a stable first paint. A loaded catalog without any matching
  // video model must stay empty: offering a channel-less vendor only fails on
  // submit.
  if (availableModels.size === 0) return vendors
  const result: StudioVideoVendor[] = []
  for (const vendor of vendors) {
    const schemas = vendor.schemas.flatMap((schema) => {
      const models = schema.models.filter((model) =>
        availableModels.has(model.value)
      )
      if (models.length === 0) return []
      return [{ ...schema, models }]
    })
    if (schemas.length > 0) result.push({ ...vendor, schemas })
  }
  return result
}

export function videoSchemaById(id: string): StudioVideoSchema | undefined {
  for (const vendor of STUDIO_VIDEO_VENDORS) {
    const schema = vendor.schemas.find((item) => item.id === id)
    if (schema) return schema
  }
  return undefined
}

export function findVideoVendorOfSchema(schema: StudioVideoSchema) {
  return videoVendorById(schema.vendor)
}

export function ratioFieldOf(
  schema: StudioVideoSchema
): StudioVideoField | undefined {
  return schema.fields.find((field) => RATIO_FIELD_NAMES.includes(field.name))
}

function optionMatchesModel(option: StudioVideoOption, model: string): boolean {
  if (!option.models || option.models.length === 0) return true
  let included = false
  let hasIncludeRule = false
  for (const rule of option.models) {
    const exclude = rule.startsWith('!')
    const fragment = exclude ? rule.slice(1) : rule
    if (!fragment) continue
    if (exclude) {
      if (model.includes(fragment)) return false
    } else {
      hasIncludeRule = true
      if (model.includes(fragment)) included = true
    }
  }
  return hasIncludeRule ? included : true
}

export function optionsForModel(
  options: StudioVideoOption[] | undefined,
  model: string
): StudioVideoOption[] {
  return (options ?? []).filter((option) => optionMatchesModel(option, model))
}

export function isVideoFieldVisible(
  field: StudioVideoField,
  values: StudioVideoValues,
  model: string
): boolean {
  if (field.type === 'alert') return true
  if (field.visible && !field.visible(values, model)) return false
  if (field.type === 'buttons' || field.type === 'select') {
    if (field.options && optionsForModel(field.options, model).length === 0) {
      return false
    }
  }
  return true
}

export function toolbarMediaFields(schema: StudioVideoSchema) {
  return schema.fields.filter((field) => Boolean(field.media) && field.toolbar)
}

export function panelFields(
  schema: StudioVideoSchema,
  values: StudioVideoValues,
  model: string
) {
  const toolbarNames = new Set(toolbarMediaFields(schema).map((f) => f.name))
  const ratioName = ratioFieldOf(schema)?.name
  return schema.fields.filter((field) => {
    if (field.media || toolbarNames.has(field.name)) return false
    if (ratioName === field.name) return false
    return isVideoFieldVisible(field, values, model)
  })
}

export function defaultVideoValues(
  schema: StudioVideoSchema
): StudioVideoValues {
  const values: StudioVideoValues = {}
  for (const field of schema.fields) {
    if (field.default !== undefined) values[field.name] = field.default
  }
  return values
}

/**
 * Keeps stored values valid for the selected model: unknown fields fall back to
 * their schema default and option values that the model does not support are
 * clamped to the first supported option.
 */
export function normalizeVideoValues(
  schema: StudioVideoSchema,
  model: string,
  values: StudioVideoValues
): StudioVideoValues {
  const normalized: StudioVideoValues = {}
  for (const field of schema.fields) {
    const isMedia = Boolean(field.media) || field.type === 'alert'
    const stored = values[field.name]
    if (isMedia && stored !== undefined) normalized[field.name] = stored
    if (isMedia) continue
    const current = stored ?? field.default ?? ''
    const isChoice = field.type === 'buttons' || field.type === 'select'
    if (isChoice && field.options) {
      const options = optionsForModel(field.options, model)
      if (options.length === 0) continue
      const supported = options.some((option) => option.value === current)
      normalized[field.name] = supported ? current : options[0].value
      continue
    }
    normalized[field.name] = current
  }
  return normalized
}

function camelToSnake(value: string): string {
  return value.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function numericField(field: StudioVideoField) {
  return field.type === 'slider' || field.type === 'number'
}

export type StudioVideoMediaValue = {
  id: string
  field: string
  kind: 'image' | 'video' | 'audio'
  value: string
  name?: string
}

/**
 * Builds the OpenAI video request body. Text parameters ride in `metadata` so
 * the task plugins can forward vendor specific keys upstream; the first image
 * is also promoted to `image` so image-to-video plugins pick it up.
 */
export function buildVideoRequest(
  schema: StudioVideoSchema,
  model: string,
  values: StudioVideoValues,
  prompt: string,
  media: StudioVideoMediaValue[]
): Record<string, unknown> {
  const body: Record<string, unknown> = { prompt }
  const metadata: Record<string, unknown> = {}
  for (const field of schema.fields) {
    if (field.type === 'alert') continue
    if (field.media) {
      if (!field.submitKey) continue
      const fieldMedia = media.filter((item) => item.field === field.name)
      if (fieldMedia.length === 0) continue
      metadata[field.submitKey] = field.media.multiple
        ? fieldMedia.map((item) => item.value)
        : fieldMedia[0].value
      continue
    }
    if (!isVideoFieldVisible(field, values, model)) continue
    const raw = values[field.name]
    if (raw === undefined || raw === '') continue
    const key = field.submitKey ?? camelToSnake(field.name)
    if (field.submitType === 'boolean') {
      metadata[key] = raw === 'on'
    } else if (field.submitType === 'number' || numericField(field)) {
      metadata[key] = Number(raw)
    } else {
      metadata[key] = raw
    }
  }

  const images = media.filter((item) => item.kind === 'image')
  const videos = media.filter((item) => item.kind === 'video')
  const audios = media.filter((item) => item.kind === 'audio')
  if (images.length > 0) {
    body.image = images[0].value
    metadata.image = images[0].value
    if (images.length > 1) metadata.images = images.map((item) => item.value)
  }
  if (videos.length > 0) metadata.video = videos[0].value
  if (audios.length > 0) metadata.audio_url = audios[0].value

  body.metadata = metadata
  return body
}
