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
  CrownIcon,
  Wallet01Icon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatLogQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import { hasToolSurcharge } from '../lib/format'
import type { LogOtherData } from '../types'

interface LogCostDisplayProps {
  quota: number
  other: LogOtherData | null
  showBillingSource?: boolean
  /** Gift credit share of the charge; rendered as an extra chip when > 0. */
  giftQuota?: number
  /** Plain text keeps the usage table aligned with the reference console. */
  variant?: 'badge' | 'plain'
  /** Error logs show a compact error affordance instead of a zero amount. */
  errorMessage?: string
}

function ToolSurchargeMarker() {
  const { t } = useTranslation()
  const label = t('Includes tool-call surcharge')

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant='warning'
            className='h-5 min-w-5 cursor-help gap-0 rounded-full px-1'
            role='img'
            aria-label={label}
            tabIndex={0}
            data-tool-surcharge-indicator='true'
          >
            <HugeiconsIcon
              icon={Wrench01Icon}
              strokeWidth={2}
              aria-hidden='true'
            />
            <span
              className='text-[9px] leading-none font-bold'
              aria-hidden='true'
            >
              +
            </span>
          </Badge>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function LogCostDisplay(props: LogCostDisplayProps) {
  const { t } = useTranslation()
  const variant = props.variant ?? 'badge'
  const isSubscription = props.other?.billing_source === 'subscription'
  const showToolSurcharge = hasToolSurcharge(props.other)
  const quota = isSubscription
    ? (props.other?.subscription_consumed ?? props.quota)
    : props.quota
  let source: string | undefined

  // A log billed to a subscription always names its funding source: that
  // subscription may have expired since, and the viewer may hold no active
  // plan today. Only the wallet marker is contextual and follows
  // showBillingSource.
  if (isSubscription) {
    source = t('Subscription')
  } else if (
    props.showBillingSource &&
    props.other?.billing_source === 'wallet'
  ) {
    source = t('Wallet')
  }

  if (props.errorMessage) {
    return (
      <div className={cn('flex w-full', variant === 'plain' && 'justify-end')}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className='inline-flex cursor-default items-center gap-0.5 rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[11px] text-red-500'
                  tabIndex={0}
                  aria-label={t('View Error')}
                />
              }
            >
              <CircleAlert className='size-3' aria-hidden='true' />
              {t('View Error')}
            </TooltipTrigger>
            <TooltipContent
              side='top'
              className='max-w-80 leading-relaxed break-all whitespace-pre-wrap'
            >
              {props.errorMessage}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  const sourceMarker = source ? (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className='inline-flex shrink-0 cursor-help items-center'
            role='img'
            aria-label={source}
            tabIndex={0}
          >
            <HugeiconsIcon
              icon={isSubscription ? CrownIcon : Wallet01Icon}
              className='size-3.5'
              strokeWidth={2}
              aria-hidden='true'
            />
          </span>
        }
      />
      <TooltipContent>{source}</TooltipContent>
    </Tooltip>
  ) : null
  const amount = (
    <span className='whitespace-nowrap'>{formatLogQuota(quota)}</span>
  )

  return (
    <TooltipProvider>
      <div
        className={cn(
          'inline-flex w-fit items-center gap-1.5',
          variant === 'plain' &&
            'flex w-full justify-end font-medium tabular-nums'
        )}
      >
        {variant === 'badge' ? (
          <StatusBadge
            type='badge'
            variant='neutral'
            size='lg'
            copyable={false}
            className='border-border/80 bg-muted/60 text-foreground rounded-md border font-semibold tabular-nums'
          >
            {sourceMarker}
            {amount}
          </StatusBadge>
        ) : (
          <>
            {sourceMarker}
            {amount}
          </>
        )}
        {showToolSurcharge ? <ToolSurchargeMarker /> : null}
        {props.giftQuota && props.giftQuota > 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant='outline'
                  className='h-5 cursor-help rounded-4xl border-emerald-500/40 px-2 text-[10px] font-medium text-emerald-600 tabular-nums dark:text-emerald-400'
                >
                  {t('Gift credit')} {formatLogQuota(props.giftQuota)}
                </Badge>
              }
            />
            <TooltipContent>{t('Paid with gift credit')}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
