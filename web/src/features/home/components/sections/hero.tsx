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
import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'

import { useHomeStats } from '../../hooks'

const MODEL_SWAP_INTERVAL_MS = 2600
const ROTATING_MODEL_LIMIT = 5

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { models } = usePricingData()
  const { data: homeStats } = useHomeStats()

  const modelNames = useMemo(
    () =>
      models
        .map((model) => model.model_name)
        .filter((name) => typeof name === 'string' && name.length > 0)
        .slice(0, ROTATING_MODEL_LIMIT),
    [models]
  )

  const [swap, setSwap] = useState({ index: 0, previous: -1 })

  useEffect(() => {
    if (modelNames.length <= 1) return
    const timer = window.setInterval(() => {
      setSwap((state) => ({
        index: (state.index + 1) % modelNames.length,
        previous: state.index,
      }))
    }, MODEL_SWAP_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [modelNames.length])

  const activeIndex =
    modelNames.length > 0 ? swap.index % modelNames.length : -1
  const activeModel = modelNames[activeIndex]
  const previousModel =
    swap.previous >= 0 ? modelNames[swap.previous % modelNames.length] : ''
  const widestModel = modelNames.reduce(
    (widest, name) => (name.length > widest.length ? name : widest),
    ''
  )

  const modelCount = homeStats?.model_count ?? 0
  const countLabel = `${modelCount}+`
  const docsLink = (status?.docs_link as string | undefined) ?? ''
  const [subtitleBefore, subtitleAfter = ''] = t(
    'Instantly access {{models}} models with pay-as-you-go pricing, unlimited time, ultra-fast responses, and transparent billing. No hidden costs. Start using all models after recharge. Serving tens of thousands of users.'
  ).split('{{models}}')

  return (
    <section className='relative isolate flex w-full items-center justify-center overflow-hidden px-6 py-10 md:py-20 lg:py-32'>
      <div
        aria-hidden
        className='absolute inset-0 -z-11 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[100px_100px]'
      />
      <div aria-hidden className='absolute inset-0 -z-10'>
        <div className='bg-foreground/3 absolute top-0 left-1/4 h-150 w-150 rounded-full blur-3xl' />
        <div className='bg-foreground/3 absolute right-1/4 bottom-1/4 h-150 w-150 rounded-full blur-3xl' />
      </div>

      <div className='mx-auto max-w-7xl space-y-10 text-center'>
        <div className='relative z-10 text-center'>
          {activeModel ? (
            <div className='landing-animate-fade-up mb-6'>
              <div className='group border-border/50 bg-background/50 text-foreground/70 hover:border-border inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-2 text-sm font-medium backdrop-blur-xl transition-all duration-300'>
                <span className='bg-primary text-primary-foreground inline-flex items-center gap-x-1 rounded-full px-2 py-0.5 text-xs'>
                  <Sparkles className='size-3' aria-hidden='true' />
                  {t('New Model')}
                </span>
                <span className='relative inline-grid h-5 items-center overflow-hidden whitespace-nowrap'>
                  <span
                    aria-hidden='true'
                    className='invisible col-start-1 row-start-1 flex h-5 items-center'
                  >
                    {widestModel}
                  </span>
                  {previousModel ? (
                    <span
                      key={`out-${swap.previous}`}
                      className='landing-animate-model-out col-start-1 row-start-1 flex h-5 items-center'
                    >
                      <Link
                        to='/pricing/$modelId'
                        params={{ modelId: previousModel }}
                      >
                        {previousModel}
                      </Link>
                    </span>
                  ) : null}
                  <span
                    key={`in-${activeIndex}`}
                    className='landing-animate-model-in col-start-1 row-start-1 flex h-5 items-center'
                  >
                    <Link
                      to='/pricing/$modelId'
                      params={{ modelId: activeModel }}
                    >
                      {activeModel}
                    </Link>
                  </span>
                </span>
                <ArrowRight
                  className='ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1'
                  aria-hidden='true'
                />
              </div>
            </div>
          ) : null}

          <h1 className='mb-5 leading-[0.9] font-bold'>
            <span className='block text-5xl tracking-tight md:text-6xl lg:text-7xl'>
              {t('Just One Interface')}
            </span>
            <span className='mt-4 block text-4xl tracking-normal md:text-5xl lg:text-6xl'>
              {t("Connect to the World's Most Popular Models")}
            </span>
          </h1>

          <p className='text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed'>
            {subtitleBefore}
            <b className='text-primary'>{countLabel}</b>
            {subtitleAfter}
          </p>

          <div className='flex flex-col justify-center gap-4 pt-8 sm:flex-row'>
            <Button
              className='group h-14 rounded-full px-8 text-base'
              render={
                <Link to={props.isAuthenticated ? '/dashboard' : '/sign-up'} />
              }
            >
              {t('Get Started')}
              <ArrowRight
                className='ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1'
                aria-hidden='true'
              />
            </Button>
            <Button
              variant='outline'
              className='border-border/80 dark:border-border/40 dark:bg-card/50 h-14 rounded-full px-8 text-base'
              render={
                docsLink.startsWith('http') ? (
                  <a href={docsLink} target='_blank' rel='noreferrer' />
                ) : (
                  <Link to={docsLink || '/doc'} />
                )
              }
            >
              {t('Help Docs')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
