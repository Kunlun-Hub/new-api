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
  Bot,
  Code2,
  DatabaseZap,
  ImagePlus,
  MessagesSquare,
  PenLine,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

export function UseCases() {
  const { t } = useTranslation()

  const cases = [
    {
      icon: <Bot className='size-5' strokeWidth={1.5} />,
      title: t('Conversational apps'),
      desc: t(
        'Power chatbots, assistants, and companions with top-tier dialogue models and smooth multi-turn context.'
      ),
    },
    {
      icon: <Code2 className='size-5' strokeWidth={1.5} />,
      title: t('Coding agents'),
      desc: t(
        'Drive AI coding tools and agents — completion, refactoring, and code review in one flow.'
      ),
    },
    {
      icon: <PenLine className='size-5' strokeWidth={1.5} />,
      title: t('Content creation'),
      desc: t(
        'Generate copy, marketing material, and multilingual translations in batches — quality at a fair cost.'
      ),
    },
    {
      icon: <ImagePlus className='size-5' strokeWidth={1.5} />,
      title: t('Image and multimodal'),
      desc: t(
        'Text-to-image, image understanding, speech transcription, and video generation — all through one API.'
      ),
    },
    {
      icon: <DatabaseZap className='size-5' strokeWidth={1.5} />,
      title: t('Data processing'),
      desc: t(
        'Structured extraction, classification, tagging, and summarization keep massive datasets moving.'
      ),
    },
    {
      icon: <MessagesSquare className='size-5' strokeWidth={1.5} />,
      title: t('Knowledge Q&A'),
      desc: t(
        'Build retrieval-augmented assistants over your own docs — accurate answers with sources, in seconds.'
      ),
    },
  ]

  return (
    <section className='relative z-10 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mx-auto mb-14 max-w-2xl text-center'>
          <p className='mb-3 text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400'>
            {t('Use cases')}
          </p>
          <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-4xl'>
            {t('One platform, endless possibilities')}
          </h2>
          <p className='text-muted-foreground mt-4 text-sm leading-relaxed md:text-base'>
            {t(
              'From indie developers to enterprise teams — find the right model for the job.'
            )}
          </p>
        </AnimateInView>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {cases.map((c, i) => (
            <AnimateInView
              key={c.title}
              delay={(i % 3) * 100}
              animation='fade-up'
              className={`group border-border/50 bg-card hover:border-blue-500/30 rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 ${
                i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''
              } ${i === 3 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <div className='mb-4 flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400'>
                {c.icon}
              </div>
              <h3 className='mb-2 text-base font-semibold'>{c.title}</h3>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                {c.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
