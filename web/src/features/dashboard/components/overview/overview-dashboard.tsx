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
import { CreditCard, KeyRound, TerminalSquare } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'
import { useAuthStore } from '@/stores/auth-store'

import { useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { SummaryCards } from './summary-cards'
import { TodayPanel } from './today-panel'

function getGreetingKey(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function WelcomeHeader() {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)

  const greetingKey = useMemo(
    () => getGreetingKey(new Date().getHours()),
    []
  )
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(toIntlLocale(i18n.language) ?? 'en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(new Date()),
    [i18n.language]
  )

  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div className='min-w-0'>
        <h2 className='truncate text-xl font-bold tracking-tight sm:text-2xl'>
          {t(greetingKey)}
          {user?.username ? `，${user.username}` : ''}
        </h2>
        <p className='text-muted-foreground mt-1 text-sm'>{dateLabel}</p>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button size='sm' render={<Link to='/keys' />}>
          <KeyRound data-icon='inline-start' />
          {t('Create API Key')}
        </Button>
        <Button size='sm' variant='outline' render={<Link to='/wallet' />}>
          <CreditCard data-icon='inline-start' />
          {t('Add credits')}
        </Button>
        <Button size='sm' variant='outline' render={<Link to='/playground' />}>
          <TerminalSquare data-icon='inline-start' />
          {t('Playground')}
        </Button>
      </div>
    </div>
  )
}

export function OverviewDashboard() {
  const { t } = useTranslation()
  const { announcements: showAnnouncementsPanel } =
    useDashboardContentVisibility()

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Overview')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          <WelcomeHeader />
          <SummaryCards />
          <TodayPanel />
          {showAnnouncementsPanel && <AnnouncementsPanel />}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
