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
import { ArrowUp } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

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

import {
  optionsForModel,
  ratioFieldOf,
  toolbarMediaFields,
  type StudioVideoMediaValue,
  type StudioVideoSchema,
  type StudioVideoValues,
  type StudioVideoVendor,
} from '../lib/video-params'
import { StudioImageTokenSelect } from './studio-image-token-select'
import { StudioRatioSelect } from './studio-ratio-select'
import { StudioVideoCommandSelect } from './studio-video-command-select'
import { StudioVideoMediaInput } from './studio-video-media-input'
import { StudioVideoParameters } from './studio-video-parameters'

const MAX_TEXTAREA_HEIGHT = 200

type StudioVideoInputProps = {
  greeting?: ReactNode
  chips: string[]
  initialPrompt?: string
  vendors: StudioVideoVendor[]
  schema: StudioVideoSchema
  model: string
  values: StudioVideoValues
  media: StudioVideoMediaValue[]
  tokens: ApiKey[]
  tokenId: number | null
  tokensLoading?: boolean
  submitting?: boolean
  disabled?: boolean
  canResetValues: boolean
  onVendorChange: (vendorId: string) => void
  onSchemaChange: (schemaId: string) => void
  onModelChange: (model: string) => void
  onChange: (name: string, value: string) => void
  onResetValues: () => void
  onMediaChange: (media: StudioVideoMediaValue[]) => void
  onTokenChange: (id: number) => void
  onTokenRefresh: () => void
  onSubmit: (prompt: string, media: StudioVideoMediaValue[]) => void
  /** Renders only the composer so a gallery can pin it above its content. */
  floating?: boolean
  /** Replaces the prompt whenever `key` changes (gallery "use same style"). */
  promptSeed?: { text: string; key: number }
  children?: ReactNode
}

/** Video prompt composer that mirrors the upstream studio layout. */
export function StudioVideoInput(props: StudioVideoInputProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState(props.initialPrompt ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const busy = Boolean(props.submitting)
  const canSubmit =
    (props.schema.promptOptional || prompt.trim().length > 0) &&
    !busy &&
    !props.disabled

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

  const submit = () => {
    if (!canSubmit) return
    props.onSubmit(prompt.trim(), props.media)
    setPrompt('')
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

  const ratioField = ratioFieldOf(props.schema)
  const ratioOptions = ratioField
    ? optionsForModel(ratioField.options, props.model).map(
        (option) => option.value
      )
    : []
  const mediaFields = toolbarMediaFields(props.schema)

  const composer = (
    <TooltipProvider delay={300}>
      <InputGroup className='border-border/80 bg-background/85 supports-backdrop-filter:bg-background/75 has-disabled:bg-background/85 rounded-2xl shadow-2xl/5 backdrop-blur-md transition-colors has-disabled:opacity-100'>
        <InputGroupTextarea
          className='thin-scrollbar max-h-50 min-h-16 px-4 pt-4 text-sm'
          disabled={props.disabled}
          id='studio-video-prompt'
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('Describe the video you want to generate...')}
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
                <StudioVideoCommandSelect
                  disabled={props.disabled}
                  onChange={props.onVendorChange}
                  options={props.vendors.map((vendor) => ({
                    value: vendor.id,
                    label: t(vendor.name),
                  }))}
                  placeholder={t('Select provider')}
                  value={props.schema.vendor}
                />

                <StudioVideoCommandSelect
                  contentClassName='min-w-52'
                  disabled={props.disabled}
                  emptyText={t('No results found')}
                  onChange={props.onSchemaChange}
                  options={
                    props.vendors
                      .find((vendor) => vendor.id === props.schema.vendor)
                      ?.schemas.map((schema) => ({
                        value: schema.id,
                        label: t(schema.title),
                      })) ?? []
                  }
                  placeholder={t('Select mode')}
                  value={props.schema.id}
                  valueClassName='max-w-28'
                />

                {props.schema.models.length > 0 ? (
                  <StudioVideoCommandSelect
                    contentClassName='min-w-56'
                    disabled={props.disabled}
                    onChange={props.onModelChange}
                    options={props.schema.models}
                    placeholder={t('Select model')}
                    showSearch
                    value={props.model}
                    valueClassName='max-w-36'
                  />
                ) : null}

                {ratioField && ratioOptions.length > 0 ? (
                  <>
                    <Separator
                      className='bg-border/60 mx-0.5 h-4 self-center'
                      orientation='vertical'
                    />
                    <StudioRatioSelect
                      disabled={props.disabled}
                      onChange={(value) =>
                        props.onChange(ratioField.name, value)
                      }
                      options={ratioOptions}
                      value={props.values[ratioField.name] ?? ''}
                    />
                  </>
                ) : null}

                <StudioVideoMediaInput
                  disabled={props.disabled}
                  fields={mediaFields}
                  media={props.media}
                  onChange={props.onMediaChange}
                />

                <StudioVideoParameters
                  canReset={props.canResetValues}
                  disabled={props.disabled}
                  model={props.model}
                  onChange={props.onChange}
                  onReset={props.onResetValues}
                  schema={props.schema}
                  values={props.values}
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
    </TooltipProvider>
  )

  if (props.floating) {
    return composer
  }

  return (
    <div className='flex flex-1 flex-col items-center justify-center px-4'>
      <div className='w-full max-w-3xl'>
        {props.greeting}

        {composer}

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
