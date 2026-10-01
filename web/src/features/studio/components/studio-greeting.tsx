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
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { getGreetingPeriod } from '../lib/greeting'

type StudioGreetingProps = {
  icon: LucideIcon
  question: string
  iconClassName?: string
}

/** Time-based greeting headline, e.g. 「凌晨好，有什么可以帮你？」 */
export function StudioGreeting(props: StudioGreetingProps) {
  const { t } = useTranslation()
  const Icon = props.icon
  const greeting = t(`studio.greeting.${getGreetingPeriod()}`)

  return (
    <h1 className='mb-8 flex items-center justify-center gap-3 text-center text-2xl font-medium tracking-tight md:text-3xl'>
      <Icon className={cn('size-7', props.iconClassName)} />
      {t('studio.greeting.withQuestion', {
        greeting,
        question: props.question,
      })}
    </h1>
  )
}
