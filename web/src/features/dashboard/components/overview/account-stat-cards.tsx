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
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  cta?: { label: string; to: string }
}

export function AccountStatCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)

  const cards: AccountStatCard[] = [
    {
      key: 'balance',
      title: t('Account Balance'),
      value: formatQuotaFixed(Number(user?.quota ?? 0)),
      hint: `${t('User group')}: ${user?.group || 'default'}`,
      icon: Wallet,
      iconClassName: 'bg-pink-500',
      cta: { label: t('Go to Top Up'), to: '/wallet' },
    },
    {
      key: 'spent',
      title: t('Total Spent'),
      value: formatQuotaFixed(Number(user?.used_quota ?? 0)),
      hint: t('Lifetime spending'),
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
            <div className='text-muted-foreground mt-2 flex items-center justify-between gap-2 text-xs'>
              <span className='truncate'>{card.hint}</span>
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
