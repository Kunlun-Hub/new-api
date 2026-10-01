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
import {
  Banknote,
  CircleCheck,
  Circle,
  Gift,
  LockKeyhole,
  HandCoins,
  Hash,
  Megaphone,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { ConsoleBreadcrumb, SectionPageLayout } from '@/components/layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { generateAffiliateLink } from '@/features/wallet/lib/affiliate'
import { useIsAdmin } from '@/hooks/use-admin'
import { formatNumber, formatQuotaFixed } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getInviteStatus } from './api'
import { AffiliateRecords } from './components/affiliate-records'
import {
  InviteActionDialog,
  type InviteActionMode,
} from './components/invite-action-dialog'

interface InviteStatProps {
  icon: LucideIcon
  iconClassName: string
  label: string
  value: string
}

function InviteStat(props: InviteStatProps) {
  const Icon = props.icon
  return (
    <div className='border-border/40 flex items-center gap-3 rounded-xl border p-4'>
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          props.iconClassName
        )}
      >
        <Icon className='size-5 text-white' aria-hidden='true' />
      </div>
      <div className='min-w-0'>
        <div className='text-muted-foreground text-xs'>{props.label}</div>
        <div className='truncate text-xl font-bold tracking-tight tabular-nums'>
          {props.value}
        </div>
      </div>
    </div>
  )
}

function UnlockCondition({ done, label }: { done: boolean; label: string }) {
  return (
    <div className='flex items-center gap-2'>
      {done ? (
        <CircleCheck className='size-3.5 text-green-500' aria-hidden='true' />
      ) : (
        <Circle className='size-3.5' aria-hidden='true' />
      )}
      <span>{label}</span>
    </div>
  )
}

