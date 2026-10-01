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
import { AppWindow, ArrowRight, CodeXml } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStatus } from '@/hooks/use-status'

interface EndpointSample {
  id: string
  label: string
  method: string
  path: string
  request: string
  response: string
}

const CODE_TOKEN_REGEX =
  /"(?:[^"\\]|\\.)*"|\bcurl\b|\bPOST\b|\bGET\b|\b-X\b|\b-H\b|\b-d\b|\b\d+\b/g

function renderCodeTokens(code: string) {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of code.matchAll(CODE_TOKEN_REGEX)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      nodes.push(code.slice(lastIndex, index))
    }

    const token = match[0]
    let className: string
    if (token.startsWith('"')) {
      const rest = code.slice(index + token.length)
      className = /^\s*:/.test(rest)
        ? 'text-cyan-700 dark:text-sky-300'
        : 'text-gray-800 dark:text-orange-300'
    } else if (token === 'curl') {
      className = 'text-emerald-600 dark:text-emerald-400'
    } else if (token === 'POST' || token === 'GET') {
      className = 'text-rose-600 dark:text-rose-400'
    } else if (token.startsWith('-')) {
      className = 'text-teal-600 dark:text-teal-300'
    } else {
      className = 'text-violet-600 dark:text-violet-400'
    }

    nodes.push(
      <span key={`${index}-${token}`} className={className}>
        {token}
      </span>
    )
    lastIndex = index + token.length
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex))
  }

  return nodes
}

