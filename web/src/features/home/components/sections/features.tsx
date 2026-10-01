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
  BadgePercent,
  Book,
  CloudBackup,
  MessageCircleCheck,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

import { useHomeStats } from '../../hooks'

interface FeaturesProps {
  className?: string
}

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()
  const { data: homeStats } = useHomeStats()
  const modelCountLabel = `${homeStats?.model_count ?? 0}+`

  const features = [
    {
      icon: <Book className='text-primary size-4 md:size-6' />,
      title: t('Tutorial'),
      desc: t(
        'Register an account, recharge or exchange balance, then go to token management to bind chat or copy API address + KEY.'
      ),
    },
    {
      icon: <BadgePercent className='text-primary size-4 md:size-6' />,
      title: t('Pricing Multiplier'),
      desc: t(
        '$1 USD equals approximately 1.5-2.5 CNY. Transparent pricing, advance notice for adjustments, no hidden traps.'
      ),
    },
    {
      icon: <MessageCircleCheck className='text-primary size-4 md:size-6' />,
      title: t('Model Support'),
      desc: t(
        'Supports ChatGPT, Claude, Gemini, DeepSeek, Grok... and domestic vendors, {{models}} models in total.',
        { models: modelCountLabel }
      ),
    },
    {
      icon: <Rocket className='text-primary size-4 md:size-6' />,
      title: t('Free Access'),
      desc: t(
        'Multi-node global deployment, no regional restrictions, fast and free access anytime, anywhere.'
      ),
    },
    {
      icon: <CloudBackup className='text-primary size-4 md:size-6' />,
      title: t('Seamless Integration'),
      desc: t(
        'Universal API interface. No code changes needed. Just change the model name to seamlessly integrate with multiple vendors.'
      ),
    },
    {
      icon: <ShieldCheck className='text-primary size-4 md:size-6' />,
      title: t('Experienced'),
      desc: t(
        'Operating stably for over 3 years with rich experience, serving tens of thousands of users. Trustworthy.'
      ),
    },
  ]

  return (
    <section className='relative w-full overflow-hidden px-4 py-12 sm:px-6 md:px-8 md:py-16 lg:py-20'>
      <div className='mx-auto flex w-full max-w-6xl flex-col items-center'>
        <AnimateInView className='mb-8 space-y-3 text-center md:mb-12 md:space-y-4 lg:mb-14'>
          <span className='border-border/50 bg-card/30 text-foreground/70 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] tracking-[0.2em] uppercase backdrop-blur sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.32em]'>
            {t('WORRY-FREE')}
            <span
              className='h-1.5 w-1.5 rounded-full bg-emerald-500 sm:h-2 sm:w-2'
              aria-hidden='true'
            />
          </span>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl'>
            {t('Complete Service System')}
          </h2>
          <p className='text-foreground/70 mx-auto max-w-2xl px-8 text-sm sm:text-base md:text-lg'>
            {t(
              'Let us handle complex model integration. Just register, recharge, and bind your application.'
            )}
          </p>
        </AnimateInView>

        <div className='w-full'>
          <ul className='grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6'>
            {features.map((feature, index) => (
              <AnimateInView
                as='li'
                key={feature.title}
                delay={(index % 3) * 100}
                animation='fade-up'
                className='group border-border/60 bg-card/50 relative overflow-hidden rounded-xl border p-4 text-left backdrop-blur transition-all hover:scale-102 hover:shadow-md md:rounded-2xl md:p-6'
              >
                <div className='from-foreground/4 absolute inset-0 -z-10 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                <div className='bg-card/50 border-border/70 relative mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-xl md:mb-5 md:size-14'>
                  {feature.icon}
                </div>
                <div className='relative space-y-1.5 md:space-y-2'>
                  <h3 className='text-foreground text-sm font-semibold tracking-widest uppercase sm:text-base sm:tracking-[0.15em] md:text-lg md:tracking-tight md:normal-case'>
                    {feature.title}
                  </h3>
                  <div className='text-foreground/60 text-xs leading-relaxed sm:text-sm'>
                    {feature.desc}
                  </div>
                </div>
              </AnimateInView>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
