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
import { getRouteApi } from '@tanstack/react-router'
import {
  Bell,
  Link2,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundPen,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Main } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TitledCard } from '@/components/ui/titled-card'
import { AccountActionCard } from '@/features/security/components/account-action-card'
import { AccountBindings } from '@/features/security/components/account-bindings'
import { LoginSessionsCard } from '@/features/security/components/login-sessions-card'
import { PasskeyCard } from '@/features/security/components/passkey-card'
import { PrivacyCard } from '@/features/security/components/privacy-card'
import { TwoFACard } from '@/features/security/components/two-fa-card'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import { CheckinCalendarCard } from './components/checkin-calendar-card'
import { LanguagePreferencesCard } from './components/language-preferences-card'
import { ProfileBanner } from './components/profile-banner'
import { ProfileEditCard } from './components/profile-edit-card'
import { SidebarModulesCard } from './components/sidebar-modules-card'
import { NotificationTab } from './components/tabs/notification-tab'
import { useProfile } from './hooks'

const routeApi = getRouteApi('/_authenticated/profile/')

const TABS = [
  { value: 'overview', icon: UserRoundPen },
  { value: 'bindings', icon: Link2 },
  { value: 'notifications', icon: Bell },
  { value: 'security', icon: ShieldCheck },
  { value: 'storage', icon: SlidersHorizontal },
] as const

export type ProfileTab = (typeof TABS)[number]['value']

export function Profile() {
  const { t } = useTranslation()
  const { tab } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { profile, loading, refreshProfile } = useProfile()
  const { status } = useStatus()
  const permissions = useAuthStore((s) => s.auth.user?.permissions)

  const activeTab: ProfileTab = TABS.some((item) => item.value === tab)
    ? (tab as ProfileTab)
    : 'overview'

  const tabLabels: Record<ProfileTab, string> = {
    overview: t('Edit Profile'),
    bindings: t('Account Linking'),
    notifications: t('Notification Subscriptions'),
    security: t('Security Settings'),
    storage: t('Storage Settings'),
  }

  const checkinEnabled = status?.checkin_enabled === true
  const turnstileEnabled = !!(
    status?.turnstile_check && status?.turnstile_site_key
  )
  const turnstileSiteKey = status?.turnstile_site_key || ''
  const canConfigureSidebar = permissions?.sidebar_settings !== false

  return (
    <Main>
      <div className='min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-6'>
        <CardStaggerContainer className='mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6'>
          <CardStaggerItem>
            <ProfileBanner profile={profile} loading={loading} />
          </CardStaggerItem>

          <CardStaggerItem>
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                navigate({ search: (prev) => ({ ...prev, tab: value }) })
              }
              className='w-full'
            >
              <TabsList className='h-auto w-full flex-wrap justify-start gap-1 p-1'>
                {TABS.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className='flex items-center gap-1.5'
                  >
                    <item.icon className='h-3.5 w-3.5' />
                    {tabLabels[item.value]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent
                value='overview'
                className='mt-4 space-y-4 sm:mt-6 sm:space-y-6'
              >
                <ProfileEditCard
                  profile={profile}
                  loading={loading}
                  onProfileUpdate={refreshProfile}
                />
                <LanguagePreferencesCard
                  profile={profile}
                  onProfileUpdate={refreshProfile}
                />
                {checkinEnabled && (
                  <CheckinCalendarCard
                    checkinEnabled={checkinEnabled}
                    turnstileEnabled={turnstileEnabled}
                    turnstileSiteKey={turnstileSiteKey}
                  />
                )}
                {canConfigureSidebar && <SidebarModulesCard />}
              </TabsContent>

              <TabsContent value='bindings' className='mt-4 sm:mt-6'>
                <AccountBindings profile={profile} onUpdate={refreshProfile} />
              </TabsContent>

              <TabsContent value='notifications' className='mt-4 sm:mt-6'>
                <TitledCard
                  title={t('Notification Subscriptions')}
                  description={t(
                    'Choose how you want to receive quota and system alerts'
                  )}
                  icon={<Bell className='h-4 w-4' />}
                  iconTone='info'
                  disableHoverEffect
                >
                  <NotificationTab
                    profile={profile}
                    onUpdate={refreshProfile}
                  />
                </TitledCard>
              </TabsContent>

              <TabsContent
                value='security'
                className='mt-4 space-y-4 sm:mt-6 sm:space-y-6'
              >
                <PasskeyCard loading={loading} />
                <TwoFACard loading={loading} />
                {profile && (
                  <AccountActionCard
                    action='password'
                    username={profile.username}
                    hasPassword={profile.has_password}
                    onUpdate={refreshProfile}
                  />
                )}
                <LoginSessionsCard />
              </TabsContent>

              <TabsContent
                value='storage'
                className='mt-4 space-y-4 sm:mt-6 sm:space-y-6'
              >
                {profile && (
                  <PrivacyCard profile={profile} onUpdate={refreshProfile} />
                )}
              </TabsContent>
            </Tabs>
          </CardStaggerItem>
        </CardStaggerContainer>
      </div>
    </Main>
  )
}
