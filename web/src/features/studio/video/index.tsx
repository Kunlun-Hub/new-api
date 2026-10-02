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
import { useQuery } from '@tanstack/react-query'
import { Clapperboard, HeartOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { fetchTokenKey } from '@/features/keys/api'
import { getPricing } from '@/features/pricing/api'
import { StudioArtworkCard } from '@/features/studio/components/studio-artwork-card'
import { StudioArtworkViewer } from '@/features/studio/components/studio-artwork-viewer'
import { StudioGalleryLayout } from '@/features/studio/components/studio-gallery-layout'
import { StudioGalleryTabs } from '@/features/studio/components/studio-gallery-tabs'
import { StudioGreeting } from '@/features/studio/components/studio-greeting'
import { StudioMasonry } from '@/features/studio/components/studio-masonry'
import { StudioShareGallery } from '@/features/studio/components/studio-share-gallery'
import { StudioShell } from '@/features/studio/components/studio-shell'
import { StudioVideoInput } from '@/features/studio/components/studio-video-input'
import { useArtworkFavorite } from '@/features/studio/hooks/use-artwork-favorite'
import { useArtworkShare } from '@/features/studio/hooks/use-artwork-share'
import { useGenScreen } from '@/features/studio/hooks/use-gen-screen'
import { useStudioTokens } from '@/features/studio/hooks/use-studio-tokens'
import { useVideoCoverRetry } from '@/features/studio/hooks/use-video-cover-retry'
import {
  deleteGeneration,
  downloadGeneration,
  generationAspectRatio,
  newGenerationId,
  saveGeneration,
  updateGeneration,
  type StudioGeneration,
  type StudioGenerationParam,
} from '@/features/studio/lib/generations'
import { takeStudioRemix } from '@/features/studio/lib/remix'
import { persistStudioVideo } from '@/features/studio/lib/studio-upload'

import {
  DEFAULT_VIDEO_SCHEMA,
  STUDIO_VIDEO_VENDORS,
  buildVideoRequest,
  filterAvailableVideoVendors,
  defaultVideoValues,
  normalizeVideoValues,
  videoSchemaById,
  videoVendorById,
  type StudioVideoMediaValue,
  type StudioVideoSchema,
  type StudioVideoValues,
} from '../lib/video-params'

const PROMPT_CHIPS = [
  'video.ideas.rainPush',
  'video.ideas.productTransition',
  'video.ideas.inkMountains',
  'video.ideas.cinematicTurn',
  'video.ideas.cyberAerial',
]

const POLL_INTERVAL_MS = 5000
const POLL_MAX_TRIES = 120

type VideoTaskState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'pending'; progress?: number }
  | { status: 'error'; message: string }

type RunOptions = {
  schema?: StudioVideoSchema
  model?: string
  values?: StudioVideoValues
}

function displayParams(
  schema: StudioVideoSchema,
  values: StudioVideoValues,
  translate: (key: string) => string
): Record<string, StudioGenerationParam> {
  const params: Record<string, StudioGenerationParam> = {}
  for (const field of schema.fields) {
    if (field.media || field.type === 'alert') continue
    const value = values[field.name]
    if (!value) continue
    params[translate(field.label)] = value
  }
  return params
}

/** Rebuilds composer media drafts from a stored artwork. */
function mediaDraftsFromValues(
  schema: StudioVideoSchema,
  values: StudioVideoValues
): StudioVideoMediaValue[] {
  const drafts: StudioVideoMediaValue[] = []
  for (const field of schema.fields) {
    if (!field.media) continue
    const value = values[field.name]
    if (!value) continue
    drafts.push({
      id: `${field.name}-${value}`,
      field: field.name,
      kind: field.media.kind,
      value,
    })
  }
  return drafts
}

