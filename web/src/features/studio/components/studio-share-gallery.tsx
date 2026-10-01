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
import { useQueryClient } from '@tanstack/react-query'
import { Images, Share2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { approveStudioShare, deleteStudioShare } from '../discover/api'
import {
  useStudioShareFeed,
  type StudioShareKindFilter,
  type StudioShareScope,
} from '../discover/hooks'
import type { StudioShareItem } from '../discover/types'
import {
  deleteGeneration,
  downloadGeneration,
  saveGeneration,
  useGenerations,
  type StudioGeneration,
} from '../lib/generations'
import {
  studioShareArtworkId,
  studioShareCapabilities,
  studioShareToArtwork,
} from '../lib/shares'
import { StudioArtworkCard } from './studio-artwork-card'
import { StudioArtworkViewer } from './studio-artwork-viewer'
import { StudioMasonry } from './studio-masonry'

type StudioShareGalleryProps = {
  scope: StudioShareScope
  kind: StudioShareKindFilter
  scrollRef: RefObject<HTMLDivElement | null>
  /** Reuses the composer of the current screen for one-click remixing. */
  onSameStyle: (artwork: StudioGeneration) => void
}

/** Community gallery of submitted works, shared by Discover and My shares. */
export function StudioShareGallery(props: StudioShareGalleryProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.auth.user)
  const {
    data,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useStudioShareFeed(props.scope, props.kind, Boolean(user))
  const favorites = useGenerations()
  const [viewing, setViewing] = useState<StudioShareItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<StudioShareItem | null>(
    null
  )
  const [reviewingIds, setReviewingIds] = useState<number[]>([])
  const reviewing = useRef(new Set<number>())
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  )

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  )

  const favoriteIds = useMemo(() => {
    const ids = new Set<number>()
    for (const item of favorites ?? []) {
      if (item.sourceShareId != null) ids.add(item.sourceShareId)
    }
    return ids
  }, [favorites])

  useEffect(() => {
    setScrollElement(props.scrollRef.current)
  }, [props.scrollRef])

  useEffect(() => {
    if (props.scope !== 'discover') return
    if (!scrollElement || !hasNextPage || isFetchingNextPage) return

    const loadMoreWhenNearBottom = () => {
      const remaining =
        scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight
      if (remaining <= 800) void fetchNextPage()
    }
    loadMoreWhenNearBottom()
    scrollElement.addEventListener('scroll', loadMoreWhenNearBottom, {
      passive: true,
    })
    return () =>
      scrollElement.removeEventListener('scroll', loadMoreWhenNearBottom)
  }, [
    scrollElement,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    items.length,
    props.scope,
  ])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['studio-shares'] })
  }, [queryClient])

  const toggleFavorite = useCallback(
    async (share: StudioShareItem) => {
      try {
        if (favoriteIds.has(share.id)) {
          await deleteGeneration(studioShareArtworkId(share.id))
          return
        }
        await saveGeneration(studioShareToArtwork(share, true))
      } catch {
        toast.error(t('Failed to update favorites. Please try again later.'))
      }
    },
    [favoriteIds, t]
  )

  const removeShare = useCallback(
    async (share: StudioShareItem) => {
      try {
        await deleteStudioShare(share.id)
        await deleteGeneration(studioShareArtworkId(share.id))
        setViewing((current) => (current?.id === share.id ? null : current))
        await refresh()
        toast.success(t('Share deleted'))
      } catch {
        toast.error(t('Operation failed'))
      }
    },
    [refresh, t]
  )

  const reviewShare = useCallback(
    async (share: StudioShareItem) => {
      if (reviewing.current.has(share.id)) return
      reviewing.current.add(share.id)
      setReviewingIds([...reviewing.current])
      try {
        await approveStudioShare(share.id)
        await refresh()
        toast.success(t('Published'))
      } catch {
        toast.error(t('Operation failed'))
      } finally {
        reviewing.current.delete(share.id)
        setReviewingIds([...reviewing.current])
      }
    },
    [refresh, t]
  )

  const masonryItems = useMemo(
    () =>
      items.map((share) => ({
        id: studioShareArtworkId(share.id),
        aspect_ratio:
          share.data.width > 0 && share.data.height > 0
            ? share.data.width / share.data.height
            : 1,
        share,
      })),
    [items]
  )

  const index = viewing
    ? items.findIndex((share) => share.id === viewing.id)
    : -1

  let gallery
  if (isPending) {
    gallery = (
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
        {Array.from({ length: 10 }, (_, position) => (
          <Skeleton
            key={position}
            className='aspect-square w-full rounded-xl'
          />
        ))}
      </div>
    )
  } else if (isError) {
    gallery = (
      <EmptyState
        action={
          <Button onClick={() => void refresh()} variant='outline'>
            {t('Retry')}
          </Button>
        }
        description={t('Please try again later.')}
        icon={Share2}
        title={t('Unable to load shared creations')}
      />
    )
  } else if (items.length === 0) {
    gallery = (
      <EmptyState
        description={
          props.scope === 'mine'
            ? t('Share a creation from your images or videos.')
            : t('Approved creations will appear here.')
        }
        icon={props.scope === 'mine' ? Share2 : Images}
        title={
          props.scope === 'mine'
            ? t('No shares yet')
            : t('No shared creations yet')
        }
      />
    )
  } else {
    gallery = (
      <>
        <StudioMasonry
          items={masonryItems}
          scrollElement={scrollElement}
          renderItem={(entry) => {
            const { share } = entry
            const capabilities = studioShareCapabilities(
              props.scope,
              share.owner,
              share.status
            )
            const artwork = studioShareToArtwork(
              share,
              favoriteIds.has(share.id)
            )
            const reviewingShare = reviewingIds.includes(share.id)
            let leftActions: ReactNode
            if (share.owner && capabilities.canReview) {
              leftActions = (
                <Button
                  className='absolute top-2 left-2 z-10'
                  disabled={reviewingShare}
                  onClick={(event) => {
                    event.stopPropagation()
                    void reviewShare(share)
                  }}
                  size='sm'
                  variant='secondary'
                >
                  {reviewingShare ? <Spinner className='size-3.5' /> : null}
                  {t('Pending review')}
                </Button>
              )
            } else if (share.owner) {
              leftActions = (
                <span
                  className={cn(
                    'bg-background/85 text-foreground absolute top-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm',
                    // Keep the favorite button of the discover gallery usable.
                    capabilities.canFavorite ? 'left-10' : 'left-2'
                  )}
                >
                  {share.status === 2 ? t('Published') : t('Pending review')}
                </span>
              )
            }
            return (
              <StudioArtworkCard
                item={artwork}
                leftActions={leftActions}
                onDelete={
                  capabilities.canDelete
                    ? () => setPendingDelete(share)
                    : undefined
                }
                onDownload={() => downloadGeneration(artwork)}
                onFavorite={
                  capabilities.canFavorite
                    ? () => void toggleFavorite(share)
                    : undefined
                }
                onOpen={() => setViewing(share)}
                onSameStyle={
                  capabilities.canRemix
                    ? () => props.onSameStyle(artwork)
                    : undefined
                }
              />
            )
          }}
        />

        {props.scope === 'discover' && hasNextPage ? (
          <div className='flex h-16 items-center justify-center'>
            {isFetchingNextPage ? <Spinner /> : null}
          </div>
        ) : null}

        {props.scope === 'mine' && hasNextPage ? (
          <div className='flex justify-center pt-8'>
            <Button
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              variant='outline'
            >
              {isFetchingNextPage ? (
                <Spinner className='size-4' data-icon='inline-start' />
              ) : null}
              {t('Load more')}
            </Button>
          </div>
        ) : null}
      </>
    )
  }

  const viewingIndex = viewing
    ? studioShareCapabilities(props.scope, viewing.owner, viewing.status)
    : undefined

  return (
    <>
      {gallery}

      {viewing && viewingIndex ? (
        <StudioArtworkViewer
          badge={
            viewing.owner ? (
              <Badge variant='secondary'>
                {viewing.status === 2 ? t('Published') : t('Pending review')}
              </Badge>
            ) : undefined
          }
          hasNext={index >= 0 && index < items.length - 1}
          hasPrev={index > 0}
          item={studioShareToArtwork(viewing, favoriteIds.has(viewing.id))}
          onClose={() => setViewing(null)}
          onDelete={
            viewingIndex.canDelete ? () => setPendingDelete(viewing) : undefined
          }
          onDownload={() =>
            downloadGeneration(studioShareToArtwork(viewing, false))
          }
          onFavorite={
            viewingIndex.canFavorite
              ? () => void toggleFavorite(viewing)
              : undefined
          }
          onNext={() => setViewing(items[index + 1])}
          onPrev={() => setViewing(items[index - 1])}
          onUseSameStyle={
            viewingIndex.canRemix
              ? () => props.onSameStyle(studioShareToArtwork(viewing, false))
              : undefined
          }
        />
      ) : null}

      <ConfirmDialog
        desc={t(
          'It will be removed from Discover. This action cannot be undone.'
        )}
        destructive
        handleConfirm={() => {
          const target = pendingDelete
          setPendingDelete(null)
          if (target) void removeShare(target)
        }}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={pendingDelete !== null}
        title={t('Delete this share?')}
      />
    </>
  )
}
