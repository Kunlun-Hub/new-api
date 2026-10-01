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
import { FileText, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { MessageAttachment } from '@/features/playground/types'
import { cn } from '@/lib/utils'

type AttachmentChipProps = {
  attachment: MessageAttachment
  className?: string
  /** Renders the remove affordance; omit it for read-only chips. */
  onRemove?: () => void
}

/**
 * Attachment chip used by the studio composer and the message list. Image
 * attachments render as a square preview, every other file keeps the
 * horizontal icon layout with the file name.
 */
export function AttachmentChip(props: AttachmentChipProps) {
  const { t } = useTranslation()
  const { attachment } = props
  const uploading = attachment.status === 'uploading'
  const failed = attachment.status === 'error'
  const vertical = attachment.isImage && !failed

  let media = (
    <FileText className={vertical ? 'size-6' : 'size-4'} aria-hidden />
  )
  if (uploading) {
    media = <Spinner className={vertical ? 'size-6' : 'size-4'} />
  } else if (vertical) {
    media = (
      <img
        alt={attachment.name}
        className='size-full object-cover'
        src={attachment.url}
      />
    )
  }

  return (
    <div
      className={cn(
        'group/attachment bg-card text-card-foreground relative flex max-w-full shrink-0 rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring/50',
        vertical
          ? 'w-20 flex-col gap-2 p-2 text-sm'
          : 'min-w-40 items-center gap-2.5 p-1.5 px-2 text-xs',
        failed && 'border-destructive/30',
        props.className
      )}
      data-orientation={vertical ? 'vertical' : 'horizontal'}
      data-size={vertical ? 'default' : 'sm'}
      data-slot='attachment'
      data-state={attachment.status ?? 'done'}
    >
      <div
        className={cn(
          'bg-muted text-foreground relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg',
          vertical ? 'aspect-square w-full' : 'size-8',
          failed && 'bg-destructive/10 text-destructive',
          uploading && 'opacity-60'
        )}
        data-slot='attachment-media'
        data-variant={vertical ? 'image' : 'icon'}
      >
        {media}
      </div>

      {!vertical && (
        <div
          className='max-w-full min-w-0 flex-1'
          data-slot='attachment-content'
        >
          <span
            className={cn(
              'block max-w-full min-w-0 truncate font-medium',
              uploading && 'animate-pulse text-muted-foreground'
            )}
            data-slot='attachment-title'
            title={attachment.name}
          >
            {attachment.name}
          </span>
        </div>
      )}

      {props.onRemove && (
        <div
          className={cn(
            'z-20 flex shrink-0 items-center',
            vertical && 'absolute top-3 right-3'
          )}
          data-slot='attachment-actions'
        >
          <Button
            aria-label={t('Remove')}
            className='text-muted-foreground'
            data-size='icon-xs'
            data-slot='attachment-action'
            data-variant='ghost'
            onClick={props.onRemove}
            size='icon-xs'
            type='button'
            variant='ghost'
          >
            <X aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
