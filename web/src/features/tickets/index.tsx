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
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { listTickets } from './api'
import { NewTicketDialog } from './new-ticket-dialog'
import { TicketCategoryBadge, TicketStatusBadge } from './ticket-badges'

const PAGE_SIZE = 15

const STATUS_FILTERS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'All' },
  { value: 'open', labelKey: 'Open' },
  { value: 'in_progress', labelKey: 'In progress' },
  { value: 'resolved', labelKey: 'Resolved' },
  { value: 'closed', labelKey: 'Closed' },
]

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5']

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString()
}

export function Tickets() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)

  const ticketsQuery = useQuery({
    queryKey: ['tickets', status, page],
    queryFn: () => listTickets(status, page, PAGE_SIZE),
  })

  const tickets = ticketsQuery.data?.items ?? []
  const total = ticketsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function renderList() {
    if (ticketsQuery.isLoading) {
      return (
        <div className='flex flex-col gap-3'>
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className='h-20 rounded-2xl' />
          ))}
        </div>
      )
    }
    if (tickets.length === 0) {
      return (
        <div className='rounded-2xl border bg-card p-12 text-center shadow-xs'>
          <p className='text-muted-foreground text-sm'>
            {t('No tickets yet. Open a ticket if you need help.')}
          </p>
          <Button
            variant='outline'
            className='mt-4'
            onClick={() => setDialogOpen(true)}
          >
            <MessageSquarePlus className='size-4' aria-hidden='true' />
            {t('New ticket')}
          </Button>
        </div>
      )
    }
    return (
      <div className='flex flex-col gap-3'>
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to='/tickets/$ticketId'
            params={{ ticketId: String(ticket.id) }}
            className='rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 sm:p-5'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='font-medium tracking-tight break-words'>
                  #{ticket.id} {ticket.title}
                </div>
                <div className='text-muted-foreground mt-1 text-xs'>
                  {formatTime(ticket.updated_at)}
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-1.5'>
                <TicketCategoryBadge category={ticket.category} />
                <TicketStatusBadge status={ticket.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Tickets')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-wrap gap-1.5'>
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={status === filter.value ? 'default' : 'ghost'}
                  size='sm'
                  className={cn(
                    'rounded-full',
                    status !== filter.value &&
                      'text-muted-foreground hover:bg-accent'
                  )}
                  onClick={() => {
                    setStatus(filter.value)
                    setPage(1)
                  }}
                >
                  {t(filter.labelKey)}
                </Button>
              ))}
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <MessageSquarePlus className='size-4' aria-hidden='true' />
              {t('New ticket')}
            </Button>
          </div>

          {renderList()}

          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('Previous')}
              </Button>
              <span className='text-muted-foreground text-sm tabular-nums'>
                {page} / {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('Next')}
              </Button>
            </div>
          )}
        </div>

        <NewTicketDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={() => ticketsQuery.refetch()}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