export function HowItWorks() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (status?.server_address as string | undefined) ||
        'https://api.example.com'

  const steps = [
    {
      num: '1',
      title: t('Sign up and top up'),
      desc: t(
        'Register an account, add credit online, pay as you go with no minimums.'
      ),
    },
    {
      num: '2',
      title: t('Create an API token'),
      desc: t(
        'Generate your own API key in one click from “API Tokens” in the console.'
      ),
    },
    {
      num: '3',
      title: t('Swap the endpoint and call'),
      desc: t(
        'Point base_url to us, switch model names freely, and migrate seamlessly.'
      ),
    },
  ]

  const samples: EndpointSample[] = [
    {
      id: 'chat',
      label: 'Chat',
      method: 'POST',
      path: '/v1/chat/completions',
      request: `curl -X POST "${baseUrl}/v1/chat/completions" \\
  -H "Authorization: Bearer sk-••••" \\
  -d '{
    "model": "model-name",
    "messages": [
      { "role": "user", "content": "your prompts" }
    ]
  }'`,
      response: `{
  "choices": [
    { "message": { "role": "assistant", "content": "completion text..." } }
  ],
  "usage": { "total_tokens": 15 }
}`,
    },
    {
      id: 'responses',
      label: 'Responses',
      method: 'POST',
      path: '/v1/responses',
      request: `curl -X POST "${baseUrl}/v1/responses" \\
  -H "Authorization: Bearer sk-••••" \\
  -d '{
    "model": "model-name",
    "input": "your prompts"
  }'`,
      response: `{
  "output": [
    { "type": "message", "role": "assistant", "content": "completion text..." }
  ],
  "usage": { "total_tokens": 15 }
}`,
    },
    {
      id: 'claude',
      label: 'Claude',
      method: 'POST',
      path: '/v1/messages',
      request: `curl -X POST "${baseUrl}/v1/messages" \\
  -H "x-api-key: sk-••••" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "model-name",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "your prompts" }
    ]
  }'`,
      response: `{
  "content": [
    { "type": "text", "text": "completion text..." }
  ],
  "usage": { "input_tokens": 8, "output_tokens": 7 }
}`,
    },
    {
      id: 'gemini',
      label: 'Gemini',
      method: 'POST',
      path: '/v1beta/models/model-name:generateContent',
      request: `curl -X POST "${baseUrl}/v1beta/models/model-name:generateContent" \\
  -H "x-goog-api-key: sk-••••" \\
  -d '{
    "contents": [
      { "parts": [ { "text": "your prompts" } ] }
    ]
  }'`,
      response: `{
  "candidates": [
    { "content": { "parts": [ { "text": "completion text..." } ] } }
  ],
  "usageMetadata": { "totalTokenCount": 15 }
}`,
    },
  ]

  return (
    <section className='relative w-full overflow-hidden px-4 py-12 max-md:hidden sm:px-6 md:px-8 md:py-16 lg:py-20'>
      <div className='mx-auto flex w-full max-w-6xl flex-col items-center'>
        <AnimateInView className='mb-8 space-y-3 text-center md:mb-12 md:space-y-4 lg:mb-14'>
          <span className='border-border/50 bg-card/30 text-foreground/70 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] tracking-[0.2em] uppercase backdrop-blur sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.32em]'>
            {t('QUICK START')}
            <span
              className='h-1.5 w-1.5 rounded-full bg-emerald-500 sm:h-2 sm:w-2'
              aria-hidden='true'
            />
          </span>
          <h2 className='text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl'>
            {t('A few lines of code to get started')}
          </h2>
          <p className='text-foreground/70 mx-auto max-w-2xl px-8 text-sm sm:text-base md:text-lg'>
            {t(
              'Natively compatible with multiple AI API specs — just swap the API Key and base_url to call any model'
            )}
          </p>
        </AnimateInView>

        <div className='w-full'>
          <div className='grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8'>
            <AnimateInView className='border-border/60 bg-card/50 flex flex-col gap-4 rounded-2xl border p-4'>
              <ol className='flex flex-col gap-4'>
                {steps.map((step) => (
                  <li
                    key={step.num}
                    className='group border-border/30 bg-card/30 flex gap-4 rounded-2xl border p-4 backdrop-blur transition-all hover:shadow-md sm:p-5'
                  >
                    <span className='bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm'>
                      {step.num}
                    </span>
                    <div className='space-y-1'>
                      <h3 className='text-foreground text-sm font-semibold sm:text-base'>
                        {step.title}
                      </h3>
                      <p className='text-foreground/60 text-xs leading-relaxed sm:text-sm'>
                        {step.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className='mt-1 grid grid-cols-2 gap-3'>
                <Link
                  to='/tutorials/$category'
                  params={{ category: 'coding' }}
                  className='group border-border/30 bg-card/30 hover:bg-foreground/2 flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur transition-all hover:shadow-md'
                >
                  <div className='flex items-center justify-between'>
                    <span className='border-border/40 inline-flex size-9 items-center justify-center rounded-xl border shadow-sm'>
                      <CodeXml className='text-foreground/70 size-4.5' />
                    </span>
                    <ArrowRight className='text-foreground/30 group-hover:text-foreground/60 size-4 transition-transform group-hover:translate-x-0.5' />
                  </div>
                  <div className='space-y-0.5'>
                    <div className='text-foreground text-sm font-semibold'>
                      {t('Coding guide')}
                    </div>
                    <div className='text-foreground/55 text-xs'>
                      {t('Use in IDEs / agents')}
                    </div>
                  </div>
                </Link>
                <Link
                  to='/tutorials/$category'
                  params={{ category: 'app' }}
                  className='group border-border/30 bg-card/30 hover:bg-foreground/2 flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur transition-all hover:shadow-md'
                >
                  <div className='flex items-center justify-between'>
                    <span className='border-border/40 inline-flex size-9 items-center justify-center rounded-xl border shadow-sm'>
                      <AppWindow className='text-foreground/70 size-4.5' />
                    </span>
                    <ArrowRight className='text-foreground/30 group-hover:text-foreground/60 size-4 transition-transform group-hover:translate-x-0.5' />
                  </div>
                  <div className='space-y-0.5'>
                    <div className='text-foreground text-sm font-semibold'>
                      {t('App guide')}
                    </div>
                    <div className='text-foreground/55 text-xs'>
                      {t('Use across client apps')}
                    </div>
                  </div>
                </Link>
              </div>
            </AnimateInView>

            <AnimateInView
              delay={120}
              className='border-border/60 bg-card/50 rounded-2xl border p-6'
            >
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex gap-1.5'>
                  <div className='bg-muted-foreground/10 border-foreground/5 size-2 rounded-full border' />
                  <div className='bg-muted-foreground/10 border-foreground/5 size-2 rounded-full border' />
                  <div className='bg-muted-foreground/10 border-foreground/5 size-2 rounded-full border' />
                </div>
              </div>

              <Tabs
                defaultValue={samples[0].id}
                className='gap-0 overflow-hidden'
              >
                <TabsList className='bg-transparent p-1'>
                  {samples.map((sample) => (
                    <TabsTrigger
                      key={sample.id}
                      value={sample.id}
                      className='text-primary data-active:bg-primary data-active:text-primary-foreground rounded-full px-3 py-1 text-sm font-medium'
                    >
                      {sample.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {samples.map((sample) => (
                  <TabsContent
                    key={sample.id}
                    value={sample.id}
                    className='m-0'
                  >
                    <div className='relative px-2 pt-3 pb-1'>
                      <div className='text-foreground/40 mb-2 text-[10px] font-medium tracking-[0.18em] uppercase'>
                        {t('REQUEST')}
                      </div>
                      <CopyButton
                        value={sample.request}
                        size='sm'
                        className='text-foreground/45 hover:text-foreground absolute top-2 right-2 z-10'
                        aria-label={t('Copy')}
                      />
                      <pre className='overflow-x-auto py-2 text-[12.5px] leading-relaxed sm:text-[13px]'>
                        <code className='text-foreground/75 font-mono'>
                          {renderCodeTokens(sample.request)}
                        </code>
                      </pre>
                    </div>
                    <div className='px-2 pt-3'>
                      <div className='text-foreground/40 border-border/30 mb-1 border-t pt-4 text-[10px] font-medium tracking-[0.18em] uppercase'>
                        {t('RESPONSE')}
                      </div>
                      <pre className='overflow-x-auto py-2 text-[12.5px] leading-relaxed sm:text-[13px]'>
                        <code className='text-foreground/75 font-mono text-wrap'>
                          {renderCodeTokens(sample.response)}
                        </code>
                      </pre>
                    </div>
                    <div className='text-foreground/45 border-border/30 flex items-center justify-between gap-2 border-t pt-3 font-mono text-[11px]'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='secondary'>{sample.method}</Badge>
                        <span className='text-foreground/70 truncate font-mono text-xs'>
                          {sample.path}
                        </span>
                      </div>
                      <div className='flex shrink-0 items-center gap-1.5 pr-1 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                        <span className='size-1.5 rounded-full bg-emerald-500' />
                        200 OK
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </AnimateInView>
          </div>
        </div>
      </div>
    </section>
  )
}
