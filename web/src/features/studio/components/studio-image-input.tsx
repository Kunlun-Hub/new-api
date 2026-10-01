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
import { ArrowUp, ImagePlus, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ApiKey } from '@/features/keys/types'
import { cn } from '@/lib/utils'

import type { StudioImageValues } from '../lib/image-params'
import {
  StudioImageModelSelect,
  type StudioImageProvider,
} from './studio-image-model-select'
import { StudioImageParameters } from './studio-image-parameters'
import { StudioImageTokenSelect } from './studio-image-token-select'
import { StudioImageVersionSelect } from './studio-image-version-select'
import { StudioRatioSelect } from './studio-ratio-select'

const MAX_TEXTAREA_HEIGHT = 200
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

type StudioImageInputProps = {
  greeting?: ReactNode
  chips: string[]
  initialPrompt?: string
  providers: StudioImageProvider[]
  provider: string
  versionOptions: { value: string; label: string }[]
  version: string
  ratios: string[]
  ratio: string
  tokens: ApiKey[]
  tokenId: number | null
  tokensLoading?: boolean
  values: StudioImageValues
  submitting?: boolean
  disabled?: boolean
  onProviderChange: (value: string) => void
  onVersionChange: (value: string) => void
  onRatioChange: (value: string) => void
  onTokenChange: (id: number) => void
  onTokenRefresh: () => void
  onValuesChange: <K extends keyof StudioImageValues>(
    key: K,
    value: StudioImageValues[K]
  ) => void
  onResetValues: () => void
  onUploadReference?: (file: File) => Promise<string>
  onSubmit: (prompt: string, images: string[]) => void
  /** Renders only the composer so a gallery can pin it above its content. */
  floating?: boolean
  /** Replaces the prompt whenever `key` changes (gallery "use same style"). */
  promptSeed?: { text: string; key: number }
  /** Adds reference images whenever `key` changes (gallery "edit" / "use same style"). */
  referenceSeed?: { urls: string[]; key: number }
  children?: ReactNode
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

/** Image prompt composer that mirrors the upstream studio layout. */
export function StudioImageInput(props: StudioImageInputProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState(props.initialPrompt ?? '')
  const [images, setImages] = useState<{ id: string; url: string }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const busy = Boolean(props.submitting)
  const canSubmit = prompt.trim().length > 0 && !busy && !props.disabled

  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [resizeTextarea, prompt])

  useEffect(() => {
    if (props.initialPrompt) setPrompt(props.initialPrompt)
  }, [props.initialPrompt])

  const promptSeedKey = props.promptSeed?.key
  useEffect(() => {
    if (props.promptSeed) setPrompt(props.promptSeed.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptSeedKey])

  const referenceSeedKey = props.referenceSeed?.key
  useEffect(() => {
    const seed = props.referenceSeed
    if (!seed) return
    setImages(
      seed.urls.map((url, index) => ({ id: `seed-${seed.key}-${index}`, url }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceSeedKey])

  const submit = () => {
    if (!canSubmit) return
    props.onSubmit(
      prompt.trim(),
      images.map((image) => image.url)
    )
    setPrompt('')
    setImages([])
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      const target = event.currentTarget
      const start = Math.max(0, Math.min(target.selectionStart, prompt.length))
      const end = Math.max(start, Math.min(target.selectionEnd, prompt.length))
      setPrompt(`${prompt.slice(0, start)}\n${prompt.slice(end)}`)
      requestAnimationFrame(() => {
        target.setSelectionRange(start + 1, start + 1)
        resizeTextarea()
      })
      return
    }

    if (!event.shiftKey && !event.altKey) {
      event.preventDefault()
      submit()
    }
  }

  const addFiles = useCallback(
    async (files: File[]) => {
      const accepted: { id: string; url: string }[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(t('Only images can be attached'))
          continue
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(
            t('"{{name}}" exceeds {{size}} MB and was skipped.', {
              name: file.name,
              size: 20,
            })
          )
          continue
        }
        accepted.push({
          id: nanoid(),
          url: await readFileAsDataUrl(file),
        })
      }
      if (accepted.length > 0) {
        setImages((current) => [...current, ...accepted])
      }
    },
    [t]
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : []
    event.target.value = ''
    if (files.length > 0) void addFiles(files)
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = event.clipboardData?.files
    if (!files || files.length === 0) return
    event.preventDefault()
    void addFiles([...files])
  }

  const composer = (
    <InputGroup className='border-border/80 bg-background/85 supports-backdrop-filter:bg-background/75 has-disabled:bg-background/85 rounded-2xl shadow-2xl/5 backdrop-blur-md transition-colors has-disabled:opacity-100'>
      {images.length > 0 && (
        <InputGroupAddon align='block-start'>
          <div className='flex w-full flex-wrap gap-2'>
            {images.map((image) => (
              <div
                className='border-border/60 bg-muted/40 relative size-20 overflow-hidden rounded-lg border'
                key={image.id}
              >
                <img
                  alt=''
                  className='size-full object-cover'
                  src={image.url}
                />
                <button
                  aria-label={t('Remove')}
                  className='bg-background/80 text-muted-foreground hover:text-foreground absolute top-1 right-1 rounded-full p-0.5'
                  onClick={() =>
                    setImages((current) =>
                      current.filter((item) => item.id !== image.id)
                    )
                  }
                  type='button'
                >
                  <X className='size-3' />
                </button>
              </div>
            ))}
          </div>
        </InputGroupAddon>
      )}

      <InputGroupTextarea
        className='thin-scrollbar max-h-50 min-h-16 px-4 pt-4 text-sm'
        disabled={props.disabled}
        id='studio-image-prompt'
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={t('Describe the image you want to generate...')}
        ref={textareaRef}
        rows={1}
        value={prompt}
      />

      <InputGroupAddon
        align='block-end'
        className='min-w-0 justify-between gap-x-2 md:gap-x-8'
      >
        <div className='thin-scrollbar min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 md:overflow-visible md:pb-0'>
          <div className='flex w-max min-w-full items-center gap-1'>
            <div className='flex grow items-center gap-0.5'>
              <StudioImageModelSelect
                disabled={props.disabled}
                onChange={props.onProviderChange}
                providers={props.providers}
                value={props.provider}
              />

              <StudioImageVersionSelect
                disabled={props.disabled}
                onChange={props.onVersionChange}
                options={props.versionOptions}
                value={props.version}
              />

              <Separator
                className='bg-border/60 mx-0.5 h-4 self-center'
                orientation='vertical'
              />

              <StudioRatioSelect
                disabled={props.disabled}
                onChange={props.onRatioChange}
                options={props.ratios}
                value={props.ratio}
              />

              <StudioImageParameters
                disabled={props.disabled}
                onChange={props.onValuesChange}
                onReset={props.onResetValues}
                onUploadReference={props.onUploadReference}
                values={props.values}
              />

              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      aria-label={t('Source / reference image')}
                      className='text-muted-foreground'
                      disabled={props.disabled}
                      onClick={() => fileInputRef.current?.click()}
                      size='icon-sm'
                    />
                  }
                >
                  <ImagePlus className='size-4' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('Source / reference image')}</p>
                </TooltipContent>
              </Tooltip>
              <input
                accept='image/*'
                className='hidden'
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                type='file'
              />

              <StudioImageTokenSelect
                disabled={props.disabled}
                loading={props.tokensLoading}
                onChange={props.onTokenChange}
                onRefresh={props.onTokenRefresh}
                tokens={props.tokens}
                value={props.tokenId}
              />
            </div>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                aria-disabled={!canSubmit}
                aria-label={t('Send')}
                className={cn(
                  'rounded-full',
                  !canSubmit && 'pointer-events-none opacity-40'
                )}
                onClick={submit}
                size='icon-sm'
                variant='default'
              />
            }
          >
            <ArrowUp className='size-4.5' />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('Send')}</p>
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  )

  if (props.floating) {
    return <TooltipProvider delay={300}>{composer}</TooltipProvider>
  }

  return (
    <div className='flex flex-1 flex-col items-center justify-center px-4'>
      <div className='w-full max-w-3xl'>
        {props.greeting}

        <TooltipProvider delay={300}>{composer}</TooltipProvider>

        <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
          {props.chips.map((chip) => (
            <Button
              className='border-border/60 text-muted-foreground h-8 gap-1 rounded-full px-2.5 font-normal'
              key={chip}
              onClick={() => setPrompt(t(chip))}
              size='sm'
              variant='outline'
            >
              {t(chip)}
            </Button>
          ))}
        </div>

        {props.children}
      </div>
    </div>
  )
}