export function StudioVideo(props: { initialPrompt?: string }) {
  const { t } = useTranslation()
  const { tokens, isLoading: tokensLoading, refresh } = useStudioTokens()
  const [tokenId, setTokenId] = useState<number | null>(null)
  const [schemaId, setSchemaId] = useState(DEFAULT_VIDEO_SCHEMA.id)
  const [model, setModel] = useState(
    DEFAULT_VIDEO_SCHEMA.models[0]?.value ?? ''
  )
  const [values, setValues] = useState<StudioVideoValues>(() =>
    defaultVideoValues(DEFAULT_VIDEO_SCHEMA)
  )
  const [media, setMedia] = useState<StudioVideoMediaValue[]>([])
  const [task, setTask] = useState<VideoTaskState>({ status: 'idle' })
  const [promptSeed, setPromptSeed] = useState<{ text: string; key: number }>()
  const [pendingDelete, setPendingDelete] = useState<StudioGeneration | null>(
    null
  )
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  )
  const pollTimer = useRef<number | null>(null)
  const genScreen = useGenScreen('video')

  const pricing = useQuery({
    queryKey: ['studio-video-models'],
    queryFn: async () => (await getPricing()).data ?? [],
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const vendors = useMemo(() => {
    const available = new Set(
      (pricing.data ?? []).map((model) => model.model_name)
    )
    return filterAvailableVideoVendors(STUDIO_VIDEO_VENDORS, available)
  }, [pricing.data])

  const schema: StudioVideoSchema = useMemo(() => {
    for (const vendor of vendors) {
      const found = vendor.schemas.find((item) => item.id === schemaId)
      if (found) return found
    }
    return vendors[0]?.schemas[0] ?? DEFAULT_VIDEO_SCHEMA
  }, [schemaId, vendors])

  useEffect(() => {
    if (pricing.isLoading) return
    const active = vendors.some((vendor) =>
      vendor.schemas.some((item) => item.id === schemaId)
    )
    if (active) return
    const first = vendors[0]?.schemas[0]
    if (!first) return
    setSchemaId(first.id)
    setModel(first.models[0]?.value ?? '')
    setValues(defaultVideoValues(first))
  }, [pricing.isLoading, schemaId, vendors])

  const token = tokens.find((item) => item.id === tokenId) ?? tokens[0]
  const galleryActive = genScreen.hasArtworks || genScreen.tab !== 'history'

  useEffect(() => {
    return () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current)
    }
  }, [])

  useEffect(() => {
    setScrollElement(genScreen.scrollRef.current)
  }, [genScreen.scrollRef, galleryActive])

  useEffect(() => {
    const draft = takeStudioRemix('video')
    if (!draft) return
    const restoredSchema = draft.schemaId
      ? videoSchemaById(draft.schemaId)
      : undefined
    if (restoredSchema) {
      const restoredValues = defaultVideoValues(restoredSchema)
      for (const [key, value] of Object.entries(draft.values ?? {})) {
        if (key in restoredValues) restoredValues[key] = value
      }
      applySchema(restoredSchema)
      if (draft.model) setModel(draft.model)
      setValues(restoredValues)
      setMedia(mediaDraftsFromValues(restoredSchema, restoredValues))
    }
    setPromptSeed({ text: draft.prompt, key: Date.now() })
    // The draft is consumed once per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const defaults = useMemo(() => defaultVideoValues(schema), [schema])
  const canResetValues =
    media.length > 0 ||
    Object.entries(defaults).some(([key, value]) => values[key] !== value)

  const applySchema = (next: StudioVideoSchema) => {
    setSchemaId(next.id)
    setModel(next.models[0]?.value ?? '')
    setValues(defaultVideoValues(next))
    setMedia([])
  }

  const changeVendor = (vendorId: string) => {
    const vendor = videoVendorById(vendorId)
    applySchema(vendor.schemas[0] ?? schema)
  }

  const changeModel = (nextModel: string) => {
    setModel(nextModel)
    setValues((current) => normalizeVideoValues(schema, nextModel, current))
  }

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
  }

  const resetValues = () => {
    setValues(defaultVideoValues(schema))
    setMedia([])
  }

  const pollTask = (
    taskId: string,
    key: string,
    generationId: string,
    attempt: number
  ) => {
    pollTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/v1/videos/${taskId}`, {
          headers: { Authorization: `Bearer ${key}` },
        })
        const data = (await res.json()) as {
          status?: string
          progress?: number
          error?: { message?: string }
        }
        if (data.status === 'completed') {
          setTask({ status: 'idle' })
          const stored = await persistStudioVideo(
            `/v1/videos/${taskId}/content`,
            {
              headers: { Authorization: `Bearer ${key}` },
            }
          )
          await updateGeneration(generationId, {
            status: 'done',
            taskId,
            url: stored.url,
            coverUrl: stored.coverUrl,
          })
          return
        }
        if (data.status === 'failed') {
          const message =
            data.error?.message ||
            t('Video generation failed. Please try again.')
          setTask({ status: 'error', message })
          await updateGeneration(generationId, {
            status: 'error',
            error: message,
          })
          return
        }
        if (attempt >= POLL_MAX_TRIES) {
          const message = t('Video generation timed out. Try again later.')
          setTask({ status: 'error', message })
          await updateGeneration(generationId, {
            status: 'error',
            error: message,
          })
          return
        }
        setTask({ status: 'pending', progress: data.progress })
        await updateGeneration(generationId, {
          taskStatus: data.status,
          progress: data.progress,
        })
        pollTask(taskId, key, generationId, attempt + 1)
      } catch (error) {
        const message = (error as Error).message
        setTask({ status: 'error', message })
        await updateGeneration(generationId, {
          status: 'error',
          error: message,
        })
      }
    }, POLL_INTERVAL_MS)
  }

  const runGeneration = async (
    prompt: string,
    drafts: StudioVideoMediaValue[],
    options?: RunOptions
  ) => {
    const activeSchema = options?.schema ?? schema
    const activeModel = options?.model ?? model
    const activeValues = options?.values ?? values

    if (!token) {
      toast.error(t('No available tokens. Create one in API Keys first.'))
      return
    }
    const missing = activeSchema.fields.find(
      (field) =>
        field.required &&
        field.media &&
        !drafts.some((item) => item.field === field.name)
    )
    if (missing) {
      toast.error(t('{{label}} is required', { label: t(missing.label) }))
      return
    }

    const generationId = newGenerationId('video')
    await saveGeneration({
      id: generationId,
      kind: 'video',
      status: 'running',
      prompt,
      model: activeModel || t(videoVendorById(activeSchema.vendor).name),
      provider: activeSchema.vendor,
      schemaId: activeSchema.id,
      params: displayParams(activeSchema, activeValues, t),
      values: { ...activeValues },
      tokenId: token.id,
      tokenName: token.name,
      createdAt: Date.now(),
    })

    setTask({ status: 'submitting' })
    try {
      const keyRes = await fetchTokenKey(token.id)
      const key = keyRes.data?.key
      if (!key) {
        throw new Error(keyRes.message || t('Failed to read the token key'))
      }

      const body = buildVideoRequest(
        activeSchema,
        activeModel,
        activeValues,
        prompt,
        drafts
      )
      if (activeModel) body.model = activeModel
      const durationField = activeSchema.fields.find(
        (field) => field.name === 'duration' && !field.media
      )
      if (durationField) {
        const seconds = Number(activeValues[durationField.name])
        if (Number.isFinite(seconds) && seconds > 0) body.seconds = seconds
      }

      const res = await fetch('/v1/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        id?: string
        status?: string
        error?: { message?: string }
        message?: string
      }
      const taskId = data.id
      if (!taskId) {
        throw new Error(
          data.error?.message ||
            data.message ||
            t('Video generation failed. Please try again.')
        )
      }
      setTask({ status: 'pending' })
      await updateGeneration(generationId, { taskId })
      pollTask(taskId, key, generationId, 1)
    } catch (error) {
      const message = (error as Error).message
      setTask({ status: 'error', message })
      await updateGeneration(generationId, { status: 'error', error: message })
    }
  }

  const regenerate = async (item: StudioGeneration) => {
    genScreen.closeViewer()
    if (item.status === 'error' && item.taskId && item.tokenId != null) {
      try {
        const keyRes = await fetchTokenKey(item.tokenId)
        const key = keyRes.data?.key
        if (!key) {
          throw new Error(keyRes.message || t('Failed to read the token key'))
        }
        setTask({ status: 'pending' })
        await updateGeneration(item.id, { status: 'running', error: undefined })
        pollTask(item.taskId, key, item.id, 0)
        return
      } catch {
        // Fall back to a fresh submission when the token key is unavailable.
      }
    }
    const restoredSchema = item.schemaId
      ? videoSchemaById(item.schemaId)
      : undefined
    if (!restoredSchema) {
      toast.error(t('Video generation failed. Please try again.'))
      return
    }
    const restoredValues = defaultVideoValues(restoredSchema)
    for (const [key, value] of Object.entries(item.values ?? {})) {
      if (key in restoredValues) restoredValues[key] = value
    }
    void runGeneration(
      item.prompt,
      mediaDraftsFromValues(restoredSchema, restoredValues),
      {
        schema: restoredSchema,
        model: item.model,
        values: restoredValues,
      }
    )
  }

  const share = useArtworkShare()
  const favorite = useArtworkFavorite('video')
  useVideoCoverRetry()

  const applySameStyle = (item: StudioGeneration) => {
    genScreen.closeViewer()
    const restoredSchema = item.schemaId
      ? videoSchemaById(item.schemaId)
      : undefined
    if (!restoredSchema) return
    const restoredValues = defaultVideoValues(restoredSchema)
    for (const [key, value] of Object.entries(item.values ?? {})) {
      if (key in restoredValues) restoredValues[key] = value
    }
    applySchema(restoredSchema)
    setModel(item.model)
    setValues(restoredValues)
    setMedia(mediaDraftsFromValues(restoredSchema, restoredValues))
    setPromptSeed({ text: item.prompt, key: Date.now() })
  }

  const masonryItems = useMemo(
    () =>
      genScreen.filtered.map((item) => ({
        id: item.id,
        aspect_ratio: generationAspectRatio(item),
        artwork: item,
      })),
    [genScreen.filtered]
  )

  const composer =
    vendors.length === 0 ? (
      <div className='flex h-[55vh] flex-col items-center justify-center gap-2.5'>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Clapperboard className='text-muted-foreground/50 size-16' />
            </EmptyMedia>
            <EmptyTitle>{t('No video models available')}</EmptyTitle>
            <EmptyDescription>
              {t('Ask an administrator to enable a video model on a channel.')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    ) : (
      <StudioVideoInput
        canResetValues={canResetValues}
        chips={PROMPT_CHIPS}
        disabled={!token}
        floating={galleryActive}
        greeting={
          <StudioGreeting
            icon={Clapperboard}
            iconClassName='text-primary/70'
            question={t('what would you like to film?')}
          />
        }
        initialPrompt={props.initialPrompt}
        media={media}
        model={model}
        onChange={setValue}
        onMediaChange={setMedia}
        onModelChange={changeModel}
        onResetValues={resetValues}
        onSchemaChange={(nextId) => {
          const next = videoSchemaById(nextId)
          if (next) applySchema(next)
        }}
        onTokenChange={setTokenId}
        onTokenRefresh={() => void refresh()}
        onVendorChange={changeVendor}
        onSubmit={(prompt, drafts) => void runGeneration(prompt, drafts)}
        promptSeed={promptSeed}
        schema={schema}
        submitting={task.status === 'submitting'}
        tokenId={token?.id ?? null}
        tokens={tokens}
        tokensLoading={tokensLoading}
        values={values}
        vendors={vendors}
      />
    )

  const viewing = genScreen.viewing

  let gallery: ReactNode
  if (genScreen.showShares) {
    gallery = (
      <StudioShareGallery
        kind='video'
        onSameStyle={applySameStyle}
        scope='mine'
        scrollRef={genScreen.scrollRef}
      />
    )
  } else if (genScreen.filtered.length > 0) {
    gallery = (
      <StudioMasonry
        items={masonryItems}
        scrollElement={scrollElement}
        renderItem={(item) => (
          <StudioArtworkCard
            item={item.artwork}
            onDelete={() => setPendingDelete(item.artwork)}
            onDownload={() => downloadGeneration(item.artwork)}
            onFavorite={() => void favorite.toggle(item.artwork)}
            onMediaDims={(dims) => void updateGeneration(item.artwork.id, dims)}
            onOpen={() => genScreen.openViewer(item.artwork.id)}
            onRetry={() => void regenerate(item.artwork)}
            onSameStyle={() => applySameStyle(item.artwork)}
            onShare={
              item.artwork.submittedShareId == null
                ? () => share.submit(item.artwork)
                : undefined
            }
            shareDisabled={share.isDisabled(item.artwork)}
          />
        )}
      />
    )
  } else {
    gallery = (
      <div className='flex h-[55vh] flex-col items-center justify-center gap-2.5'>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <HeartOff className='text-muted-foreground/50 size-16' />
            </EmptyMedia>
            <EmptyTitle>{t('No favorites yet')}</EmptyTitle>
            <EmptyDescription>
              {t('You have not favorited any artwork.')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <StudioShell>
      {galleryActive ? (
        <StudioGalleryLayout
          bottomContent={composer}
          header={
            <StudioGalleryTabs
              historyLabel={t('My videos')}
              onTabChange={genScreen.setTab}
              tab={genScreen.tab}
            />
          }
          overlay={
            viewing ? (
              <StudioArtworkViewer
                hasNext={genScreen.hasNext}
                hasPrev={genScreen.hasPrev}
                item={viewing}
                onClose={genScreen.closeViewer}
                onDelete={() => setPendingDelete(viewing)}
                onDownload={() => downloadGeneration(viewing)}
                onFavorite={() => void favorite.toggle(viewing)}
                onNext={genScreen.onNext}
                onPrev={genScreen.onPrev}
                onRegenerate={() => void regenerate(viewing)}
                onShare={
                  viewing.submittedShareId == null
                    ? () => share.submit(viewing)
                    : undefined
                }
                shareDisabled={share.isDisabled(viewing)}
                onUseSameStyle={() => applySameStyle(viewing)}
              />
            ) : null
          }
          scrollRef={genScreen.scrollRef}
        >
          {gallery}
        </StudioGalleryLayout>
      ) : (
        composer
      )}

      <ConfirmDialog
        confirmText={t('Submit for sharing')}
        desc={t(
          'The media, prompt, and generation settings will be public and available for one-click remixing.'
        )}
        handleConfirm={() => void share.confirmSubmit()}
        isLoading={share.submitting}
        onOpenChange={(open) => !open && share.cancel()}
        open={share.pending !== null}
        title={t('Submit for sharing')}
      />

      <ConfirmDialog
        desc={t('This artwork will be permanently deleted from this browser.')}
        destructive
        handleConfirm={() => {
          const target = pendingDelete
          setPendingDelete(null)
          if (target) void deleteGeneration(target.id)
        }}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={pendingDelete !== null}
        title={t('Delete artwork?')}
      />
    </StudioShell>
  )
}
