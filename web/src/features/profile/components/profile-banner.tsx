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
import { CalendarPlus, Clock, Globe, Layers, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import dayjs from '@/lib/dayjs'
import { formatCompactNumber, formatQuotaFixed } from '@/lib/format'
import { getRoleLabel } from '@/lib/roles'
import { cn } from '@/lib/utils'

import { getDisplayName } from '../lib/format'
import type { UserProfile } from '../types'

// ============================================================================
// Profile Banner Component
// ============================================================================

interface ProfileBannerProps {
  profile: UserProfile | null
  loading: boolean
}

const CARD_CLASS =
  'gap-0 overflow-hidden rounded-xl border border-border/40 bg-transparent py-0 ring-0'

export function ProfileBanner({ profile, loading }: ProfileBannerProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Card data-card-hover='false' className={CARD_CLASS}>
        <div className='bg-muted h-20 animate-pulse sm:h-24' />
        <CardContent className='pb-5 lg:px-6'>
          <div className='flex items-center gap-4 max-lg:flex-col lg:items-end'>
            <Skeleton className='-mt-16 size-26 shrink-0 rounded-full sm:-mt-20 sm:size-30' />
            <div className='flex flex-1 flex-col gap-3 max-lg:items-center'>
              <Skeleton className='h-7 w-48' />
              <Skeleton className='h-7 w-64 rounded-full' />
            </div>
            <Skeleton className='h-16 w-72 rounded-xl' />
          </div>
          <div className='border-border/40 mt-4 border-t pt-4'>
            <Skeleton className='h-4 w-80' />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) return null

  const displayName = getDisplayName(profile)
  const avatarName = profile.username || displayName
  const avatarFallback = getUserAvatarFallback(avatarName)
  const avatarFallbackStyle = getUserAvatarStyle(avatarName)
  const roleLabel = getRoleLabel(profile.role)

  const stats = [
    { label: t('Account Balance'), value: formatQuotaFixed(profile.quota) },
    { label: t('Total Spent'), value: formatQuotaFixed(profile.used_quota) },
    {
      label: t('Request Count'),
      value: formatCompactNumber(profile.request_count),
    },
  ]

  const meta = [
    {
      icon: CalendarPlus,
      label: t('Joined'),
      value: profile.created_at
        ? dayjs.unix(profile.created_at).fromNow()
        : '-',
    },
    {
      icon: Clock,
      label: t('Last login'),
      value: profile.last_login_at
        ? dayjs.unix(profile.last_login_at).fromNow()
        : '-',
    },
    ...(profile.last_login_ip
      ? [
          {
            icon: Globe,
            label: t('Login IP'),
            value: profile.last_login_ip,
          },
        ]
      : []),
  ]

  return (
    <Card data-card-hover='false' className={CARD_CLASS}>
      <div aria-hidden='true' className='relative h-20 overflow-hidden sm:h-24'>
        <div className='absolute inset-0 bg-linear-120 from-cyan-500/35 via-violet-500/25 to-sky-400/20 dark:from-cyan-500/45 dark:via-violet-100/30 dark:to-sky-500/25' />
        <div className='absolute inset-0 bg-[radial-gradient(100%_140%_at_12%_-10%,rgba(255,255,255,0.4),transparent_55%)] dark:bg-[radial-gradient(100%_140%_at_12%_-10%,rgba(255,255,255,0.08),transparent_55%)]' />
      </div>

      <CardContent className='pb-5 lg:px-6'>
        <div className='flex items-center gap-4 max-lg:flex-col lg:items-end'>
          <div
            className='border-background bg-background ring-border/40 relative z-10 -mt-16 flex size-26 shrink-0 items-center justify-center rounded-full border-4 text-2xl font-semibold text-white shadow-lg ring-1 sm:-mt-20 sm:size-30'
            style={avatarFallbackStyle}
          >
            {avatarFallback}
          </div>

          <div className='flex min-w-0 flex-1 flex-col gap-3'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-2 max-lg:justify-center'>
              <h2 className='text-xl font-semibold tracking-tight'>
                {displayName}
              </h2>
              <Badge variant='secondary'>
                <ShieldCheck className='size-3.5' />
                {roleLabel}
              </Badge>
              <Badge variant='outline' className='border-border/60'>
                <Layers className='size-3.5' />
                {profile.group}
              </Badge>
            </div>

            <div className='flex flex-wrap items-center gap-2 max-lg:justify-center'>
              {profile.email && (
                <CopyButton
                  value={profile.email}
                  variant='outline'
                  size='xs'
                  className='group border-border/60 h-7 gap-x-2 rounded-full font-mono text-xs'
                  aria-label={t('Copy email address')}
                >
                  {profile.email}
                </CopyButton>
              )}
              <CopyButton
                value={String(profile.id)}
                variant='outline'
                size='xs'
                className='group border-border/60 h-7 gap-x-2 rounded-full text-xs'
                aria-label={t('Copy user ID')}
              >
                <span className='bg-foreground text-background rounded px-1 text-[10px] font-bold'>
                  ID
                </span>
                {profile.id}
              </CopyButton>
            </div>
          </div>

          <div className='border-border/40 grid grid-cols-3 gap-px overflow-hidden rounded-xl border max-lg:w-full'>
            {stats.map((item, index) => (
              <dl
                key={item.label}
                className={cn(
                  'px-4 py-2.5 text-center',
                  index > 0 && 'border-border/40 border-l border-dashed'
                )}
              >
                <dt className='text-sm font-semibold'>{item.value}</dt>
                <dd className='text-muted-foreground mt-0.5 text-xs'>
                  {item.label}
                </dd>
              </dl>
            ))}
          </div>
        </div>

        <div className='text-muted-foreground border-border/40 mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs max-lg:justify-center max-md:rounded-xl max-md:border max-md:p-4'>
          {meta.map((item) => (
            <span key={item.label} className='flex items-center gap-1.5'>
              <item.icon className='size-3.5' aria-hidden='true' />
              {item.label}:
              <span className='text-foreground/80'>{item.value}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
