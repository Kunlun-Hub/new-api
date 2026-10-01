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
import {
  CircleDollarSign,
  CircleQuestionMark,
  EllipsisVertical,
  Globe,
  MessageSquareQuote,
  Wallet,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatNumber, formatQuotaFixed } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { useApiAddresses } from '../hooks/use-api-addresses'

interface SummaryStat {
  key: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

function splitApiAddress(url?: string): { origin: string; path: string } {
  if (!url) return { origin: '', path: '' }
  try {
    const parsed = new URL(url)
    return {
      origin: parsed.origin,
      path: parsed.pathname === '/' ? '' : parsed.pathname,
    }
  } catch {
    return { origin: url, path: '' }
  }
}

export function ApiKeysSummaryCard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { addresses, loading } = useApiAddresses()

  const primaryAddress = addresses[0]
  const primary = splitApiAddress(primaryAddress?.url)
  // The reference always renders the OpenAI-compatible `/v1` suffix next to
  // the host; keep it when the configured address has no path of its own.
  const primaryPath = primary.path || '/v1'

  const stats: SummaryStat[] = [
    {
      key: 'balance',
      label: t('Account Balance'),
      value: formatQuotaFixed(Number(user?.quota ?? 0)),
      icon: Wallet,
    },
    {
      key: 'spent',
      label: t('Total Spent'),
      value: formatQuotaFixed(Number(user?.used_quota ?? 0)),
      icon: CircleDollarSign,
    },
    {
      key: 'requests',
      label: t('Request Count'),
      value: formatNumber(Number(user?.request_count ?? 0)),
      icon: MessageSquareQuote,
    },
  ]

  return (
    <div className='bg-background/60 border-border/40 relative flex flex-col gap-4 rounded-xl border p-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between'>
      <div className='min-w-0'>
        <b className='text-foreground mb-1 flex items-center gap-x-1 text-sm font-semibold tracking-tight'>
          {t('BaseURL')}
          <Tooltip>
            <TooltipTrigger
              render={<CircleQuestionMark className='size-3.5' tabIndex={0} />}
            />
            <TooltipContent className='max-w-xs'>
              {t(
                'The API key must be used with the BaseURL. Some applications require the /v1 suffix, please adjust accordingly.'
              )}
            </TooltipContent>
          </Tooltip>
        </b>
        {loading ? (
          <Skeleton className='mt-2 h-9 w-72' />
        ) : (
          <div className='flex min-w-0 items-center gap-2'>
            <HoverCard>
              <HoverCardTrigger
                render={
                  <div
                    tabIndex={0}
                    className='bg-muted/50 border-border/40 flex h-9 max-w-full min-w-0 cursor-pointer items-center rounded-lg border pr-2 pl-3 font-mono text-sm max-lg:grow'
                  />
                }
              >
                <span className='truncate'>{primary.origin}</span>
                <span className='text-muted-foreground'>{primaryPath}</span>
                <EllipsisVertical
                  aria-hidden='true'
                  className='text-foreground/70 ml-2 size-4 shrink-0'
                />
              </HoverCardTrigger>
              <HoverCardContent
                align='start'
                className='w-100 max-w-[calc(100vw-2rem)] gap-2 rounded-xl p-4'
              >
                <div className='flex items-center justify-between'>
                  <h5>{t('Available API Addresses')}</h5>
                  <span className='text-muted-foreground text-xs'>
                    {t('Some applications require the /v1 suffix')}
                  </span>
                </div>
                <ItemGroup>
                  {addresses.map((address) => (
                    <Item
                      key={address.url}
                      role='listitem'
                      variant='outline'
                      className='border-border/30 flex-nowrap items-center gap-2.5 px-3 py-2.5'
                    >
                      <ItemMedia variant='icon'>
                        <Globe className='size-4' aria-hidden='true' />
                      </ItemMedia>
                      <ItemContent className='min-w-0 gap-1'>
                        <ItemTitle className='line-clamp-none break-all'>
                          {address.route}
                        </ItemTitle>
                        <ItemDescription className='line-clamp-none break-all'>
                          {address.url}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <CopyButton
                          value={address.url}
                          size='icon-sm'
                          tooltip={t('Copy API URL')}
                          aria-label={`${t('Copy API URL')}: ${address.url}`}
                        />
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </HoverCardContent>
            </HoverCard>
            {primaryAddress?.url && (
              <CopyButton
                value={primaryAddress.url}
                variant='outline'
                size='default'
                className='border-border/60 size-9 shrink-0 px-2.5'
                tooltip={t('Copy')}
                successTooltip={t('Copied!')}
                aria-label={t('Copy')}
              />
            )}
          </div>
        )}
      </div>

      <div className='flex shrink-0 gap-2 text-sm max-lg:justify-center max-sm:w-full'>
        {stats.map((stat, index) => (
          <div
            key={stat.key}
            className={cn(
              'bg-background/80 flex items-center gap-3 px-5 py-2',
              index === 0 ? 'rounded-xl' : 'rounded-lg'
            )}
          >
            <div className='border-border/40 flex size-10 items-center justify-center rounded-full border shadow-xl max-md:hidden'>
              <stat.icon
                className='text-foreground/70 size-5'
                aria-hidden='true'
              />
            </div>
            <div className='min-w-0'>
              <span className='text-muted-foreground text-xs'>
                {stat.label}
              </span>
              <div className='truncate text-base font-semibold tabular-nums'>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
