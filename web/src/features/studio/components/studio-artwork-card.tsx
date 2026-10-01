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
  Download,
  ExternalLink,
  Heart,
  ImageOff,
  Pencil,
  RefreshCw,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  VideoOff,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toIntlLocale } from '@/i18n/languages'
import { formatTimestampRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useArtworkMediaSrc } from '../hooks/use-artwork-media'
import {
  generationAspectRatio,
  type StudioGeneration,
} from '../lib/generations'
import { mjQuickButtons, type StudioMjButton } from '../lib/mj-actions'

type StudioArtworkCardProps = {
  item: StudioGeneration
  onOpen: () => void
  onFavorite?: () => void
  onDownload?: () => void
  onDelete?: () => void
  onShare?: () => void
  shareDisabled?: boolean
  /** Refills the composer with this artwork's prompt and generation settings. */
  onSameStyle?: () => void
  /** Retries a failed generation, reusing the original task when possible. */
  onRetry?: () => void
  onEdit?: () => void
  /** Runs a Midjourney action button of a finished artwork. */
  onMjOp?: (button: StudioMjButton) => void
  onMediaDims?: (dims: { width: number; height: number }) => void
  /** Replaces the favorite button, e.g. with the review badge of a share. */
  leftActions?: ReactNode
}

/** One locally generated artwork inside the studio gallery. */
export function StudioArtworkCard(props: StudioArtworkCardProps) {
  const { t, i18n } = useTranslation()
  const [aspectRatio, setAspectRatio] = useState(
    generationAspectRatio(props.item)
  )
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { item } = props
  const src = useArtworkMediaSrc(item)
  const done = item.status === 'done' && Boolean(src)
  const loadFailed = Boolean(item.url) && failedSrc === item.url

  const applyAspectRatio = (next: number) => {
    if (next <= 0) return
    setAspectRatio(next)
  }

  const timeAgo = formatTimestampRelative(
    item.createdAt,
    'milliseconds',
    toIntlLocale(i18n.language)
  )

  if (!done || loadFailed) {
    const fallbackAspect = item.kind === 'video' ? '16 / 9' : '1 / 1'
    const aspect =
      item.width && item.height
        ? `${item.width} / ${item.height}`
        : fallbackAspect
    let title = t('Generation failed')
    if (loadFailed) {
      title = t('Failed to load')
    } else if (item.status === 'running') {
      title = t('Generating {{progress}}', {
        progress: item.progress == null ? '' : `${item.progress}%`,
      })
    }

    let placeholderIcon: ReactNode
    if (item.status === 'running') {
      placeholderIcon = <Spinner className='text-muted-foreground size-5' />
    } else if (item.kind === 'video') {
      placeholderIcon = <VideoOff className='text-muted-foreground/50 size-6' />
    } else {
      placeholderIcon = <ImageOff className='text-muted-foreground/50 size-6' />
    }

    const retryMedia = () => {
      setFailedSrc(null)
      setRetryKey((value) => value + 1)
      window.requestAnimationFrame(() => {
        const video = videoRef.current
        if (!video) return
        video.load()
        void video.play().catch(() => undefined)
      })
    }

    return (
      <div
        data-slot='card'
        className={cn(
          'group/card border-border/40 relative flex w-full flex-col overflow-hidden rounded-xl border text-center text-sm',
          item.kind === 'image' ? 'bg-muted/40' : 'bg-muted/30'
        )}
        style={{ aspectRatio: aspect }}
      >
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden p-4'>
          {placeholderIcon}
          <p className='text-sm'>{title}</p>
          {item.status === 'running' ? (
            <>
              {item.taskStatus ? (
                <Badge
                  className='max-w-full truncate'
                  title={item.taskStatus}
                  variant='secondary'
                >
                  {item.taskStatus}
                </Badge>
              ) : null}
              <div className='bg-border/80 h-0.5 w-2/5 shrink-0 overflow-hidden rounded-full'>
                {item.progress == null ? (
                  <div className='bg-primary/60 animate-progress-slide h-full w-2/5 rounded-full' />
                ) : (
                  <div
                    className='bg-primary/60 h-full rounded-full transition-[width]'
                    style={{ width: `${item.progress}%` }}
                  />
                )}
              </div>
              {item.kind === 'image' ? (
                <span className='text-muted-foreground/60 text-xs'>
                  {t('Keep this page open')}
                </span>
              ) : null}
            </>
          ) : null}
          {item.status === 'error' && !loadFailed ? (
            <p className='text-muted-foreground line-clamp-3 max-w-full text-xs leading-relaxed'>
              {item.error}
            </p>
          ) : null}
          {loadFailed && item.url ? (
            <>
              {item.kind === 'image' ? (
                <p className='text-muted-foreground/60 text-center text-[11px]'>
                  {t('The image link may have expired.')}
                </p>
              ) : null}
              <div className='flex items-center gap-1.5'>
                {item.kind === 'video' ? (
                  <Button
                    aria-label={t('Retry')}
                    onClick={retryMedia}
                    size='icon-sm'
                    title={t('Retry')}
                    variant='outline'
                  >
                    <RefreshCw className='size-3.5' />
                  </Button>
                ) : null}
                <Button
                  className='border-border/60 h-7 gap-1.5 text-xs'
                  onClick={() => window.open(item.url, '_blank', 'noopener')}
                  size='sm'
                  variant='outline'
                >
                  <ExternalLink className='size-3.5' />
                  {t('Open in browser')}
                </Button>
              </div>
            </>
          ) : null}
          {item.status === 'error' && !loadFailed && props.onRetry ? (
            <Button
              className='border-border/60 h-7 gap-1.5 text-xs'
              onClick={props.onRetry}
              size='sm'
              variant='outline'
            >
              <RotateCcw className='size-3.5' />
              {t('Retry')}
            </Button>
          ) : null}
        </div>
        <div className='flex shrink-0 items-center justify-center px-3 py-3'>
          <p className='text-muted-foreground/70 line-clamp-1 text-xs'>
            {item.prompt}
          </p>
        </div>
        {props.onDelete ? (
          <Button
            aria-label={t('Delete')}
            className='bg-muted text-muted-foreground hover:bg-muted/70 absolute top-2 right-2 z-10 opacity-0 transition-colors transition-opacity group-hover/card:opacity-100'
            onClick={props.onDelete}
            size='icon-sm'
            title={t('Delete')}
            variant='ghost'
          >
            <Trash2 className='size-3.5' />
          </Button>
        ) : null}
      </div>
    )
  }

  let favoriteAction: ReactNode = null
  if (props.onFavorite) {
    favoriteAction = (
      <Button
        variant='default'
        size='icon-sm'
        className={cn(
          'absolute top-2 left-2 z-10 size-7 rounded-full backdrop-blur-sm',
          'transition-[color,opacity,background-color] duration-200 hover:bg-black/60',
          item.favorite
            ? 'bg-black/5 text-red-400'
            : 'bg-black/40 text-white/90 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100'
        )}
        aria-label={item.favorite ? t('Remove from favorites') : t('Favorite')}
        title={item.favorite ? t('Remove from favorites') : t('Favorite')}
        onClick={props.onFavorite}
      >
        <Heart className={cn('size-3.5', item.favorite && 'fill-current')} />
      </Button>
    )
  }
  const leftSlot =
    favoriteAction || props.leftActions ? (
      <>
        {favoriteAction}
        {props.leftActions}
      </>
    ) : null
  const editLabel =
    item.provider === 'mj'
      ? t('Edit (use as source image)')
      : t('Edit (use as reference image)')
  const quickButtons =
    item.provider === 'mj' && props.onMjOp
      ? mjQuickButtons(item.buttons ?? [])
      : []
  const overlayTop =
    quickButtons.length > 0 ? (
      <div className='mb-2 flex flex-wrap gap-1'>
        {quickButtons.map((button) => (
          <Button
            aria-label={button.label}
            className='min-w-8 bg-white/15 font-mono backdrop-blur-sm hover:bg-white/30'
            key={button.customId}
            onClick={(event) => {
              event.stopPropagation()
              props.onMjOp?.(button)
            }}
            size='xs'
            type='button'
          >
            {button.label}
          </Button>
        ))}
      </div>
    ) : null

  return (
    <div
      data-slot='card'
      className='group/card bg-muted/40 text-card-foreground relative block w-full overflow-hidden rounded-xl text-sm'
      style={{ aspectRatio }}
      onMouseEnter={() => {
        if (item.kind !== 'video') return
        void videoRef.current?.play().catch(() => undefined)
      }}
      onMouseLeave={() => {
        if (item.kind !== 'video') return
        const video = videoRef.current
        if (!video) return
        video.pause()
        try {
          video.currentTime = 0
        } catch {
          // Ignore reset failures when the media is not seekable yet.
        }
      }}
    >
      <button
        type='button'
        aria-label={(item.prompt || `${item.model} · ${timeAgo}`).slice(0, 120)}
        className='focus-visible:outline-ring block w-full cursor-zoom-in rounded-[inherit] text-left focus-visible:outline-2'
        onClick={props.onOpen}
      >
        {item.kind === 'video' ? (
          <video
            key={retryKey}
            ref={videoRef}
            src={src}
            poster={item.coverUrl}
            muted
            loop
            playsInline
            preload={item.coverUrl ? 'none' : 'metadata'}
            className='bg-muted h-auto w-full transition-transform duration-300 group-hover/card:scale-[1.02]'
            onError={() => setFailedSrc(item.url ?? null)}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                applyAspectRatio(video.videoWidth / video.videoHeight)
                props.onMediaDims?.({
                  width: video.videoWidth,
                  height: video.videoHeight,
                })
              }
            }}
          />
        ) : (
          <img
            src={src}
            alt={item.prompt.slice(0, 60)}
            loading='lazy'
            className='h-auto w-full transition-transform duration-300 group-hover/card:scale-[1.02]'
            onError={() => setFailedSrc(item.url ?? null)}
            onLoad={(event) => {
              const image = event.currentTarget
              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                applyAspectRatio(image.naturalWidth / image.naturalHeight)
                props.onMediaDims?.({
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                })
              }
            }}
          />
        )}
      </button>

      <div className='pointer-events-none absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/65 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100'>
        {overlayTop ? (
          <div className='pointer-events-auto'>{overlayTop}</div>
        ) : null}
        <p className='line-clamp-2 text-xs leading-relaxed text-white/95'>
          {item.prompt}
        </p>
        <p className='mt-1.5 text-[11px] text-white/60'>
          {item.model} · {timeAgo}
        </p>
      </div>

      {leftSlot}

      <div className='absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 focus-within:opacity-100'>
        {props.onShare ? (
          <Button
            className='size-7 rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60'
            variant='default'
            size='icon-sm'
            aria-label={t('Submit for sharing')}
            title={t('Submit for sharing')}
            disabled={props.shareDisabled}
            onClick={props.onShare}
          >
            <Share2 className='size-3.5' />
          </Button>
        ) : null}
        {props.onSameStyle ? (
          <Button
            className='size-7 rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60'
            variant='default'
            size='icon-sm'
            aria-label={t('Use same style')}
            title={t('Use same style')}
            onClick={props.onSameStyle}
          >
            <Sparkles className='size-3.5' />
          </Button>
        ) : null}
        {props.onEdit ? (
          <Button
            className='size-7 rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60'
            variant='default'
            size='icon-sm'
            aria-label={editLabel}
            title={editLabel}
            onClick={props.onEdit}
          >
            <Pencil className='size-3.5' />
          </Button>
        ) : null}
        {props.onDownload ? (
          <Button
            className='size-7 rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60'
            variant='default'
            size='icon-sm'
            aria-label={t('Download')}
            title={t('Download')}
            onClick={props.onDownload}
            disabled={!done}
          >
            <Download className='size-3.5' />
          </Button>
        ) : null}
        {props.onDelete ? (
          <Button
            className='size-7 rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60'
            variant='default'
            size='icon-sm'
            aria-label={t('Delete')}
            title={t('Delete')}
            onClick={props.onDelete}
          >
            <Trash2 className='size-3.5' />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
