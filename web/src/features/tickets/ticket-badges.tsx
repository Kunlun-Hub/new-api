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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { TICKET_CATEGORY_LABELS } from './ticket-constants'
import type { TicketStatus } from './types'

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Awaiting reply',
  in_progress: 'Replied',
  resolved: 'Replied',
  closed: 'Closed',
}

const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  in_progress: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  closed: 'border-border/50 bg-muted text-muted-foreground',
}

export function TicketStatusBadge(props: {
  status: TicketStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-full border px-1.5 py-0 text-[0.65rem] font-medium whitespace-nowrap',
        TICKET_STATUS_STYLES[props.status],
        props.className
      )}
    >
      {t(TICKET_STATUS_LABELS[props.status] ?? 'Awaiting reply')}
    </span>
  )
}

export function TicketCategoryBadge({ category }: { category: string }) {
  const { t } = useTranslation()
  return (
    <span className='bg-secondary text-secondary-foreground inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-full px-1.5 py-0 text-[0.65rem] font-medium whitespace-nowrap'>
      {t(TICKET_CATEGORY_LABELS[category] ?? 'Other')}
    </span>
  )
}
