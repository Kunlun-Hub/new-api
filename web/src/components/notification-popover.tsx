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
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NoticeList } from '@/components/notice-list'
import { Button } from '@/components/ui/button'
import {
  PillTabs,
  PillTabsContent,
  PillTabsList,
  PillTabsTrigger,
} from '@/components/ui/pill-tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotifications } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

export function NotificationPopover({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { announcements, priceNotices, loading, hasUnread, markSeen } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('system')

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      markSeen()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className={cn('relative size-8', className)}
            aria-label={t('Notifications')}
          />
        }
      >
        <Bell className='size-4.5 pt-0.5' />
        {hasUnread ? (
          <span className='absolute top-1.25 right-1.5 h-2 w-2 rounded-full bg-red-500' />
        ) : null}
      </PopoverTrigger>

      <PopoverContent align='end' className='w-96 p-0'>
        <PillTabs value={tab} onValueChange={setTab}>
          <div className='flex items-center justify-between px-3 pt-3'>
            <PillTabsList className='border-border/40 bg-background/40 h-9 border'>
              <PillTabsTrigger value='system'>
                {t('System Notice')}
              </PillTabsTrigger>
              <PillTabsTrigger value='price'>
                {t('Price Updates')}
              </PillTabsTrigger>
            </PillTabsList>
          </div>

          <PillTabsContent value='system' className='mt-3 pb-3'>
            <NoticeList
              items={announcements}
              variant='system'
              scrollClassName='h-96'
              emptyText={t('No notices yet')}
              loading={loading}
            />
          </PillTabsContent>

          <PillTabsContent value='price' className='mt-3 pb-3'>
            <NoticeList
              items={priceNotices}
              variant='price'
              scrollClassName='h-96'
              emptyText={t('No notices yet')}
              loading={loading}
            />
          </PillTabsContent>
        </PillTabs>
      </PopoverContent>
    </Popover>
  )
}
