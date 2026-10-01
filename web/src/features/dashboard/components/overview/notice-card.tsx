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
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NoticeList } from '@/components/notice-list'
import { Card, CardContent } from '@/components/ui/card'
import {
  PillTabs,
  PillTabsContent,
  PillTabsList,
  PillTabsTrigger,
} from '@/components/ui/pill-tabs'
import {
  useAnnouncements,
  usePriceNotices,
} from '@/features/dashboard/hooks/use-status-data'
import { cn } from '@/lib/utils'

const CARD_CLASS =
  'border border-border/40 ring-0 bg-transparent bg-linear-to-br from-foreground/3 via-transparent to-transparent hover:border-border/60'

export function NoticeCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('system_notice')
  const { items: announcements, loading: announcementsLoading } =
    useAnnouncements()
  const { items: priceNotices, loading: priceNoticesLoading } =
    usePriceNotices()

  return (
    <Card className={cn(CARD_CLASS, className)}>
      <CardContent className='px-0'>
        <PillTabs value={tab} onValueChange={setTab} className='w-full'>
          <div className='flex items-center justify-between px-4'>
            <PillTabsList className='border-border/40 bg-background/40 h-9! border'>
              <PillTabsTrigger value='system_notice'>
                {t('System Notice')}
              </PillTabsTrigger>
              <PillTabsTrigger value='price_notice'>
                {t('Price Updates')}
              </PillTabsTrigger>
            </PillTabsList>
            <Link
              to='/profile'
              search={{ tab: 'notifications' }}
              className='text-muted-foreground text-xs'
            >
              {t('Subscribe')}
            </Link>
          </div>

          <PillTabsContent value='system_notice' className='mt-4'>
            <NoticeList
              items={announcements}
              variant='system'
              scrollClassName='h-130'
              emptyText={t('No notices yet')}
              loading={announcementsLoading}
            />
          </PillTabsContent>

          <PillTabsContent value='price_notice' className='mt-4'>
            <NoticeList
              items={priceNotices}
              variant='price'
              scrollClassName='h-130'
              emptyText={t('No notices yet')}
              loading={priceNoticesLoading}
            />
          </PillTabsContent>
        </PillTabs>
      </CardContent>
    </Card>
  )
}
