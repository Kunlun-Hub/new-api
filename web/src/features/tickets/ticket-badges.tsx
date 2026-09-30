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

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { TicketStatus } from './types'

const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useTranslation()
  const labels: Record<TicketStatus, string> = {
    open: t('Open'),
    in_progress: t('In progress'),
    resolved: t('Resolved'),
    closed: t('Closed'),
  }
  return (
    <Badge className={cn('shrink-0', TICKET_STATUS_STYLES[status])}>
      {labels[status]}
    </Badge>
  )
}

export function TicketCategoryBadge({ category }: { category: string }) {
  const { t } = useTranslation()
  const labels: Record<string, string> = {
    billing: t('Billing'),
    technical: t('Technical'),
    account: t('Account'),
    other: t('Other'),
  }
  return (
    <Badge variant='outline' className='shrink-0'>
      {labels[category] ?? labels.other}
    </Badge>
  )
}
