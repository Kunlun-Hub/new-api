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
import { CodeXml, Database, Image, MessagesSquare, PenLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

export function UseCases() {
  const { t } = useTranslation()

  const cases = [
    {
      icon: <MessagesSquare className='size-5' strokeWidth={1.5} />,
      title: t('Conversational apps'),
      desc: t(
        'Power support, assistant and companion products with top chat models and smooth multi-turn context.'
      ),
      wide: true,
    },
    {
      icon: <CodeXml className='size-5' strokeWidth={1.5} />,
      title: t('Coding agents'),
      desc: t(
        'Drive Claude Code, Codex and other coding tools and agents for fluid completion and refactoring.'
      ),
    },
    {
      icon: <PenLine className='size-5' strokeWidth={1.5} />,
      title: t('Content creation'),
      desc: t(
        'Generate copy, marketing assets and multilingual translations at scale, balancing quality and cost.'
      ),
    },
    {
      icon: <Image className='size-5' strokeWidth={1.5} />,
      title: t('Image & multimodal'),
      desc: t(
        'Text-to-image, image understanding, speech-to-text and video generation — multimodal all in one.'
      ),
    },
    {
      icon: <Database className='size-5' strokeWidth={1.5} />,
      title: t('Data processing & analysis'),
      desc: t(
        'Structured extraction, classification, tagging and summarization for high-volume data pipelines.'
      ),
    },
  ]

  return (
    <section className='relative w-full overflow-hidden px-4 py-12 sm:px-6 md:px-8 md:py-16 lg:py-20'>
      <div className='mx-auto flex w-full max-w-6xl flex-col items-center'>
        <AnimateInView className='mb-8 space-y-3 text-center md:mb-12 md:space-y-4 lg:mb-14'>
          <span className='border-border/50 bg-card/30 text-foreground/70 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] tracking-[0.2em] uppercase backdrop-blur sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.32em]'>
            {t('VERSATILE SCENARIOS')}
            <span
              className='h-1.5 w-1.5 rounded-full bg-emerald-500 sm:h-2 sm:w-2'
              aria-hidden='true'
            />
          </span>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl'>
            {t('One platform, many uses')}
          </h2>
          <p className='text-foreground/70 mx-auto max-w-2xl px-8 text-sm sm:text-base md:text-lg'>
            {t(
              'From solo developers to enterprise teams, find the right model here'
            )}
          </p>
        </AnimateInView>

        <div className='w-full'>
          <ul className='grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5'>
            {cases.map((useCase, index) => (
              <AnimateInView
                as='li'
                key={useCase.title}
                delay={(index % 3) * 100}
                animation='fade-up'
                className={`group border-border/60 bg-card/50 relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 text-left backdrop-blur transition-all hover:scale-[1.01] hover:shadow-md md:p-6 ${
                  useCase.wide ? 'sm:col-span-2' : ''
                }`}
              >
                <div className='from-foreground/4 absolute inset-0 -z-10 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                <div className='border-border/70 bg-card/50 inline-flex size-11 items-center justify-center rounded-xl border shadow-sm'>
                  {useCase.icon}
                </div>
                <h3 className='text-foreground text-base font-semibold md:text-lg'>
                  {useCase.title}
                </h3>
                <p className='text-foreground/60 text-sm leading-relaxed'>
                  {useCase.desc}
                </p>
              </AnimateInView>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
