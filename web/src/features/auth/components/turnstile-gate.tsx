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
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Turnstile } from '@/components/turnstile'
import { cn } from '@/lib/utils'

type TurnstileGateProps = {
  siteKey: string
  action: string
  widgetKey: number
  ready: boolean
  onVerify: (token: string) => void
  onExpire: () => void
  className?: string
}

export function TurnstileGate({
  siteKey,
  action,
  widgetKey,
  ready,
  onVerify,
  onExpire,
  className,
}: TurnstileGateProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'border-border/60 bg-muted/20 rounded-2xl border px-4 py-3',
        className
      )}
      data-turnstile-ready={ready}
    >
      <div className='mb-3 flex items-start gap-2.5'>
        <ShieldCheck
          aria-hidden='true'
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            ready ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <div className='space-y-0.5'>
          <p className='text-sm font-medium'>{t('Security verification')}</p>
          <p
            className={cn(
              'text-xs',
              ready ? 'text-primary' : 'text-muted-foreground'
            )}
            role='status'
            aria-live='polite'
          >
            {ready
              ? t('Security verification passed')
              : t('Please complete the security check to continue.')}
          </p>
        </div>
      </div>
      <div className='flex min-h-[65px] justify-center'>
        <Turnstile
          key={widgetKey}
          siteKey={siteKey}
          action={action}
          onVerify={onVerify}
          onExpire={onExpire}
        />
      </div>
    </div>
  )
}
