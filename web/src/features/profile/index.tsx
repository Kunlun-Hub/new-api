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
import { Bell, HardDrive, Link2, ShieldCheck, UserRoundPen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ConsoleBreadcrumb, SectionPageLayout } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccessTokenCard } from '@/features/security/components/access-token-card'
import { AccountActionCard } from '@/features/security/components/account-action-card'
import { AccountBindings } from '@/features/security/components/account-bindings'
import { TwoFACard } from '@/features/security/components/two-fa-card'

import { ProfileBanner } from './components/profile-banner'
import { ProfileEditCard } from './components/profile-edit-card'
import { StorageBucketCard } from './components/storage-bucket-card'
import { NotificationTab } from './components/tabs/notification-tab'
import { useProfile } from './hooks'

const routeApi = getRouteApi('/_authenticated/profile/')

const TABS = [
  { value: 'bindings', icon: Link2 },
  { value: 'notifications', icon: Bell },
  { value: 'overview', icon: UserRoundPen },
  { value: 'security', icon: ShieldCheck },
  { value: 'storage', icon: HardDrive },
] as const

export type ProfileTab = (typeof TABS)[number]['value']

export function Profile() {
  const { t } = useTranslation()
  const { tab } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { profile, loading, refreshProfile } = useProfile()

  const activeTab: ProfileTab = TABS.some((item) => item.value === tab)
    ? (tab as ProfileTab)
    : 'bindings'

  const tabLabels: Record<ProfileTab, string> = {
    overview: t('Edit Profile'),
    bindings: t('Account Linking'),
    notifications: t('Notification Subscriptions'),
    security: t('Security Settings'),
    storage: t('Storage Settings'),
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Breadcrumb>
        <ConsoleBreadcrumb
          items={[
            { label: t('Dashboard'), href: '/dashboard/overview' },
            { label: t('Profile') },
          ]}
        />
      </SectionPageLayout.Breadcrumb>
      <SectionPageLayout.Title>{t('Profile')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
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
              <TabsList className='border-border/40 bg-background/40 h-9! w-fit max-w-full flex-wrap justify-start gap-1 rounded-full border p-1'>
                {TABS.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className='text-foreground data-active:bg-foreground data-active:text-background h-7 flex-none rounded-full border-0 px-3 py-1 shadow-none'
                  >
                    <item.icon className='max-md:hidden' />
                    {tabLabels[item.value]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value='bindings' className='mt-5'>
                <div className='space-y-4'>
                  <p className='text-muted-foreground px-1 text-sm'>
                    {t(
                      'Link third-party accounts for quick sign-in and recovery'
                    )}
                  </p>
                  <AccountBindings
                    profile={profile}
                    onUpdate={refreshProfile}
                  />
                </div>
              </TabsContent>

              <TabsContent value='notifications' className='mt-5'>
                <div className='space-y-4'>
                  <p className='text-muted-foreground px-1 text-sm'>
                    {t(
                      'Subscribe to events and you will be notified when they trigger'
                    )}
                  </p>
                  <NotificationTab
                    profile={profile}
                    onUpdate={refreshProfile}
                  />
                </div>
              </TabsContent>

              <TabsContent value='overview' className='mt-5'>
                <div className='space-y-4'>
                  <p className='text-muted-foreground px-1 text-sm'>
                    {t(
                      'The username is used to sign in and cannot be edited; it changes automatically after you rebind the email!'
                    )}
                  </p>
                  <ProfileEditCard
                    profile={profile}
                    loading={loading}
                    onProfileUpdate={refreshProfile}
                  />
                </div>
              </TabsContent>

              <TabsContent value='security' className='mt-5'>
                <div className='space-y-4'>
                  <p className='text-muted-foreground px-1 text-sm'>
                    {t('Manage access tokens and account security carefully')}
                  </p>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <TwoFACard loading={loading} />
                    <AccessTokenCard />
                    {profile && (
                      <AccountActionCard
                        action='delete'
                        username={profile.username}
                        onUpdate={refreshProfile}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='storage' className='mt-5'>
                <div className='space-y-4'>
                  <p className='text-muted-foreground px-1 text-sm'>
                    {t(
                      'Configure an S3-compatible bucket (Cloudflare R2, Alibaba Cloud OSS, Tencent Cloud COS, AWS S3, MinIO and more). Images and videos from the API and this site will be stored in your bucket for long-term retention; if you do not know what this is, ask an AI.'
                    )}
                  </p>
                  <StorageBucketCard />
                </div>
              </TabsContent>
            </Tabs>
          </CardStaggerItem>
        </CardStaggerContainer>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