export function Invitation() {
  const { t } = useTranslation()
  const isAdmin = useIsAdmin()
  const [actionMode, setActionMode] = useState<InviteActionMode | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [promoIndex, setPromoIndex] = useState(0)

  const statusQuery = useQuery({
    queryKey: ['invite', 'status'],
    queryFn: getInviteStatus,
    staleTime: 60 * 1000,
  })

  const status = statusQuery.data
  const eligibility = status?.eligibility
  const locked = Boolean(status && !eligibility?.eligible)
  const invitationLink =
    typeof window !== 'undefined' && status?.aff_code
      ? generateAffiliateLink(status.aff_code)
      : ''
  const shareTarget =
    invitationLink ||
    t('Complete the invitation requirements to reveal your link')

  const promoCopy = useMemo(() => {
    const templates = [
      t(
        '🚀 The AI API gateway I keep using — all major models in one place, affordable and stable, free credits on sign-up. Try it: {{link}}',
        { link: shareTarget }
      ),
      t(
        '💡 Highly recommend this API platform! One key for every major LLM, pay-as-you-go, bonus for new sign-ups: {{link}}',
        { link: shareTarget }
      ),
      t(
        '🔥 Tired of pricey, clunky APIs? This platform aggregates the major models — stable, cheap, free credits on sign-up: {{link}}',
        { link: shareTarget }
      ),
      t(
        '✨ Sharing a gem of an AI API site: fast, full model lineup, great prices, plus a perk when you sign up via my link: {{link}}',
        { link: shareTarget }
      ),
    ]
    if (templates.length === 0) return ''
    return templates[promoIndex % templates.length]
  }, [promoIndex, shareTarget, t])

  const topupRewardEnabled =
    (status?.rewards.topup_reward_times ?? 0) > 0 &&
    (status?.rewards.topup_reward_percentage ?? 0) > 0

  const rewardRules = useMemo(() => {
    const rules: string[] = []
    if ((status?.rewards.invitee_reward_quota ?? 0) > 0) {
      rules.push(
        t(
          'Friends who register via your invite get a {{amount}} balance bonus',
          {
            amount: formatQuotaFixed(status?.rewards.invitee_reward_quota ?? 0),
          }
        )
      )
    }
    if ((status?.rewards.inviter_reward_quota ?? 0) > 0) {
      rules.push(
        t('You receive {{amount}} for each invited registration', {
          amount: formatQuotaFixed(status?.rewards.inviter_reward_quota ?? 0),
        })
      )
    }
    if (topupRewardEnabled) {
      rules.push(
        t('You earn {{percent}} of their first {{times}} top-ups', {
          percent: `${(status?.rewards.topup_reward_percentage ?? 0) * 100}%`,
          times: status?.rewards.topup_reward_times ?? 0,
        })
      )
    }
    rules.push(
      t(
        'Do not invite yourself with alt accounts. Violations forfeit rewards and may lead to a ban.'
      )
    )
    return rules
  }, [status, t, topupRewardEnabled])

  const reload = () => {
    void statusQuery.refetch()
    setReloadToken((token) => token + 1)
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Breadcrumb>
        <ConsoleBreadcrumb
          items={[
            { label: t('Dashboard'), href: '/dashboard/overview' },
            { label: t('Invite Rewards') },
          ]}
        />
      </SectionPageLayout.Breadcrumb>
      <SectionPageLayout.Content>
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='flex items-center gap-2 text-lg font-semibold'>
              <Gift className='text-primary size-5' aria-hidden='true' />
              {t('Invite Rewards')}
            </h2>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                onClick={() => setActionMode('transfer')}
                disabled={!status}
              >
                <HandCoins className='size-4' aria-hidden='true' />
                {t('Transfer to Balance')}
              </Button>
              {status?.withdrawal.enabled && (
                <Button
                  className='shadow-primary/20 shadow-lg'
                  onClick={() => setActionMode('withdraw')}
                  disabled={!status}
                >
                  <Banknote className='size-4' aria-hidden='true' />
                  {t('Cash Out')}
                </Button>
              )}
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-3'>
            <InviteStat
              icon={HandCoins}
              iconClassName='bg-pink-500'
              label={t('Pending Earnings')}
              value={status ? formatQuotaFixed(status.aff_quota) : '-'}
            />
            <InviteStat
              icon={TrendingUp}
              iconClassName='bg-emerald-500'
              label={t('Total Earnings')}
              value={status ? formatQuotaFixed(status.aff_history_quota) : '-'}
            />
            <InviteStat
              icon={Hash}
              iconClassName='bg-amber-500'
              label={t('Rewards')}
              value={status ? formatNumber(status.aff_count) : '-'}
            />
          </div>

          <Card className='border-border/40 bg-background'>
            <CardContent className='space-y-6'>
              {locked && eligibility && (
                <Alert className='border-border/30 bg-amber-500/5 text-amber-800 dark:text-amber-200'>
                  <LockKeyhole className='size-4' aria-hidden='true' />
                  <AlertTitle>
                    {t('Complete the requirements to unlock invitations')}
                  </AlertTitle>
                  <AlertDescription className='text-amber-900/80 dark:text-amber-200/70'>
                    <div className='mt-1 flex flex-col gap-1'>
                      {status?.rewards.unlock_requires_topup && (
                        <UnlockCondition
                          done={eligibility.has_valid_topup}
                          label={t(
                            'You need to complete at least one valid top-up'
                          )}
                        />
                      )}
                      {eligibility.min_invites > 0 && (
                        <UnlockCondition
                          done={
                            (status?.aff_count ?? 0) >= eligibility.min_invites
                          }
                          label={t(
                            'Invite at least {{count}} users: {{current}} / {{count}}',
                            {
                              count: eligibility.min_invites,
                              current: status?.aff_count ?? 0,
                            }
                          )}
                        />
                      )}
                      {eligibility.min_used_quota > 0 && (
                        <UnlockCondition
                          done={eligibility.used_quota_met}
                          label={t(
                            'Cumulative actual usage: {{current}} / {{minimum}}',
                            {
                              current: formatQuotaFixed(
                                eligibility.current_used_quota
                              ),
                              minimum: formatQuotaFixed(
                                eligibility.min_used_quota
                              ),
                            }
                          )}
                        />
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className='space-y-2'>
                <h3 className='text-sm font-medium'>{t('Invite Link')}</h3>
                <div
                  className={cn(
                    'border-border/40 bg-muted/40 flex items-center justify-between gap-2 rounded-lg border py-0.5 pr-1 pl-3',
                    locked && 'pointer-events-none blur-sm select-none'
                  )}
                >
                  <span className='text-muted-foreground truncate text-sm'>
                    {invitationLink ||
                      t(
                        'Complete the invitation requirements to reveal your link'
                      )}
                  </span>
                  {invitationLink && (
                    <CopyButton
                      value={invitationLink}
                      tooltip={t('Copy invite link')}
                      successTooltip={t('Copied!')}
                      aria-label={t('Copy invite link')}
                    />
                  )}
                </div>
              </div>

              <div className='grid gap-6 md:grid-cols-2'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <h3 className='flex items-center gap-2 text-sm font-medium'>
                      <Megaphone
                        className='text-primary size-4'
                        aria-hidden='true'
                      />
                      {t('Promo Copy')}
                    </h3>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        title={t('Refresh')}
                        aria-label={t('Refresh')}
                        disabled={locked}
                        onClick={() =>
                          setPromoIndex((index) => {
                            if (promoCopy.length <= 1) return index
                            let next = index
                            while (next === index) {
                              next = Math.floor(Math.random() * 4)
                            }
                            return next
                          })
                        }
                      >
                        <RefreshCw className='size-4' aria-hidden='true' />
                      </Button>
                      {!locked && (
                        <CopyButton
                          value={promoCopy}
                          tooltip={t('Copy')}
                          successTooltip={t('Copied!')}
                          aria-label={t('Copy')}
                        />
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'border-border/40 bg-muted/40 text-muted-foreground rounded-lg border p-3 text-sm leading-relaxed',
                      locked && 'pointer-events-none blur-sm select-none'
                    )}
                  >
                    {promoCopy}
                  </div>
                </div>

                <div className='space-y-1.5 text-sm leading-relaxed'>
                  <h3 className='font-medium'>{t('Reward Rules')}</h3>
                  {rewardRules.map((rule, index) => (
                    <p key={rule} className='text-muted-foreground'>
                      {index + 1}. {rule}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <AffiliateRecords
            isAdmin={isAdmin}
            withdrawalEnabled={Boolean(status?.withdrawal.enabled)}
            reloadToken={reloadToken}
            onQuotaChanged={reload}
          />
        </div>

        <InviteActionDialog
          mode={actionMode}
          open={actionMode !== null}
          onOpenChange={(open) => !open && setActionMode(null)}
          status={status}
          onSuccess={reload}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
