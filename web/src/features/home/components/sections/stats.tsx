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
import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactCount, formatNumber } from '@/lib/format'

import { useHomeStats } from '../../hooks'

interface CounterProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
  compact?: boolean
}

function Counter(props: CounterProps) {
  const {
    end,
    suffix = '',
    prefix = '',
    duration = 1600,
    decimals = 0,
    compact = false,
  } = props
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  const formatValue = useCallback(
    (v: number) => {
      if (compact) return formatCompactCount(v)
      return decimals > 0 ? v.toFixed(decimals) : formatNumber(v)
    },
    [compact, decimals]
  )

  const animate = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = `${prefix}${formatValue(eased * end)}${suffix}`
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, prefix, suffix, formatValue])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.textContent = `${prefix}${formatValue(end)}${suffix}`
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          animate()
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animate, end, prefix, suffix, formatValue])

  return (
    <span ref={ref} className='tabular-nums'>
      {prefix}0{suffix}
    </span>
  )
}

interface StatsProps {
  className?: string
}

interface StatItem {
  end: number
  suffix: string
  label: string
  decimals?: number
  compact?: boolean
}

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()
  const { data } = useHomeStats()

  const stats: StatItem[] = data
    ? [
        {
          end: data.model_count,
          suffix: '+',
          label: t('AI models available'),
        },
        {
          end: data.total_requests,
          suffix: '',
          label: t('Requests served'),
          compact: true,
        },
        ...(data.success_rate_hours > 0
          ? [
              {
                end: data.success_rate,
                suffix: '%',
                label: t('service availability'),
                decimals: 1,
              },
            ]
          : []),
      ]
    : []

  return (
    <div className='w-full px-4 py-8'>
      <div className='border-border/60 bg-card/50 mx-auto grid max-w-6xl gap-4 rounded-2xl border p-6 text-center backdrop-blur-sm sm:grid-cols-3'>
        {stats.length === 0
          ? [0, 1, 2].map((slot) => (
              <div key={slot} className='space-y-2'>
                <Skeleton className='mx-auto h-4 w-24' />
                <Skeleton className='mx-auto h-8 w-20' />
              </div>
            ))
          : stats.map((stat) => (
              <div key={stat.label} className='space-y-1'>
                <div className='text-muted-foreground text-sm tracking-[0.3em] uppercase'>
                  {stat.label}
                </div>
                <div className='text-foreground text-3xl font-semibold'>
                  <Counter
                    end={stat.end}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                    compact={stat.compact}
                  />
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
