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
import { ArrowUp, Eraser, Paperclip, Plus, Square } from 'lucide-react'
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

import { AttachmentChip } from '@/components/attachment-chip'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  GroupOption,
  MessageAttachment,
  ModelOption,
  PlaygroundConfig,
} from '@/features/playground/types'
import { cn } from '@/lib/utils'

import type { StudioModelCatalog } from '../hooks/use-studio-model-catalog'
import { STUDIO_UPLOAD_MAX_BYTES, uploadStudioFile } from '../lib/studio-upload'
import { StudioChatGroupSelect } from './studio-chat-group-select'
import { StudioChatModelSelect } from './studio-chat-model-select'
import { StudioChatParameters } from './studio-chat-parameters'
import { StudioChatReasoningSelect } from './studio-chat-reasoning-select'

const MAX_TEXTAREA_HEIGHT = 240

type StudioChatInputProps = {
  config: PlaygroundConfig
  /** Headline rendered above the composer while the conversation is empty. */
  greeting?: ReactNode
  models: ModelOption[]
  groups: GroupOption[]
  catalog?: StudioModelCatalog
  isGenerating?: boolean
  hasMessages?: boolean
  disabled?: boolean
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onSubmit: (text: string, attachments: MessageAttachment[]) => void
  onStop: () => void
  onClearContext: () => void
  onNewTopic: () => void
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

/** Chat composer that mirrors the upstream studio layout. */
export function StudioChatInput(props: StudioChatInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const modelInfo = props.catalog?.get(props.config.model)
  const canUpload = Boolean(
    modelInfo &&
    (modelInfo.capabilities.includes('vision') ||
      modelInfo.inputModalities.includes('image'))
  )
  const canReason = Boolean(modelInfo?.capabilities.includes('reasoning'))
  const busy = Boolean(props.isGenerating)
  const empty = !props.hasMessages
  const uploading = attachments.some(
    (attachment) => attachment.status === 'uploading'
  )
  const canSend =
    (text.trim().length > 0 ||
      attachments.some((attachment) => attachment.status === 'done')) &&
    !busy &&
    !uploading

  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [resizeTextarea, text])

  const submit = () => {
    if (!canSend) return
    props.onSubmit(
      text.trim(),
      attachments.filter(
        (attachment) => attachment.status !== 'uploading' && attachment.url
      )
    )
    setText('')
    setAttachments([])
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      const target = event.currentTarget
      const start = Math.max(0, Math.min(target.selectionStart, text.length))
      const end = Math.max(start, Math.min(target.selectionEnd, text.length))
      const next = `${text.slice(0, start)}\n${text.slice(end)}`
      setText(next)
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
      const accepted = files.filter((file) => {
        if (file.size > STUDIO_UPLOAD_MAX_BYTES) {
          toast.error(
            t('"{{name}}" exceeds {{size}} MB and was skipped.', {
              name: file.name,
              size: 20,
            })
          )
          return false
        }
        return true
      })
      if (accepted.length === 0) return

      const pending = accepted.map((file) => ({
        id: nanoid(),
        name: file.name || t('File'),
        url: '',
        isImage: file.type.startsWith('image/'),
        status: 'uploading' as const,
      }))
      setAttachments((current) => [...current, ...pending])

      await Promise.all(
        accepted.map(async (file, index) => {
          const placeholder = pending[index]
          let url = ''
          let isImage = file.type.startsWith('image/')
          let name = placeholder.name
          try {
            const uploaded = await uploadStudioFile(file, 'studio_chat')
            url = uploaded.url
            isImage = uploaded.contentType.startsWith('image/')
            name = uploaded.name || name
          } catch {
            // Keep images usable when the gateway cannot store the file.
            if (file.type.startsWith('image/')) {
              url = await readFileAsDataUrl(file).catch(() => '')
            }
            if (!url) {
              toast.error(t('Upload failed. Please try again.'))
            }
          }
          setAttachments((current) =>
            current.map((attachment) =>
              attachment.id === placeholder.id
                ? {
                    ...attachment,
                    url,
                    name,
                    isImage,
                    status: url ? 'done' : 'error',
                  }
                : attachment
            )
          )
        })
      )
    },
    [t]
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : []
    event.target.value = ''
    if (files.length > 0) void addFiles(files)
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canUpload) return
    const files = event.clipboardData?.files
    if (!files || files.length === 0) return
    event.preventDefault()
    void addFiles([...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  const uploadTooltip = canUpload
    ? t('Upload images or files')
    : t('The current model does not support uploads')

  const composer = (
    <InputGroup
      className={cn(
        'border-border/80 rounded-2xl shadow-2xl/5 transition-colors',
        isDragging && 'border-primary/50 bg-primary/3'
      )}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        if (!canUpload) return
        event.preventDefault()
        setIsDragging(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        if (!canUpload) return
        const files = event.dataTransfer?.files
        if (files && files.length > 0) void addFiles([...files])
      }}
    >
      {attachments.length > 0 && (
        <InputGroupAddon align='block-start'>
          <div className='flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain py-1'>
            {attachments.map((attachment, index) => (
              <AttachmentChip
                attachment={attachment}
                key={attachment.id}
                onRemove={() => removeAttachment(index)}
              />
            ))}
          </div>
        </InputGroupAddon>
      )}

      <InputGroupTextarea
        className='thin-scrollbar max-h-60 min-h-20 px-4 pt-4 text-sm'
        disabled={props.disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={t('Ask anything...')}
        ref={textareaRef}
        rows={1}
        value={text}
      />

      <InputGroupAddon
        align='block-end'
        className='min-w-0 justify-between gap-x-2'
      >
        <div className='thin-scrollbar flex min-w-0 flex-1 touch-pan-x items-center gap-0.5 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 md:overflow-visible md:pb-0'>
          {!empty && (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      aria-label={t('New chat')}
                      className='text-muted-foreground'
                      onClick={props.onNewTopic}
                      size='icon-sm'
                    />
                  }
                >
                  <Plus className='size-4' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('New chat')}</p>
                </TooltipContent>
              </Tooltip>
              <span className='bg-border mx-0.5 h-4 w-px shrink-0' />
            </>
          )}

          <StudioChatModelSelect
            catalog={props.catalog}
            models={props.models}
            onChange={(value) => props.onConfigChange('model', value)}
            value={props.config.model}
          />

          <span className='bg-border mx-0.5 h-4 w-px shrink-0' />

          <StudioChatParameters
            config={props.config}
            disabled={props.disabled}
            onConfigChange={props.onConfigChange}
          />

          {canReason && (
            <StudioChatReasoningSelect
              disabled={props.disabled}
              model={props.config.model}
              onChange={(value) =>
                props.onConfigChange('reasoning_effort', value)
              }
              value={props.config.reasoning_effort}
            />
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <InputGroupButton
                  aria-disabled={!canUpload}
                  aria-label={uploadTooltip}
                  className={cn(
                    'text-muted-foreground',
                    !canUpload && 'pointer-events-none',
                    !canUpload && 'opacity-40'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  size='icon-sm'
                />
              }
            >
              <Paperclip className='size-4' />
            </TooltipTrigger>
            <TooltipContent>
              <p>{uploadTooltip}</p>
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

          {!empty && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    aria-label={t('Clear context')}
                    className='text-muted-foreground'
                    onClick={props.onClearContext}
                    size='icon-sm'
                  />
                }
              >
                <Eraser className='size-4' />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Clear context')}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <StudioChatGroupSelect
            className='ml-auto'
            disabled={props.disabled}
            groups={props.groups}
            onChange={(value) => props.onConfigChange('group', value)}
            value={props.config.group}
          />
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              busy ? (
                <InputGroupButton
                  aria-label={t('Stop generating')}
                  className='rounded-full'
                  onClick={props.onStop}
                  size='icon-sm'
                  variant='default'
                />
              ) : (
                <InputGroupButton
                  aria-disabled={!canSend}
                  aria-label={t('Send')}
                  className={cn(
                    'rounded-full',
                    !canSend && 'pointer-events-none opacity-40'
                  )}
                  onClick={submit}
                  size='icon-sm'
                  variant='default'
                />
              )
            }
          >
            {busy ? (
              <Square className='size-3.5 fill-current' />
            ) : (
              <ArrowUp className='size-4.5' />
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>{busy ? t('Stop generating') : t('Send')}</p>
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  )

  const composerBlock = (
    <div className='px-4 md:pb-3'>
      <div className='relative mx-auto max-w-3xl'>
        <TooltipProvider delay={300}>{composer}</TooltipProvider>
      </div>
    </div>
  )

  if (props.hasMessages) return composerBlock

  return (
    <div className='flex flex-1 flex-col items-center justify-center md:px-4'>
      <div className='w-full max-w-3xl'>
        {props.greeting}
        {composerBlock}
      </div>
    </div>
  )
}
