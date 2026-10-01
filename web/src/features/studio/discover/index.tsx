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
import { useNavigate } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { StudioShareGallery } from '@/features/studio/components/studio-share-gallery'
import { StudioShell } from '@/features/studio/components/studio-shell'
import type { StudioGeneration } from '@/features/studio/lib/generations'
import { saveStudioRemix } from '@/features/studio/lib/remix'

export function StudioDiscover() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const applySameStyle = useCallback(
    (artwork: StudioGeneration) => {
      saveStudioRemix(artwork)
      void navigate({
        to: artwork.kind === 'video' ? '/studio/video' : '/studio/image',
        search: { prompt: artwork.prompt },
      })
    },
    [navigate]
  )

  return (
    <StudioShell>
      <div
        ref={scrollRef}
        className='thin-scrollbar h-full overflow-y-auto px-4 pb-20 md:px-6'
      >
        <div className='from-background via-background/85 sticky top-0 z-20 flex justify-center bg-linear-to-b px-4 py-8'>
          <h1 className='flex items-center justify-center gap-2 text-center text-2xl font-semibold tracking-tight'>
            <Compass className='size-7' />
            {t('Discover inspiration')}
          </h1>
        </div>

        <StudioShareGallery
          kind='all'
          onSameStyle={applySameStyle}
          scope='discover'
          scrollRef={scrollRef}
        />
      </div>
    </StudioShell>
  )
}
