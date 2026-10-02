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
import { HeartOff, ImagePlay } from 'lucide-react'
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
import { StudioImageInput } from '@/features/studio/components/studio-image-input'
import type { StudioImageProvider } from '@/features/studio/components/studio-image-model-select'
import { StudioMasonry } from '@/features/studio/components/studio-masonry'
import { StudioShareGallery } from '@/features/studio/components/studio-share-gallery'
import { StudioShell } from '@/features/studio/components/studio-shell'
import { useArtworkFavorite } from '@/features/studio/hooks/use-artwork-favorite'
import { useArtworkShare } from '@/features/studio/hooks/use-artwork-share'
import { useGenScreen } from '@/features/studio/hooks/use-gen-screen'
import { useStudioTokens } from '@/features/studio/hooks/use-studio-tokens'
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
import {
  isMjCustomZoom,
  mjButtonLabelKey,
  mjSubmitPath,
  normalizeMjButtons,
  type StudioMjButton,
} from '@/features/studio/lib/mj-actions'
import { takeStudioRemix } from '@/features/studio/lib/remix'
import { persistStudioMedia } from '@/features/studio/lib/studio-upload'
import { resolveModelProvider } from '@/lib/model-provider'

import {
  DEFAULT_STUDIO_IMAGE_VALUES,
  MJ_ASPECT_RATIOS,
  MJ_VERSIONS,
  buildMidjourneyPrompt,
  midjourneyEndpoint,
  type StudioImageValues,
} from '../lib/image-params'

const PROMPT_CHIPS = [
  'image.ideas.cyberpunk',
  'image.ideas.skyCastle',
  'image.ideas.inkLandscape',
  'image.ideas.feltAnimal',
  'image.ideas.auroraCabin',
]

const IMAGE_ENDPOINT_TYPE = 'image-generation'
const MJ_POLL_INTERVAL_MS = 3000

type ImageTaskState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'pending'; progress?: string }
  | { status: 'error'; message: string }

type RunOptions = {
  provider?: string
  values?: StudioImageValues
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

function storedValues(values: StudioImageValues): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) out[key] = String(value)
  return out
}

function restoreValues(source?: Record<string, string>): StudioImageValues {
  const restored = { ...DEFAULT_STUDIO_IMAGE_VALUES }
  if (!source) return restored
  for (const [key, value] of Object.entries(source)) {
    if (!(key in restored)) continue
    const template = restored[key as keyof StudioImageValues]
    ;(restored as Record<string, string | number>)[key] =
      typeof template === 'number' ? Number(value) : value
  }
  return restored
}

function displayParams(values: StudioImageValues) {
  const params: Record<string, StudioGenerationParam> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value === null || value === undefined) continue
    const fallback = DEFAULT_STUDIO_IMAGE_VALUES[key as keyof StudioImageValues]
    const pinned = key === 'aspectRatio' || key === 'version' || key === 'mode'
    if (!pinned && String(value) === String(fallback)) continue
    params[key] = value
  }
  return params
}

