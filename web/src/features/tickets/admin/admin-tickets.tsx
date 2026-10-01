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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConsoleBreadcrumb, SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { adminListTickets } from '../api'
import { TicketCategoryBadge, TicketStatusBadge } from '../ticket-badges'
import { useTicketSocket } from '../use-ticket-socket'
import { AdminTicketConversation } from './admin-ticket-conversation'

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

export function AdminTickets(props: { initialTicketId?: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(
    props.initialTicketId ?? null
  )

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', status, page],
    queryFn: () => adminListTickets(status, page, PAGE_SIZE),
  })

  useEffect(() => {
    if (props.initialTicketId) {
      setSelectedId(props.initialTicketId)
    }
  }, [props.initialTicketId])

  // Staff conversations stay live: new tickets, replies and status changes
  // invalidate the affected queries instead of requiring a manual refresh.
  useTicketSocket(true, (event) => {
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    if (event.ticket_id === selectedId) {
      queryClient.invalidateQueries({
        queryKey: ['admin-ticket', event.ticket_id],
      })
    }
    if (event.type === 'ticket.created' && selectedId === null) {
      setSelectedId(event.ticket_id)
    }
  })

  const tickets = useMemo(() => {
    const items = ticketsQuery.data?.items ?? []
    const keyword = query.trim().toLowerCase()
    if (keyword === '') return items
    return items.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(keyword) ||
        `#${ticket.id}`.includes(keyword)
    )
  }, [ticketsQuery.data?.items, query])
  const total = ticketsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const renderList = () => {
    if (ticketsQuery.isLoading) {
      return (
        <div className='flex flex-col gap-2'>
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className='h-20 rounded-xl' />
          ))}
        </div>
      )
    }
    if (tickets.length === 0) {
      return (
        <div className='bg-card rounded-2xl border p-12 text-center shadow-xs'>
          <p className='text-muted-foreground text-sm'>
            {t('No tickets found.')}
          </p>
        </div>
      )
    }
    return (
      <div className='flex flex-col gap-2'>
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            type='button'
            onClick={() => setSelectedId(ticket.id)}
            className={cn(
              'rounded-2xl border p-4 text-left shadow-xs transition-colors',
              ticket.id === selectedId
                ? 'border-primary/50 bg-primary/5'
                : 'bg-card hover:border-primary/40'
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='font-medium tracking-tight break-words'>
                  #{ticket.id} {ticket.title}
                </div>
                <div className='text-muted-foreground mt-1 text-xs'>
                  {t('User')} {ticket.user_id} · {formatTime(ticket.updated_at)}
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-1.5'>
                <TicketCategoryBadge category={ticket.category} />
                <TicketStatusBadge status={ticket.status} />
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Breadcrumb>
        <ConsoleBreadcrumb
          items={[
            { label: t('Dashboard'), href: '/dashboard/overview' },
            { label: t('Ticket management') },
          ]}
        />
      </SectionPageLayout.Breadcrumb>
      <SectionPageLayout.Title>
        {t('Ticket management')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]'>
          <div className='flex flex-col gap-3'>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search tickets')}
              className='h-9'
            />
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

            {renderList()}

            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  {t('Next')}
                </Button>
              </div>
            )}
          </div>

          <div className='min-w-0'>
            {selectedId === null ? (
              <div className='bg-card rounded-2xl border p-16 shadow-xs'>
                <div className='flex flex-col items-center gap-3 text-center'>
                  <MessagesSquare
                    className='text-muted-foreground size-10'
                    aria-hidden='true'
                  />
                  <p className='text-muted-foreground text-sm'>
                    {t('Select a ticket to read and reply in the conversation.')}
                  </p>
                </div>
              </div>
            ) : (
              <AdminTicketConversation ticketId={selectedId} />
            )}
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
