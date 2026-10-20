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
import { useTranslation } from 'react-i18next'

import { QuotaDetailsPopover } from '@/components/quota-details-popover'
import { StatusBadge } from '@/components/status-badge'
import { formatQuotaWithCurrency, getCurrencyDisplay } from '@/lib/currency'
import { formatTimestamp } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

type UserQuotaCellProps = {
  remaining: number
  used: number
  giftQuota?: number
  giftExpiresAt?: number
}

export function UserQuotaCell(props: UserQuotaCellProps) {
  const { t } = useTranslation()
  useSystemConfigStore((state) => state.config.currency)

  const { meta: currency } = getCurrencyDisplay()
  const quotaUnit = currency.kind === 'tokens' ? t('Tokens') : currency.symbol
  const hasBalanceActivity = props.remaining !== 0 || props.used !== 0
  const giftQuota = props.giftQuota ?? 0
  const hasGiftQuota = giftQuota > 0
  const hasQuota = hasBalanceActivity || hasGiftQuota
  const formattedRemaining = formatQuotaWithCurrency(props.remaining, {
    showSymbol: false,
  })
  const formattedUsed = formatQuotaWithCurrency(props.used, {
    showSymbol: false,
  })
  const formattedGiftQuota = formatQuotaWithCurrency(giftQuota, {
    showSymbol: false,
  })
  let giftExpiry = ''
  if (hasGiftQuota) {
    giftExpiry = props.giftExpiresAt
      ? t('Gift credit expires at {{time}}', {
          time: formatTimestamp(props.giftExpiresAt),
        })
      : t('Never expires')
  }
  const giftSummary = hasGiftQuota
    ? `${t('Gift Credit Balance')} ${formattedGiftQuota}; ${giftExpiry}`
    : t('No gift credit')
  const details = [
    { label: t('Available Balance'), value: formattedRemaining },
    { label: t('Total Used'), value: formattedUsed },
    { label: t('Gift Credit Balance'), value: formattedGiftQuota },
  ]
  if (hasGiftQuota) {
    details.push({ label: t('Gift credit expires'), value: giftExpiry })
  }

  return (
    <QuotaDetailsPopover
      title={`${t('Quota')} (${quotaUnit})`}
      triggerLabel={
        hasQuota
          ? `${t('Available Balance')} ${formattedRemaining}; ${t('Used amount')} ${formattedUsed}; ${giftSummary}`
          : t('No Quota')
      }
      details={details}
    >
      {hasQuota ? (
        <span className='grid min-w-0 grid-cols-1 gap-y-1 text-sm tabular-nums'>
          {hasBalanceActivity ? (
            <>
              <span
                className={cn(
                  props.remaining < 0 && 'text-destructive',
                  props.remaining === 0 && 'text-muted-foreground'
                )}
              >
                {formattedRemaining}
              </span>
              <span
                data-table-text='secondary'
                className='text-muted-foreground flex items-baseline gap-1 text-xs font-normal'
              >
                <span>{t('Used amount')}</span>
                <span>{formattedUsed}</span>
              </span>
            </>
          ) : (
            <span className='text-muted-foreground text-xs font-normal'>
              {t('No Quota')}
            </span>
          )}
          {hasGiftQuota ? (
            <span
              data-table-text='secondary'
              className='text-muted-foreground min-w-0 truncate text-xs font-normal'
              title={giftExpiry}
            >
              <span>{t('Gift Credit Balance')}</span>{' '}
              <span>{formattedGiftQuota}</span>
              <span className='text-muted-foreground/70'> · </span>
              <span>{giftExpiry}</span>
            </span>
          ) : (
            <span
              data-table-text='secondary'
              className='text-muted-foreground text-xs font-normal'
            >
              {t('No gift credit')}
            </span>
          )}
        </span>
      ) : (
        <StatusBadge
          label={t('No Quota')}
          variant='neutral'
          copyable={false}
          className='-ml-1.5 font-normal'
        />
      )}
    </QuotaDetailsPopover>
  )
}
