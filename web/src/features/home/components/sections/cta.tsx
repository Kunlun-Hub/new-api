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

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='relative z-10 overflow-hidden px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView animation='scale-in'>
          <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 px-6 py-16 text-center md:py-20'>
            {/* Decorative pattern */}
            <div
              aria-hidden
              className='absolute inset-0 opacity-10'
              style={{
                backgroundImage:
                  'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                backgroundSize: '3rem 3rem',
                maskImage:
                  'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 100%)',
              }}
            />
            <div className='relative'>
              <h2 className='mx-auto max-w-2xl text-2xl leading-tight font-bold tracking-tight text-white md:text-4xl'>
                {t('Start calling top AI models in the next five minutes')}
              </h2>
              <p className='mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 md:text-base'>
                {t(
                  'Sign up, top up a small amount, and make your first API call — no credit card required to explore.'
                )}
              </p>
              <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
                <Button
                  className='group h-12 rounded-full bg-white px-7 text-sm font-semibold text-blue-700 hover:bg-white/90'
                  render={<Link to='/sign-up' />}
                >
                  {t('Create free account')}
                  <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Button>
                <Button
                  variant='outline'
                  className='h-12 rounded-full border-white/30 bg-transparent px-7 text-sm font-medium text-white hover:bg-white/10 hover:text-white'
                  render={<Link to='/pricing' />}
                >
                  {t('View Pricing')}
                </Button>
              </div>
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
