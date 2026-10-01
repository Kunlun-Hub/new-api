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
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { requireServerSuccess } from '@/lib/server-error-message'

import { submitStudioShare, uploadStudioShareMedia } from '../discover/api'
import { updateGeneration, type StudioGeneration } from '../lib/generations'
import { serializeStudioShareArtwork } from '../lib/shares'

/** Media that only exists inside the browser must be uploaded first. */
async function uploadLocalMedia(item: StudioGeneration) {
  const url = item.url ?? ''
  const blob = await (await fetch(url)).blob()
  const extension = item.kind === 'video' ? 'mp4' : 'png'
  const response = uploadStudioShareMedia(blob, `artwork.${extension}`)
  return requireServerSuccess(await response).data.url
}

/**
 * Submits a finished artwork for review, mirroring the reference flow: confirm
 * first, upload device-only media, then store the submission id on the record.
 */
export function useArtworkShare() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<StudioGeneration | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(new Set<string>())

  const confirmSubmit = useCallback(async () => {
    const item = pending
    setPending(null)
    if (!item) return
    if (inFlight.current.has(item.id)) return
    inFlight.current.add(item.id)
    setSubmitting(true)
    try {
      const artwork = { ...item }
      if (
        artwork.url?.startsWith('data:') ||
        artwork.url?.startsWith('blob:')
      ) {
        try {
          const uploaded = await uploadLocalMedia(artwork)
          artwork.url = uploaded
          await updateGeneration(artwork.id, { url: uploaded })
        } catch {
          toast.error(t('Unable to upload this artwork for sharing.'))
          return
        }
      }
      const response = await submitStudioShare(
        artwork.kind,
        serializeStudioShareArtwork(artwork)
      )
      const created = requireServerSuccess(response).data
      await updateGeneration(item.id, { submittedShareId: created.id })
      await queryClient.invalidateQueries({ queryKey: ['studio-shares'] })
      toast.success(t('Submitted for review'))
    } catch (error) {
      const reason = error instanceof Error ? error.message : ''
      toast.error(
        reason
          ? t('Unable to submit this creation: {{reason}}', { reason })
          : t('Unable to submit this creation')
      )
    } finally {
      inFlight.current.delete(item.id)
      setSubmitting(false)
    }
  }, [pending, queryClient, t])

  return {
    /** Artwork waiting for the confirmation dialog. */
    pending,
    submitting,
    submit: setPending,
    cancel: useCallback(() => setPending(null), []),
    confirmSubmit,
    isDisabled: useCallback(
      (item: StudioGeneration) =>
        inFlight.current.has(item.id) || item.submittedShareId != null,
      []
    ),
  }
}
