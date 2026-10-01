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

import { CopyButton } from '@/components/copy-button'
import { ButtonGroup } from '@/components/ui/button-group'
import { useAuthStore } from '@/stores/auth-store'

export function WelcomeHeader() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)

  const name = user?.display_name || user?.username || ''

  return (
    <div className='flex flex-wrap items-center gap-3 max-md:flex-col'>
      <h1 className='text-2xl font-semibold tracking-tight'>
        {t('👋 Welcome back, {{name}}', { name })}
      </h1>
      <ButtonGroup>
        {user?.email && (
          <CopyButton
            value={user.email}
            variant='outline'
            size='xs'
            className='border-border/60 h-7'
            iconClassName='size-3'
            aria-label={t('Copy email address')}
          >
            {user.email}
          </CopyButton>
        )}
        {user?.id != null && (
          <CopyButton
            value={String(user.id)}
            variant='outline'
            size='xs'
            className='border-border/60 h-7'
            iconClassName='size-3'
            aria-label={t('Copy user ID')}
          >
            <span className='bg-foreground text-background rounded px-1 text-[10px] font-bold'>
              ID
            </span>
            {user.id}
          </CopyButton>
        )}
      </ButtonGroup>
    </div>
  )
}