export function StudioImage(props: { initialPrompt?: string }) {
  const { t } = useTranslation()
  const { tokens, isLoading: tokensLoading, refresh } = useStudioTokens()
  const [tokenId, setTokenId] = useState<number | null>(null)
  const [providerValue, setProviderValue] = useState('mj')
  const [values, setValues] = useState<StudioImageValues>(
    DEFAULT_STUDIO_IMAGE_VALUES
  )
  const [task, setTask] = useState<ImageTaskState>({ status: 'idle' })
  const [promptSeed, setPromptSeed] = useState<{ text: string; key: number }>()
  const [referenceSeed, setReferenceSeed] = useState<{
    urls: string[]
    key: number
  }>()
  const [pendingDelete, setPendingDelete] = useState<StudioGeneration | null>(
    null
  )
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  )
  const pollTimer = useRef<number | null>(null)
  const genScreen = useGenScreen('image')

  const pricing = useQuery({
    queryKey: ['studio-image-models'],
    queryFn: async () => await getPricing(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const providers = useMemo<StudioImageProvider[]>(() => {
    const list: StudioImageProvider[] = []
    const models = pricing.data?.data ?? []

    // Midjourney is served through its own task channels, so the static
    // version list is only offered while such a model is really configured.
    if (
      models.some(
        (model) => resolveModelProvider(model.model_name)?.name === 'Midjourney'
      )
    ) {
      list.push({
        value: 'mj',
        label: 'Midjourney',
        iconKey: 'Midjourney',
        models: MJ_VERSIONS,
      })
    }

    const vendorById = new Map(
      (pricing.data?.vendors ?? []).map((vendor) => [vendor.id, vendor])
    )
    const grouped = new Map<string, StudioImageProvider>()
    for (const model of models) {
      if (
        !(model.supported_endpoint_types ?? []).includes(IMAGE_ENDPOINT_TYPE)
      ) {
        continue
      }
      const vendorMeta = model.vendor_id
        ? vendorById.get(model.vendor_id)
        : undefined
      const vendor = model.vendor_name || vendorMeta?.name || t('Other')
      const entry = grouped.get(vendor) ?? {
        value: vendor,
        label: vendor,
        iconKey:
          model.vendor_icon ??
          vendorMeta?.icon ??
          resolveModelProvider(model.model_name)?.icon,
        models: [],
      }
      entry.models.push({ value: model.model_name, label: model.model_name })
      grouped.set(vendor, entry)
    }

    return [...list, ...grouped.values()]
  }, [pricing.data, t])

  const provider =
    providers.find((item) => item.value === providerValue) ?? providers[0]
  const token = tokens.find((item) => item.id === tokenId) ?? tokens[0]

  // The composer starts from the Midjourney defaults; once the catalog loads,
  // snap the provider and model version to a combination that really exists.
  useEffect(() => {
    const active = providers.find((item) => item.value === providerValue)
    if (!active) {
      if (providers[0]) setProviderValue(providers[0].value)
      return
    }
    const options = active.value === 'mj' ? MJ_VERSIONS : active.models
    if (options.some((option) => option.value === values.version)) return
    if (options[0]) {
      setValues((current) => ({ ...current, version: options[0].value }))
    }
  }, [providers, providerValue, values.version])

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
    const draft = takeStudioRemix('image')
    if (!draft) return
    if (draft.provider) setProviderValue(draft.provider)
    if (draft.values) setValues(restoreValues(draft.values))
    setPromptSeed({ text: draft.prompt, key: Date.now() })
    // The draft is consumed once per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setValue = <K extends keyof StudioImageValues>(
    key: K,
    value: StudioImageValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const resolveTokenKey = async (id: number) => {
    const res = await fetchTokenKey(id)
    const key = res.data?.key
    if (!key) throw new Error(res.message || t('Failed to read the token key'))
    return key
  }

  const pollTask = (mjId: string, key: string, generationId: string) => {
    pollTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/mj/task/${mjId}/fetch`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${key}` },
        })
        const data = (await res.json()) as {
          status?: string
          progress?: string
          imageUrl?: string
          failReason?: string
          buttons?: unknown
          properties?: { finalPrompt?: string }
        }
        const buttons = normalizeMjButtons(data.buttons)
        const finalPrompt = data.properties?.finalPrompt
        if (data.status === 'SUCCESS') {
          setTask({ status: 'idle' })
          const storedUrl = data.imageUrl
            ? await persistStudioMedia(data.imageUrl, 'studio_image')
            : undefined
          await updateGeneration(generationId, {
            status: 'done',
            url: storedUrl,
            buttons: buttons.length > 0 ? buttons : undefined,
            finalPrompt: finalPrompt || undefined,
          })
          return
        }
        if (data.status === 'FAILURE' || data.status === 'CANCEL') {
          const message = data.failReason || t('Generation failed')
          setTask({ status: 'error', message })
          await updateGeneration(generationId, {
            status: 'error',
            error: message,
          })
          return
        }
        setTask({ status: 'pending', progress: data.progress })
        const percent = Number.parseInt(data.progress ?? '', 10)
        await updateGeneration(generationId, {
          taskStatus: data.status,
          progress: Number.isFinite(percent) ? percent : undefined,
          buttons: buttons.length > 0 ? buttons : undefined,
        })
        pollTask(mjId, key, generationId)
      } catch (error) {
        const message = (error as Error).message
        setTask({ status: 'error', message })
        await updateGeneration(generationId, {
          status: 'error',
          error: message,
        })
      }
    }, MJ_POLL_INTERVAL_MS)
  }

  const runGeneration = async (
    prompt: string,
    images: string[],
    options?: RunOptions
  ) => {
    const activeValues = options?.values ?? values
    const activeProvider =
      providers.find(
        (item) => item.value === (options?.provider ?? providerValue)
      ) ?? provider

    if (!token) {
      toast.error(
        t('No available tokens. Create one in Token Management first.')
      )
      return
    }
    if (!activeProvider) return

    const generationId = newGenerationId('image')
    const record: StudioGeneration = {
      id: generationId,
      kind: 'image',
      status: 'running',
      prompt,
      model:
        activeProvider.value === 'mj'
          ? 'Midjourney'
          : String(activeValues.version),
      provider: activeProvider.value,
      schemaId: String(activeValues.version),
      endpoint:
        activeProvider.value === 'mj'
          ? midjourneyEndpoint(activeValues.mode, '/mj/submit/imagine')
          : '/v1/images/generations',
      params: displayParams(activeValues),
      values: storedValues(activeValues),
      refImages: images.length > 0 ? images : undefined,
      tokenId: token.id,
      tokenName: token.name,
      createdAt: Date.now(),
    }
    await saveGeneration(record)

    setTask({ status: 'submitting' })
    try {
      const key = await resolveTokenKey(token.id)

      if (activeProvider.value === 'mj') {
        const body: Record<string, unknown> = {
          prompt: buildMidjourneyPrompt(prompt, activeValues),
          mode: activeValues.mode,
        }
        if (images.length > 0) body.base64Array = images

        const res = await fetch(
          midjourneyEndpoint(activeValues.mode, '/mj/submit/imagine'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
          }
        )
        const data = (await res.json()) as {
          code?: number
          description?: string
          result?: string
          error?: { message?: string }
          message?: string
        }
        if (!data.result) {
          throw new Error(
            data.error?.message ||
              data.description ||
              data.message ||
              t('Failed to submit the MJ task')
          )
        }
        setTask({ status: 'pending' })
        await updateGeneration(generationId, { taskId: data.result })
        pollTask(data.result, key, generationId)
        return
      }

      const res = await fetch('/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: activeValues.version,
          prompt,
          n: 1,
        }),
      })
      const data = (await res.json()) as {
        data?: { url?: string; b64_json?: string }[]
        error?: { message?: string }
        message?: string
      }
      const urls: string[] = []
      for (const item of data.data ?? []) {
        if (item.url) {
          urls.push(item.url)
        } else if (item.b64_json) {
          urls.push(`data:image/png;base64,${item.b64_json}`)
        }
      }
      if (urls.length === 0) {
        throw new Error(
          data.error?.message || data.message || t('No image was returned.')
        )
      }
      setTask({ status: 'idle' })
      await updateGeneration(generationId, {
        status: 'done',
        url: urls[0],
      })
    } catch (error) {
      const message = (error as Error).message
      setTask({ status: 'error', message })
      await updateGeneration(generationId, { status: 'error', error: message })
    }
  }

  const submit = (prompt: string, images: string[]) => {
    void runGeneration(prompt, images)
  }

  const regenerate = async (item: StudioGeneration) => {
    genScreen.closeViewer()
    if (item.status === 'error' && item.taskId && item.tokenId != null) {
      try {
        const key = await resolveTokenKey(item.tokenId)
        setTask({ status: 'pending' })
        await updateGeneration(item.id, { status: 'running', error: undefined })
        pollTask(item.taskId, key, item.id)
        return
      } catch {
        // Fall back to a fresh submission when the token key is unavailable.
      }
    }
    void runGeneration(item.prompt, [], {
      provider: item.provider,
      values: restoreValues(item.values),
    })
  }

  const runMjAction = async (
    artwork: StudioGeneration,
    button: StudioMjButton,
    options?: { zoom?: number }
  ) => {
    if (!artwork.taskId) {
      toast.error(
        t(
          'The original task information is missing, so this action cannot be performed.'
        )
      )
      return
    }
    const activeToken =
      tokens.find((item) => item.id === artwork.tokenId) ?? token
    if (!activeToken) {
      toast.error(t('No available tokens, unable to perform this action'))
      return
    }
    genScreen.closeViewer()
    const values = restoreValues(artwork.values)
    const generationId = newGenerationId('image')
    const record: StudioGeneration = {
      ...artwork,
      id: generationId,
      status: 'running',
      url: undefined,
      endpoint: mjSubmitPath(values, '/mj/submit/action'),
      params: {
        operation: t(mjButtonLabelKey(button)),
        ...(options?.zoom ? { zoom: `${options.zoom}x` } : {}),
      },
      tokenId: activeToken.id,
      tokenName: activeToken.name,
      taskId: undefined,
      taskStatus: undefined,
      buttons: undefined,
      finalPrompt: undefined,
      mjSource: {
        taskId: artwork.taskId,
        customId: button.customId,
        zoom: options?.zoom,
      },
      progress: undefined,
      error: undefined,
      sourceShareId: undefined,
      submittedShareId: undefined,
      createdAt: Date.now(),
    }
    await saveGeneration(record)

    setTask({ status: 'submitting' })
    try {
      const key = await resolveTokenKey(activeToken.id)
      const res = await fetch(record.endpoint ?? '/mj/submit/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          taskId: artwork.taskId,
          customId: button.customId,
        }),
      })
      const data = (await res.json()) as {
        code?: number
        result?: string
        description?: string
        properties?: { finalPrompt?: string }
        error?: { message?: string }
      }
      let taskId = data.result
      if (!taskId) {
        throw new Error(
          data.error?.message ||
            data.description ||
            t('Failed to submit the MJ action')
        )
      }
      if (data.code === 21) {
        const zoomPrompt =
          options?.zoom && isMjCustomZoom(button)
            ? `${data.properties?.finalPrompt ?? artwork.finalPrompt ?? artwork.prompt} --zoom ${options.zoom}`
            : undefined
        const modalRes = await fetch(mjSubmitPath(values, '/mj/submit/modal'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            taskId,
            ...(zoomPrompt ? { prompt: zoomPrompt } : {}),
          }),
        })
        const modalData = (await modalRes.json()) as {
          result?: string
          description?: string
          error?: { message?: string }
        }
        taskId = modalData.result
        if (!taskId) {
          throw new Error(
            modalData.error?.message ||
              modalData.description ||
              t('Failed to confirm the MJ action')
          )
        }
      }
      setTask({ status: 'pending' })
      await updateGeneration(generationId, { taskId })
      pollTask(taskId, key, generationId)
    } catch (error) {
      const message = (error as Error).message
      setTask({ status: 'error', message })
      await updateGeneration(generationId, { status: 'error', error: message })
    }
  }

  const share = useArtworkShare()
  const favorite = useArtworkFavorite('image')

  const applySameStyle = (item: StudioGeneration) => {
    genScreen.closeViewer()
    setValues(restoreValues(item.values))
    if (item.provider) setProviderValue(item.provider)
    if (item.refImages?.length) {
      setReferenceSeed({ urls: item.refImages, key: Date.now() })
    }
    setPromptSeed({ text: item.prompt, key: Date.now() })
  }

  const editWithReference = (item: StudioGeneration) => {
    if (!item.url) return
    genScreen.closeViewer()
    setReferenceSeed({ urls: [item.url], key: Date.now() })
  }

  const uploadReference = async (file: File) => {
    if (!token) {
      throw new Error(
        t('No available tokens. Create one in Token Management first.')
      )
    }
    const key = await resolveTokenKey(token.id)
    const data = await readFileAsDataUrl(file)
    const res = await fetch('/mj/submit/upload-discord-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ base64Array: [data] }),
    })
    const payload = (await res.json()) as {
      description?: string
      result?: string[]
      error?: { message?: string }
    }
    const url = payload.result?.[0]
    if (!url) {
      throw new Error(
        payload.error?.message ||
          payload.description ||
          t('Upload failed. Please try again.')
      )
    }
    return url
  }

  const versionOptions =
    provider?.value === 'mj' ? MJ_VERSIONS : (provider?.models ?? [])

  const masonryItems = useMemo(
    () =>
      genScreen.filtered.map((item) => ({
        id: item.id,
        aspect_ratio: generationAspectRatio(item),
        artwork: item,
      })),
    [genScreen.filtered]
  )

  const composer = (
    <StudioImageInput
      chips={PROMPT_CHIPS}
      disabled={!token}
      floating={galleryActive}
      greeting={
        <StudioGreeting
          icon={ImagePlay}
          iconClassName='text-primary/70'
          question={t('what would you like to create?')}
        />
      }
      initialPrompt={props.initialPrompt}
      onProviderChange={(value) => {
        setProviderValue(value)
        const next = providers.find((entry) => entry.value === value)
        if (next?.models[0]) setValue('version', next.models[0].value)
      }}
      onRatioChange={(value) => setValue('aspectRatio', value)}
      onResetValues={() => setValues(DEFAULT_STUDIO_IMAGE_VALUES)}
      onTokenChange={setTokenId}
      onTokenRefresh={() => void refresh()}
      onUploadReference={uploadReference}
      onValuesChange={setValue}
      onVersionChange={(value) => setValue('version', value)}
      onSubmit={submit}
      promptSeed={promptSeed}
      provider={provider?.value ?? ''}
      providers={providers}
      ratio={values.aspectRatio}
      ratios={MJ_ASPECT_RATIOS}
      referenceSeed={referenceSeed}
      submitting={task.status === 'submitting'}
      tokenId={token?.id ?? null}
      tokens={tokens}
      tokensLoading={tokensLoading}
      values={values}
      version={values.version}
      versionOptions={versionOptions}
    />
  )

  const viewing = genScreen.viewing

  let gallery: ReactNode
  if (genScreen.showShares) {
    gallery = (
      <StudioShareGallery
        kind='image'
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
            onEdit={() => editWithReference(item.artwork)}
            onFavorite={() => void favorite.toggle(item.artwork)}
            onMediaDims={(dims) => void updateGeneration(item.artwork.id, dims)}
            onMjOp={(button) => void runMjAction(item.artwork, button)}
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
              historyLabel={t('My artwork')}
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
                onMjOp={(button, options) =>
                  void runMjAction(viewing, button, options)
                }
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
