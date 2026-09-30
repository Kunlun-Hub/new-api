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
  BadgeDollarSign,
  ChartColumn,
  Layers,
  Plug,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()

  const features = [
    {
      icon: <Rocket className='size-5' strokeWidth={1.5} />,
      title: t('Get started in minutes'),
      desc: t(
        'Sign up, top up, and create a token — three steps and your first API call is ready to go.'
      ),
    },
    {
      icon: <BadgeDollarSign className='size-5' strokeWidth={1.5} />,
      title: t('Transparent pricing'),
      desc: t(
        'Pure pay-as-you-go billing with itemized usage records. No hidden fees, no surprises.'
      ),
    },
    {
      icon: <Layers className='size-5' strokeWidth={1.5} />,
      title: t('Hundreds of models'),
      desc: t(
        'GPT, Claude, Gemini, DeepSeek, Grok and more — switch models by name without changing code.'
      ),
    },
    {
      icon: <ShieldCheck className='size-5' strokeWidth={1.5} />,
      title: t('Stable and reliable'),
      desc: t(
        'Multi-channel load balancing with automatic failover keeps your calls flowing around the clock.'
      ),
    },
    {
      icon: <Plug className='size-5' strokeWidth={1.5} />,
      title: t('OpenAI-compatible'),
      desc: t(
        'Standard API format that plugs straight into your existing apps, SDKs, and tools.'
      ),
    },
    {
      icon: <ChartColumn className='size-5' strokeWidth={1.5} />,
      title: t('Usage insights'),
      desc: t(
        'Real-time dashboards for spend, request volume, and model performance — all in one place.'
      ),
    },
  ]

  return (
    <section className='relative z-10 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mx-auto mb-14 max-w-2xl text-center'>
          <p className='mb-3 text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400'>
            {t('Full service')}
          </p>
          <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-4xl'>
            {t('Everything handled, so you can focus on building')}
          </h2>
          <p className='text-muted-foreground mt-4 text-sm leading-relaxed md:text-base'>
            {t(
              'We take care of model integrations, billing, and reliability — you just call the API.'
            )}
          </p>
        </AnimateInView>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {features.map((f, i) => (
            <AnimateInView
              key={f.title}
              delay={(i % 3) * 100}
              animation='fade-up'
              className='group border-border/50 bg-card hover:border-blue-500/30 rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5'
            >
              <div className='mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400'>
                {f.icon}
              </div>
              <h3 className='mb-2 text-base font-semibold'>{f.title}</h3>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                {f.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
