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
import { useTranslation } from 'react-i18next'

import { ThemeSwitch } from '@/components/theme-switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='relative flex min-h-svh flex-col'>
      <header className='fixed top-0 z-50 w-full'>
        <div className='flex h-16 items-center justify-between px-4 md:px-6'>
          <Link
            to='/'
            aria-label={t('Go home')}
            className='flex size-10 items-center justify-center transition-opacity hover:opacity-80'
          >
            {loading ? (
              <Skeleton className='size-10 rounded-full' />
            ) : (
              <img
                src={logo}
                alt={systemName}
                className='size-10 rounded-full object-cover'
              />
            )}
          </Link>
          <ThemeSwitch />
        </div>
      </header>
      <main className='my-5 flex flex-1 flex-col items-center justify-center px-4 md:mb-12'>
        <div className='w-full max-w-lg'>{children}</div>
      </main>
    </div>
  )
}
