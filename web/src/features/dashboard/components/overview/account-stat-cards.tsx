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
import {
  ArrowRight,
  CircleDollarSign,
  MessageSquareQuote,
  Wallet,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import dayjs from '@/lib/dayjs'
import { formatNumber, formatQuotaFixed } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

const CARD_CLASS =
  'border border-border/40 ring-0 bg-transparent bg-linear-to-br from-foreground/3 via-transparent to-transparent transition-shadow hover:border-border/60 hover:shadow-md'

const CTA_CLASS = 'border-border/30 h-6 gap-1 rounded-full px-2 text-xs'

interface AccountStatCard {
  key: string
  title: string
  value: string
  hint: string
  /** Secondary amount line, e.g. the gift credit balance or gift credit spent. */
  extraHint?: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  cta?: { label: string; to: string }
}

export function AccountStatCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)

  const giftQuota = Number(user?.gift_quota ?? 0)
  const giftExpiredAt = Number(user?.gift_quota_expired_at ?? 0)
  const giftHint =
    giftQuota > 0
      ? `${t('Gift credit')}: ${formatQuotaFixed(giftQuota)}${
          giftExpiredAt > 0
            ? ` (${t('Expires at')} ${dayjs.unix(giftExpiredAt).format('YYYY-MM-DD HH:mm')})`
            : ` (${t('Never expires')})`
        }`
      : `${t('Gift credit')}: ${formatQuotaFixed(0)}`

  const cards: AccountStatCard[] = [
    {
      key: 'balance',
      title: t('Account Balance'),
      value: formatQuotaFixed(Number(user?.quota ?? 0)),
      hint: `${t('User group')}: ${user?.group || 'default'}`,
      extraHint: giftHint,
      icon: Wallet,
      iconClassName: 'bg-pink-500',
      cta: { label: t('Go to Top Up'), to: '/wallet' },
    },
    {
      key: 'spent',
      title: t('Total Spent'),
      value: formatQuotaFixed(Number(user?.used_quota ?? 0)),
      hint: t('Lifetime spending'),
      extraHint: `${t('Gift credit spent')}: ${formatQuotaFixed(Number(user?.gift_used_quota ?? 0))}`,
      icon: CircleDollarSign,
      iconClassName: 'bg-emerald-500',
      cta: { label: t('View Logs'), to: '/usage-logs/common' },
    },
    {
      key: 'requests',
      title: t('Request Count'),
      value: formatNumber(Number(user?.request_count ?? 0)),
      hint: t('Total successful requests'),
      icon: MessageSquareQuote,
      iconClassName: 'bg-amber-500',
    },
  ]

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {cards.map((card) => (
        <Card key={card.key} className={CARD_CLASS}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${card.iconClassName}`}
            >
              <card.icon className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tracking-tight'>
              {card.value}
            </div>
            <div className='mt-2 space-y-0.5 text-xs'>
              <div className='text-muted-foreground truncate'>{card.hint}</div>
              {card.extraHint && (
                <div className='truncate font-medium text-emerald-600 dark:text-emerald-400'>
                  {card.extraHint}
                </div>
              )}
            </div>
            <div className='mt-1 flex items-center justify-end gap-2 text-xs'>
              {card.cta && (
                <Button
                  variant='outline'
                  size='xs'
                  className={CTA_CLASS}
                  render={<Link to={card.cta.to} />}
                >
                  {card.cta.label}
                  <ArrowRight className='size-3.5' aria-hidden='true' />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
