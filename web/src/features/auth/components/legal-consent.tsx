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

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

import type { SystemStatus } from '../types'

interface LegalConsentProps {
  status: SystemStatus | null
  checked: boolean
  onCheckedChange: (nextValue: boolean) => void
  className?: string
}

export function LegalConsent({
  status,
  checked,
  onCheckedChange,
  className,
}: LegalConsentProps) {
  const { t } = useTranslation()
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)

  if (!hasUserAgreement && !hasPrivacyPolicy) {
    return null
  }

  const handleChange = (value: boolean) => {
    onCheckedChange(value === true)
  }

  return (
    <label
      className={cn(
        'text-muted-foreground flex items-center gap-2 text-sm',
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        className='border-primary rounded-[4px]'
      />
      <span>
        {t('I agree to the')}
        {hasUserAgreement && (
          <a
            href='/user-agreement'
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary mx-1'
          >
            {t('Terms of Service')}
          </a>
        )}
        {t('and')}
        {hasPrivacyPolicy && (
          <a
            href='/privacy-policy'
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary mx-1'
          >
            {t('Privacy Policy')}
          </a>
        )}
      </span>
    </label>
  )
}
