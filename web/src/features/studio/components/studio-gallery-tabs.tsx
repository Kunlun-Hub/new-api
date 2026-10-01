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
import { useTranslation } from 'react-i18next'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { StudioGalleryTab } from '../hooks/use-gen-screen'

type StudioGalleryTabsProps = {
  tab: StudioGalleryTab
  onTabChange: (tab: StudioGalleryTab) => void
  historyLabel: string
}

/** History / favorites switch shown on top of the studio gallery. */
export function StudioGalleryTabs(props: StudioGalleryTabsProps) {
  const { t } = useTranslation()

  return (
    <Tabs
      value={props.tab}
      onValueChange={(value) => props.onTabChange(value as StudioGalleryTab)}
    >
      <TabsList className='border-border/60 h-auto! w-fit flex-wrap gap-1 rounded-full border bg-transparent p-1 backdrop-blur-sm'>
        <TabsTrigger
          className='text-primary data-active:bg-primary! data-active:text-primary-foreground! h-7 flex-none rounded-full px-3 py-1 shadow-none'
          value='history'
        >
          {props.historyLabel}
        </TabsTrigger>
        <TabsTrigger
          className='text-primary data-active:bg-primary! data-active:text-primary-foreground! h-7 flex-none rounded-full px-3 py-1 shadow-none'
          value='favorites'
        >
          {t('Favorites')}
        </TabsTrigger>
        <TabsTrigger
          className='text-primary data-active:bg-primary! data-active:text-primary-foreground! h-7 flex-none rounded-full px-3 py-1 shadow-none'
          value='mine'
        >
          {t('My shares')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
