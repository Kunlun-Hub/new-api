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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const siteName = status?.systemName || 'New API'

  return (
    <section className='relative z-10 overflow-hidden px-6 pt-24 pb-16 md:pt-32 md:pb-20'>
      {/* Grid pattern (matches gpt.ge hero) */}
      <div
        aria-hidden
        className='absolute inset-0 -z-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px]'
      />
      {/* Radial gradient background */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 15% 30%, oklch(0.65 0.15 200 / 50%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 85% 30%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />

      <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
        {/* Badge */}
        <div
          className='landing-animate-fade-up mb-6 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-[11px] font-medium text-blue-600 opacity-0 shadow-xs dark:border-blue-400/20 dark:bg-blue-400/5 dark:text-blue-400'
          style={{ animationDelay: '0ms' }}
        >
          <span className='relative flex size-1.5'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75' />
            <span className='relative inline-flex size-1.5 rounded-full bg-blue-500 dark:bg-blue-400' />
          </span>
          <span>{t('Ready to use, pay as you go')}</span>
        </div>

        <h1
          className='landing-animate-fade-up text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.12] font-bold tracking-tight opacity-0'
          style={{ animationDelay: '60ms' }}
        >
          {t('One API for every')}
          <br />
          <span className='bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent'>
            {t('leading AI model')}
          </span>
        </h1>

        <p
          className='landing-animate-fade-up text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed opacity-0 md:text-lg'
          style={{ animationDelay: '120ms' }}
        >
          {t(
            '{{siteName}} brings hundreds of models — GPT, Claude, Gemini, DeepSeek and more — behind a single OpenAI-compatible endpoint. Top up your balance and start calling right away, with transparent per-token billing.',
            { siteName }
          )}
        </p>

        <div
          className='landing-animate-fade-up mt-9 flex w-full flex-col items-stretch justify-center gap-3 opacity-0 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center'
          style={{ animationDelay: '180ms' }}
        >
          {props.isAuthenticated ? (
            <Button
              className='group h-12 w-full rounded-full px-7 text-sm font-medium sm:w-auto'
              render={<Link to='/dashboard' />}
            >
              {t('Go to Dashboard')}
              <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
            </Button>
          ) : (
            <Button
              className='group h-12 w-full rounded-full px-7 text-sm font-medium sm:w-auto'
              render={<Link to='/sign-up' />}
            >
              {t('Start for free')}
              <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
            </Button>
          )}
          <Button
            variant='outline'
            className='h-12 w-full rounded-full px-7 text-sm font-medium sm:w-auto'
            render={<Link to='/pricing' />}
          >
            {t('View Pricing')}
          </Button>
        </div>

        {/* Model vendor strip */}
        <div
          className='landing-animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 opacity-0'
          style={{ animationDelay: '240ms' }}
        >
          {['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Grok', 'Qwen'].map(
            (vendor) => (
              <span
                key={vendor}
                className='text-muted-foreground/50 text-sm font-semibold tracking-wide'
              >
                {vendor}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  )
}
