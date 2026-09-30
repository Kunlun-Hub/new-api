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
import { useQuery } from '@tanstack/react-query'
import { Gift, Lock, LockOpen, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CopyButton } from '@/components/copy-button'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { transferAffiliateQuota } from '@/features/wallet/api'
import { TransferDialog } from '@/features/wallet/components/dialogs/transfer-dialog'
import { generateAffiliateLink } from '@/features/wallet/lib/affiliate'
import { handleServerError } from '@/lib/handle-server-error'
import { formatNumber, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getInvitationInfo } from './api'

function UnlockProgress({
  label,
  current,
  target,
  displayCurrent,
  displayTarget,
}: {
  label: string
  current: number
  target: number
  displayCurrent: string
  displayTarget: string
}) {
  const done = current >= target
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 100
  return (
    <div>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium'>{label}</span>
        <span className='text-muted-foreground tabular-nums'>
          {displayCurrent} / {displayTarget}
        </span>
      </div>
      <div className='bg-muted mt-2 h-2 overflow-hidden rounded-full'>
        <div
          className={cn(
            'h-full rounded-full transition-all',
            done ? 'bg-success' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function Invitation() {
  const { t } = useTranslation()
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferring, setTransferring] = useState(false)

  const infoQuery = useQuery({
    queryKey: ['invitation', 'info'],
    queryFn: async () => {
      const res = await getInvitationInfo()
      if (!res.success) throw new Error(res.message || 'Failed to load')
      return res.data
    },
    staleTime: 60 * 1000,
  })

  const info = infoQuery.data
  const inviteLink = info?.aff_code ? generateAffiliateLink(info.aff_code) : ''

  const handleTransfer = async (amount: number): Promise<boolean> => {
    try {
      setTransferring(true)
      const res = await transferAffiliateQuota({ quota: amount })
      if (res.success) {
        toast.success(t('Transfer successful'))
        await infoQuery.refetch()
        return true
      }
      handleServerError(res, t('Transfer failed'))
      return false
    } catch (error) {
      handleServerError(error, t('Transfer failed'))
      return false
    } finally {
      setTransferring(false)
    }
  }

  const stats = [
    {
      icon: Users,
      label: t('Invited users'),
      value: info ? formatNumber(info.aff_count) : '—',
    },
    {
      icon: Gift,
      label: t('Pending rewards'),
      value: info ? formatQuota(info.aff_quota) : '—',
    },
    {
      icon: Gift,
      label: t('Total earned'),
      value: info ? formatQuota(info.aff_history_quota) : '—',
    },
  ]

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Invitation Plan')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          <div className='relative overflow-hidden rounded-2xl border bg-card p-6 shadow-xs sm:p-8'>
            <div
              className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_80%_0%,color-mix(in_oklch,var(--primary)_12%,transparent)_0%,transparent_60%)]'
              aria-hidden='true'
            />
            <div className='relative'>
              <h2 className='text-xl font-bold tracking-tight sm:text-2xl'>
                {t('Invite friends, both get rewarded')}
              </h2>
              <p className='text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed'>
                {t(
                  'Share your exclusive link, and you will earn reward credits when friends sign up through it.'
                )}
              </p>
              <div className='mt-5 flex max-w-xl items-center gap-2'>
                {infoQuery.isLoading ? (
                  <Skeleton className='h-10 flex-1' />
                ) : (
                  <>
                    <Input
                      value={inviteLink}
                      readOnly
                      className='h-10 flex-1 font-mono text-sm'
                    />
                    <CopyButton
                      value={inviteLink}
                      tooltip={t('Copy invite link')}
                      aria-label={t('Copy invite link')}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className='rounded-2xl border bg-card p-5 shadow-xs'
              >
                <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase'>
                  <stat.icon className='size-3.5' aria-hidden='true' />
                  {stat.label}
                </div>
                <div className='mt-2 text-2xl font-bold tracking-tight tabular-nums'>
                  {infoQuery.isLoading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    stat.value
                  )}
                </div>
              </div>
            ))}
          </div>

          {info?.unlock_enabled && (
            <div className='rounded-2xl border bg-card p-6 shadow-xs'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold tracking-tight'>
                  {t('Unlock conditions')}
                </h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    info.unlocked
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {info.unlocked ? (
                    <LockOpen className='size-3.5' aria-hidden='true' />
                  ) : (
                    <Lock className='size-3.5' aria-hidden='true' />
                  )}
                  {info.unlocked ? t('Unlocked') : t('Not unlocked yet')}
                </span>
              </div>
              <p className='text-muted-foreground mt-2 text-sm'>
                {info.unlocked
                  ? t(
                      'Reward transfers are unlocked. You can move rewards to your balance anytime.'
                    )
                  : t(
                      'Complete the conditions below to unlock reward transfers.'
                    )}
              </p>
              <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                {info.unlock_min_invites > 0 && (
                  <UnlockProgress
                    label={t('Invited users')}
                    current={info.aff_count}
                    target={info.unlock_min_invites}
                    displayCurrent={formatNumber(info.aff_count)}
                    displayTarget={formatNumber(info.unlock_min_invites)}
                  />
                )}
                {info.unlock_min_consumed > 0 && (
                  <UnlockProgress
                    label={t('Consumed quota')}
                    current={info.used_quota}
                    target={info.unlock_min_consumed}
                    displayCurrent={formatQuota(info.used_quota)}
                    displayTarget={formatQuota(info.unlock_min_consumed)}
                  />
                )}
              </div>
            </div>
          )}

          <div className='flex items-center gap-3'>
            <Button
              disabled={
                !info || !info.unlocked || info.aff_quota <= 0 || transferring
              }
              onClick={() => setTransferOpen(true)}
            >
              {t('Transfer to Balance')}
            </Button>
            {info && !info.unlocked && (
              <p className='text-muted-foreground text-sm'>
                {t('Complete the conditions below to unlock reward transfers.')}
              </p>
            )}
          </div>
        </div>

        <TransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          onConfirm={handleTransfer}
          availableQuota={info?.aff_quota ?? 0}
          transferring={transferring}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
