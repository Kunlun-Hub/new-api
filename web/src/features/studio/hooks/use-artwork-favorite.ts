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
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  toggleGenerationFavorite,
  updateGeneration,
  type StudioGeneration,
} from '../lib/generations'
import {
  isStudioStoredMedia,
  persistStudioMedia,
  persistStudioVideo,
  studioVideoHeaders,
} from '../lib/studio-upload'

/**
 * Favorites an artwork, copying provider media into the caller's storage first
 * so the favorite keeps working after the provider URL expires. The reference
 * behaves the same way; a failed copy rolls the favorite back.
 */
export function useArtworkFavorite(kind: 'image' | 'video') {
  const { t } = useTranslation()

  const toggle = useCallback(
    async (item: StudioGeneration) => {
      if (item.favorite) {
        await toggleGenerationFavorite(item)
        return
      }

      await toggleGenerationFavorite(item)
      if (!item.url || item.status !== 'done') return
      if (await isStudioStoredMedia(item.url)) return

      const stored: { url: string; coverUrl?: string } =
        kind === 'video'
          ? await persistStudioVideo(item.url, {
              headers: await studioVideoHeaders(item.url, item.tokenId),
            })
          : { url: await persistStudioMedia(item.url, 'studio_image') }
      // The persist helpers return the original address when every copy path
      // fails; only an unchanged, unstored address is a real failure.
      if (stored.url === item.url && !stored.coverUrl) {
        await updateGeneration(item.id, { favorite: false })
        toast.error(t('Failed to update favorites. Please try again later.'))
        return
      }
      await updateGeneration(item.id, {
        url: stored.url,
        coverUrl: stored.coverUrl,
      })
    },
    [kind, t]
  )

  return { toggle }
}
