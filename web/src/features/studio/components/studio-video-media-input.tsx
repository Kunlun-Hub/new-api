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
import { FileAudio, FileVideo, ImagePlus, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useRef, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { InputGroupButton } from '@/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type {
  StudioVideoField,
  StudioVideoMediaValue,
} from '../lib/video-params'

const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_UPLOAD_BYTES = 64 * 1024 * 1024

type StudioVideoMediaInputProps = {
  fields: StudioVideoField[]
  media: StudioVideoMediaValue[]
  disabled?: boolean
  onChange: (media: StudioVideoMediaValue[]) => void
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () =>
      reject(new Error('Failed to read the selected file'))
    )
    reader.readAsDataURL(file)
  })
}

function acceptOf(field: StudioVideoField, kind: string): string {
  if (field.media?.accept) return field.media.accept
  if (kind === 'video') return 'video/*'
  if (kind === 'audio') return 'audio/*'
  return 'image/*'
}

function iconFor(kind: string) {
  if (kind === 'video') return FileVideo
  if (kind === 'audio') return FileAudio
  return ImagePlus
}

/** Media (image/video/audio) chips of the studio video composer toolbar. */
export function StudioVideoMediaInput(props: StudioVideoMediaInputProps) {
  const { t } = useTranslation()
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const itemsOf = (field: string) =>
    props.media.filter((item) => item.field === field)

  const handleFiles = async (field: StudioVideoField, files: File[]) => {
    const kind = field.media?.kind ?? 'image'
    const limit =
      kind === 'video' ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES
    const existing = itemsOf(field.name)
    const max = field.media?.max ?? 1
    const accepted: StudioVideoMediaValue[] = []
    for (const file of files) {
      if (existing.length + accepted.length >= max) break
      if (file.size > limit) {
        toast.error(
          t('"{{name}}" exceeds {{size}} MB and was skipped.', {
            name: file.name,
            size: Math.round(limit / (1024 * 1024)),
          })
        )
        continue
      }
      accepted.push({
        id: nanoid(),
        field: field.name,
        kind,
        value: await readFileAsDataUrl(file),
        name: file.name,
      })
    }
    if (accepted.length > 0) props.onChange([...props.media, ...accepted])
  }

  const handleChange =
    (field: StudioVideoField) => (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? [...event.target.files] : []
      event.target.value = ''
      if (files.length > 0) void handleFiles(field, files)
    }

  const remove = (id: string) => {
    props.onChange(props.media.filter((item) => item.id !== id))
  }

  return (
    <>
      {props.fields.map((field) => {
        const kind = field.media?.kind ?? 'image'
        const items = itemsOf(field.name)
        const max = field.media?.max ?? 1
        const Icon = iconFor(kind)
        const canAdd = items.length < max
        const label = t(field.label)

        return (
          <div className='flex items-center gap-0.5' key={field.name}>
            {items.map((item) => {
              return (
                <div className='group relative' key={item.id}>
                  {kind === 'image' ? (
                    <button
                      aria-label={label}
                      className='border-border/60 size-8 overflow-hidden rounded-lg border'
                      onClick={() => inputs.current[field.name]?.click()}
                      title={item.name ?? item.value}
                      type='button'
                    >
                      <img
                        alt=''
                        className='size-full object-cover'
                        src={item.value}
                      />
                    </button>
                  ) : (
                    <InputGroupButton
                      aria-label={label}
                      className='text-primary'
                      onClick={() => inputs.current[field.name]?.click()}
                      size='icon-sm'
                      title={item.name ?? item.value}
                    >
                      <Icon className='size-4' />
                    </InputGroupButton>
                  )}
                  <button
                    aria-label={t('Remove')}
                    className='bg-background/80 text-muted-foreground hover:text-foreground absolute -top-1 -right-1 hidden rounded-full p-0.5 group-hover:block'
                    onClick={() => remove(item.id)}
                    type='button'
                  >
                    <X className='size-3' />
                  </button>
                </div>
              )
            })}

            {canAdd ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      aria-label={label}
                      className='text-muted-foreground'
                      disabled={props.disabled}
                      onClick={() => inputs.current[field.name]?.click()}
                      size='icon-sm'
                    />
                  }
                >
                  <Icon className='size-4' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {field.placeholder
                      ? `${label} · ${t(field.placeholder)}`
                      : label}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : null}

            <input
              accept={acceptOf(field, kind)}
              className='hidden'
              multiple={max > 1}
              onChange={handleChange(field)}
              ref={(element) => {
                inputs.current[field.name] = element
              }}
              type='file'
            />
          </div>
        )
      })}
    </>
  )
}
