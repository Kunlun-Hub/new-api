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
import { KeyRound, UserPlus, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { useStatus } from '@/hooks/use-status'

export function HowItWorks() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (status?.server_address as string | undefined) || 'https://api.example.com'

  const steps = [
    {
      num: '1',
      title: t('Sign up and top up'),
      desc: t(
        'Create an account and add credit to your balance. Pure pay-as-you-go, no subscription needed.'
      ),
      icon: <UserPlus className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '2',
      title: t('Create an API token'),
      desc: t(
        'Generate your own API key in one click from the Tokens page in the dashboard.'
      ),
      icon: <KeyRound className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '3',
      title: t('Point and call'),
      desc: t(
        'Set the base URL to us, swap model names freely, and migrate without touching your code.'
      ),
      icon: <Zap className='size-6' strokeWidth={1.5} />,
    },
  ]

  const code = `curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`

  return (
    <section className='border-border/40 bg-muted/20 relative z-10 hidden border-y px-6 py-20 md:py-28 lg:block'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mx-auto mb-14 max-w-2xl text-center'>
          <p className='mb-3 text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400'>
            {t('Quick start')}
          </p>
          <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-4xl'>
            {t('A few lines of code to get going')}
          </h2>
          <p className='text-muted-foreground mt-4 text-sm leading-relaxed md:text-base'>
            {t(
              'Works with any OpenAI-compatible client — just swap the key and base URL.'
            )}
          </p>
        </AnimateInView>

        <div className='grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14'>
          <div className='flex min-w-0 flex-col gap-8'>
            {steps.map((step, i) => (
              <AnimateInView
                key={step.num}
                delay={i * 120}
                animation='fade-up'
                className='flex items-start gap-5'
              >
                <div className='relative shrink-0'>
                  <div className='flex size-13 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400'>
                    {step.icon}
                  </div>
                  <div className='bg-foreground text-background absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full text-xs font-bold'>
                    {step.num}
                  </div>
                </div>
                <div className='min-w-0'>
                  <h3 className='mb-1.5 text-base font-semibold'>
                    {step.title}
                  </h3>
                  <p className='text-muted-foreground text-sm leading-relaxed break-words'>
                    {step.desc}
                  </p>
                </div>
              </AnimateInView>
            ))}
          </div>

          <AnimateInView delay={150} animation='fade-up' className='min-w-0'>
            <div className='border-border/50 bg-background overflow-hidden rounded-2xl border shadow-xl'>
              <div className='border-border/50 flex items-center gap-2 border-b px-4 py-3'>
                <span className='size-3 rounded-full bg-red-500/70' />
                <span className='size-3 rounded-full bg-yellow-500/70' />
                <span className='size-3 rounded-full bg-green-500/70' />
                <span className='text-muted-foreground ml-2 text-xs'>
                  terminal
                </span>
              </div>
              <pre className='overflow-x-auto p-5 text-[13px] leading-relaxed'>
                <code className='text-foreground/90 font-mono'>{code}</code>
              </pre>
            </div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
