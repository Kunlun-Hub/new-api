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
import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber } from '@/lib/format'
import { useSystemConfigStore } from '@/stores/system-config-store'

import type { LogCategory } from '../types'

const RETENTION_NOTE: Record<LogCategory, string> = {
  common: 'Logs are retained for 30 days for database stability.',
  drawing:
    'Images/videos may expire, please save them locally as soon as possible!',
  task: 'Media files are temporary, save them as soon as possible!',
}

function NoteRow(props: { label: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-xs font-medium'>{props.label}</span>
      <span className='text-muted-foreground text-xs'>{props.children}</span>
    </div>
  )
}

/**
 * Log table footer: billing/usage notes on the left and the retention hint on
 * the right, mirroring the reference console layout.
 */
export function LogsFooterNote({ logCategory }: { logCategory: LogCategory }) {
  const { t } = useTranslation()
  const quotaPerUnit = useSystemConfigStore(
    (state) => state.config.currency.quotaPerUnit
  )
  const basePrice =
    quotaPerUnit > 0
      ? formatBillingCurrencyFromUSD(1000 / quotaPerUnit)
      : undefined
  const formula = t(
    'Usage = group ratio × model ratio × (input + output × completion ratio) / {{quotaPerUnit}}',
    { quotaPerUnit: formatNumber(quotaPerUnit) }
  )

  return (
    <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 max-lg:hidden'>
      {logCategory === 'common' ? (
        <div className='flex items-center gap-2'>
          <Popover>
            <PopoverTrigger
              render={<Button type='button' variant='outline' size='sm' />}
            >
              {t('Important Notes')}
            </PopoverTrigger>
            <PopoverContent align='start' className='w-96 max-w-[90vw] gap-2'>
              <p className='font-mono text-xs break-all'>{formula}</p>
              <NoteRow label={t('Group Ratio')}>
                {t('Higher group ratios mean a higher unit price.')}
              </NoteRow>
              <NoteRow label={t('Model ratio')}>
                {t(
                  'Calculated from the base price of {{price}} per 1K tokens.',
                  {
                    price: basePrice,
                  }
                )}
              </NoteRow>
              <NoteRow label={t('Completion ratio')}>
                {t(
                  'Output token ratio, usually higher than the input token ratio.'
                )}
              </NoteRow>
              <NoteRow label={t('Input')}>
                {t('Tokens sent in the request.')}
              </NoteRow>
              <NoteRow label={t('Output')}>
                {t('Tokens returned in the response.')}
              </NoteRow>
              <NoteRow label={t('Note')}>
                {t(
                  'Concurrent requests can produce several usage records at the same moment.'
                )}
              </NoteRow>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger
              render={<Button type='button' variant='outline' size='sm' />}
            >
              {t('Multiplier Notes')}
            </PopoverTrigger>
            <PopoverContent align='start' className='w-96 max-w-[90vw] gap-2'>
              <p className='font-mono text-xs break-all'>{formula}</p>
              <p className='text-muted-foreground text-xs'>
                {t(
                  'Ratios are this site pricing units, not the provider official price multiplied.'
                )}
              </p>
              <NoteRow label={t('Model ratio')}>
                {t(
                  'Model ratio = Model input price per 1K tokens / {{price}}',
                  {
                    price: basePrice,
                  }
                )}
              </NoteRow>
              <NoteRow label={t('Completion ratio')}>
                {t(
                  'Completion ratio = Output price per 1K tokens / Input price per 1K tokens'
                )}
              </NoteRow>
              <p className='text-muted-foreground text-xs'>
                {t('See the Model Square for the current price of each model.')}
              </p>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <span />
      )}
      <span className='text-muted-foreground flex items-center gap-1 text-sm'>
        <Info className='size-3.5 shrink-0' aria-hidden='true' />
        {t(RETENTION_NOTE[logCategory])}
      </span>
    </div>
  )
}
