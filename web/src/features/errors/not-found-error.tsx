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
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, House } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className='relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center'>
      <div
        aria-hidden
        className='text-foreground pointer-events-none absolute inset-0 opacity-[0.04]'
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <span className='from-foreground/60 to-foreground/5 bg-linear-to-b bg-clip-text text-[7rem] leading-none font-bold tracking-tight text-transparent sm:text-[9rem]'>
        404
      </span>
      <h1 className='text-foreground mt-2 text-xl font-bold sm:text-2xl'>
        {t('Page not found')}
      </h1>
      <p className='text-muted-foreground mt-3 max-w-md text-sm leading-relaxed'>
        {t(
          'The page you are visiting may have been removed, renamed, or is temporarily unavailable.'
        )}
      </p>
      <div className='relative mt-8 flex flex-wrap items-center justify-center gap-3'>
        <Button
          className='rounded-full px-5'
          onClick={() => navigate({ to: '/' })}
        >
          <House className='size-4' />
          {t('Back to Home')}
        </Button>
        <Button
          className='rounded-full px-5'
          onClick={() => navigate({ to: '/pricing' })}
          variant='outline'
        >
          {t('Browse Models')}
          <ArrowRight className='size-4' />
        </Button>
      </div>
    </div>
  )
}
