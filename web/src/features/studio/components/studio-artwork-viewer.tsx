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
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Heart,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toIntlLocale } from '@/i18n/languages'
import { formatTimestampRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useArtworkMediaSrc } from '../hooks/use-artwork-media'
import type { StudioGeneration } from '../lib/generations'
import type { StudioMjButton } from '../lib/mj-actions'
import { StudioArtworkOperations } from './studio-artwork-operations'

type StudioArtworkViewerProps = {
  item: StudioGeneration
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onFavorite?: () => void
  onDownload: () => void
  onDelete?: () => void
  onRegenerate?: () => void
  onUseSameStyle?: () => void
  onShare?: () => void
  shareDisabled?: boolean
  /** Runs a Midjourney action button, e.g. U/V, reroll or a custom zoom. */
  onMjOp?: (button: StudioMjButton, options?: { zoom?: number }) => void
  /** Review state shown next to the model name, e.g. of a submission. */
  badge?: ReactNode
}

/** Full screen artwork viewer used by the studio galleries. */
export function StudioArtworkViewer(props: StudioArtworkViewerProps) {
  const { t, i18n } = useTranslation()
  const { item } = props
  const src = useArtworkMediaSrc(item)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose()
      if (event.key === 'ArrowUp') props.onPrev()
      if (event.key === 'ArrowDown') props.onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props])

  const params = Object.entries(item.params ?? {})
  const timeAgo = formatTimestampRelative(
    item.createdAt,
    'milliseconds',
    toIntlLocale(i18n.language)
  )

  return (
    <div className='bg-background fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden md:flex-row'>
      <div
        className='bg-background/95 relative flex h-[44dvh] w-full shrink-0 cursor-zoom-out items-center justify-center px-3 py-6 backdrop-blur-lg md:h-auto md:min-w-0 md:flex-1 md:p-10'
        onClick={props.onClose}
      >
        <Button
          aria-label={t('Back')}
          className='border-border/60 bg-background/80 absolute top-3 left-3 size-11 rounded-full backdrop-blur-sm md:top-4 md:left-4 md:size-8'
          onClick={(event) => {
            event.stopPropagation()
            props.onClose()
          }}
          size='icon'
          variant='outline'
        >
          <ArrowLeft className='size-4' />
        </Button>
        <Button
          aria-label={t('Close')}
          className='border-border/60 bg-background/80 absolute top-4 right-4 hidden size-8 rounded-full backdrop-blur-sm md:inline-flex'
          onClick={(event) => {
            event.stopPropagation()
            props.onClose()
          }}
          size='icon'
          variant='outline'
        >
          <X className='size-4' />
        </Button>
        <div className='absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between md:inset-x-auto md:right-4 md:flex-col md:justify-start md:gap-2.5'>
          <Button
            aria-label={t('Previous artwork')}
            className='border-border/60 bg-background/80 size-11 rounded-full backdrop-blur-sm'
            disabled={!props.hasPrev}
            onClick={(event) => {
              event.stopPropagation()
              props.onPrev()
            }}
            size='icon'
            variant='outline'
          >
            <ChevronLeft className='size-4 md:hidden' />
            <ChevronUp className='hidden size-4 md:block' />
          </Button>
          <Button
            aria-label={t('Next artwork')}
            className='border-border/60 bg-background/80 size-11 rounded-full backdrop-blur-sm'
            disabled={!props.hasNext}
            onClick={(event) => {
              event.stopPropagation()
              props.onNext()
            }}
            size='icon'
            variant='outline'
          >
            <ChevronRight className='size-4 md:hidden' />
            <ChevronDown className='hidden size-4 md:block' />
          </Button>
        </div>
        {item.kind === 'video' ? (
          <video
            autoPlay
            className='max-h-full max-w-full cursor-default rounded-lg bg-black object-contain shadow-2xl/10'
            controls
            playsInline
            poster={item.coverUrl}
            src={src}
          />
        ) : (
          <img
            alt={item.prompt.slice(0, 60)}
            className='max-h-full max-w-full cursor-default rounded-lg object-contain shadow-2xl/10'
            src={src}
          />
        )}
      </div>

      <div className='thin-scrollbar bg-background border-border/60 flex min-h-0 w-full flex-1 flex-col overflow-hidden max-md:border-t md:w-full md:max-w-95 md:flex-none md:overflow-y-auto md:border-l md:p-6'>
        <div className='thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4 md:flex-none md:overflow-visible md:p-0'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex min-w-0 items-center gap-2'>
              <h2 className='truncate text-base font-medium'>{item.model}</h2>
              {props.badge}
            </div>
            {props.onFavorite ? (
              <Button
                aria-label={
                  item.favorite ? t('Remove from favorites') : t('Favorite')
                }
                className={cn(
                  'text-muted-foreground size-8 shrink-0',
                  item.favorite && 'text-red-400 hover:text-red-400'
                )}
                onClick={props.onFavorite}
                size='icon'
                variant='ghost'
              >
                <Heart
                  className={cn('size-4', item.favorite && 'fill-current')}
                />
              </Button>
            ) : null}
          </div>
          <p className='text-muted-foreground mt-1.5 text-xs'>
            {timeAgo}
            {item.endpoint ? (
              <>
                {' · '}
                <span className='font-mono'>{item.endpoint}</span>
              </>
            ) : null}
          </p>

          <Separator className='bg-border/60 my-5' />

          <h3 className='text-sm font-medium'>{t('Prompt')}</h3>
          <div className='hover:bg-muted/40 relative mt-2 rounded-lg p-3'>
            <p className='thin-scrollbar max-h-100 overflow-y-auto pr-6 text-sm leading-relaxed'>
              {item.prompt}
            </p>
            <CopyButton
              className='text-muted-foreground absolute top-1 right-1 size-7 gap-x-2'
              size='icon-sm'
              value={item.prompt}
            />
          </div>

          {item.finalPrompt ? (
            <div className='hover:bg-muted/40 relative mt-2 rounded-lg p-3'>
              <p className='thin-scrollbar text-muted-foreground max-h-36 overflow-y-auto pr-6 font-mono text-xs leading-relaxed break-all'>
                {item.finalPrompt}
              </p>
              <CopyButton
                className='text-muted-foreground absolute top-1 right-1 size-7 gap-x-2'
                size='icon-sm'
                value={item.finalPrompt}
              />
            </div>
          ) : null}

          {params.length > 0 ? (
            <>
              <h3 className='mt-6 text-sm font-medium'>{t('Parameters')}</h3>
              <div className='mt-2.5 flex flex-wrap gap-1.5'>
                {params.map(([key, value]) => (
                  <Badge
                    className='gap-1 rounded-md font-normal'
                    key={key}
                    variant='secondary'
                  >
                    <span className='text-muted-foreground'>{key}</span>
                    {String(value)}
                  </Badge>
                ))}
              </div>
            </>
          ) : null}

          {item.refImages?.length ? (
            <>
              <h3 className='mt-6 text-sm font-medium'>
                {t('Reference images')}
              </h3>
              <div className='mt-2.5 flex w-full min-w-0 snap-x snap-mandatory scroll-px-1 [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain py-1 [&::-webkit-scrollbar]:hidden'>
                {item.refImages.map((url, index) => (
                  <div
                    className='border-border/60 bg-card flex w-22 shrink-0 snap-start flex-col gap-2 rounded-xl border p-2'
                    key={url}
                  >
                    <div className='bg-muted aspect-4/3 w-full shrink-0 overflow-hidden rounded-lg'>
                      <img
                        alt={t('Reference image {{number}}', {
                          number: index + 1,
                        })}
                        className='size-full object-cover'
                        draggable={false}
                        src={url}
                      />
                    </div>
                    <span className='text-muted-foreground block w-full min-w-0 truncate text-center text-xs font-medium'>
                      {t('Reference image {{number}}', { number: index + 1 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {item.provider === 'mj' && item.status === 'done' && props.onMjOp ? (
            <StudioArtworkOperations
              buttons={item.buttons ?? []}
              onOperation={props.onMjOp}
            />
          ) : null}
        </div>

        <div className='bg-background md:border-t-border/60 flex shrink-0 flex-col gap-2.5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-md:border-t md:mt-auto md:p-0 md:pt-8'>
          {props.onUseSameStyle ? (
            <Button
              className='w-full gap-1.5 px-2.5'
              onClick={props.onUseSameStyle}
            >
              <Sparkles className='size-4' />
              <span className='truncate'>{t('Use same style')}</span>
            </Button>
          ) : null}
          {props.onShare ? (
            <Button
              className='border-border/60 w-full gap-1.5 px-2.5'
              disabled={props.shareDisabled}
              onClick={props.onShare}
              variant='outline'
            >
              <Share2 className='size-4' />
              <span className='truncate'>{t('Submit for sharing')}</span>
            </Button>
          ) : null}
          <div className='flex gap-2'>
            <Button
              className='border-border/60 h-9 min-w-0 flex-1 gap-1.5 px-2.5'
              onClick={props.onDownload}
              variant='outline'
            >
              <Download className='size-4' />
              <span className='truncate'>{t('Download')}</span>
            </Button>
            {props.onRegenerate ? (
              <Button
                className='border-border/60 h-9 min-w-0 flex-1 gap-1.5 px-2.5'
                onClick={props.onRegenerate}
                variant='outline'
              >
                <RefreshCw className='size-4' />
                <span className='truncate'>
                  {item.status === 'error' && item.taskId
                    ? t('Continue querying')
                    : t('Regenerate')}
                </span>
              </Button>
            ) : null}
            {props.onDelete ? (
              <Button
                aria-label={t('Delete')}
                className='border-border/60 size-9 shrink-0 gap-1.5 px-2.5'
                onClick={props.onDelete}
                size='icon'
                variant='outline'
              >
                <Trash2 className='size-4' />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
