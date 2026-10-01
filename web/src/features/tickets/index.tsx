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
import { Plus, RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NoDataIllustration } from '@/components/empty-illustrations'
import { ConsoleBreadcrumb, SectionPageLayout } from '@/components/layout'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toIntlLocale } from '@/i18n/languages'
import { formatTimestampRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { getTicketStats, listTickets } from './api'
import { NewTicketDialog } from './new-ticket-dialog'
import { TicketStatusBadge } from './ticket-badges'
import { TicketConversation } from './ticket-conversation'
import type { Ticket } from './types'
import { useTicketSocket } from './use-ticket-socket'

const PAGE_SIZE = 15

const STATUS_FILTERS: {
  value: string
  labelKey: string
  countKey: 'pending' | 'resolved' | 'closed'
}[] = [
  { value: 'replied', labelKey: 'Replied', countKey: 'resolved' },
  { value: 'pending', labelKey: 'Awaiting reply', countKey: 'pending' },
  { value: 'closed', labelKey: 'Closed', countKey: 'closed' },
]

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5']

function matchesQuery(ticket: Ticket, query: string): boolean {
  if (!query) return true
  const keyword = query.trim().toLowerCase()
  return (
    ticket.title.toLowerCase().includes(keyword) ||
    `#${ticket.id}`.includes(keyword)
  )
}

export function Tickets(props: { initialTicketId?: number }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.auth.user)
  const [status, setStatus] = useState(STATUS_FILTERS[0].value)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(
    props.initialTicketId ? String(props.initialTicketId) : null
  )

  const ticketsQuery = useQuery({
    queryKey: ['tickets', status, page],
    queryFn: () => listTickets(status, page, PAGE_SIZE),
  })

  const statsQuery = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: getTicketStats,
  })

  useEffect(() => {
    if (props.initialTicketId) {
      setSelectedId(String(props.initialTicketId))
    }
  }, [props.initialTicketId])

  // Staff replies and status changes arrive over the ticket WebSocket.
  useTicketSocket(false, (event) => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['ticket-stats'] })
    if (String(event.ticket_id) === selectedId) {
      queryClient.invalidateQueries({
        queryKey: ['ticket', String(event.ticket_id)],
      })
    }
  })

  const tickets = useMemo(
    () =>
      (ticketsQuery.data?.items ?? []).filter((t) => matchesQuery(t, query)),
    [ticketsQuery.data, query]
  )
  const total = ticketsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const userLabel = user?.email || user?.username || ''

  const renderList = () => {
    if (ticketsQuery.isLoading) {
      return (
        <div className='flex flex-col gap-2'>
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className='h-16 rounded-xl' />
          ))}
        </div>
      )
    }
    if (tickets.length === 0) {
      return (
        <p className='text-muted-foreground py-12 text-center text-sm'>
          {query ? t('No matching tickets') : t('No tickets yet')}
        </p>
      )
    }
    return (
      <ul className='space-y-1.5'>
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <button
              type='button'
              onClick={() => setSelectedId(String(ticket.id))}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors',
                'hover:border-border/40 hover:bg-muted/40',
                selectedId === String(ticket.id) &&
                  'border-border/80 bg-muted/40'
              )}
            >
              <Avatar className='size-9 shrink-0'>
                <AvatarFallback className='text-xs'>
                  {(user?.username || '?').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex items-center gap-2'>
                  <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                    {ticket.title}
                  </span>
                  <TicketStatusBadge status={ticket.status} />
                </div>
                <div className='text-muted-foreground flex items-center justify-between gap-2 text-[0.7rem]'>
                  <span className='flex min-w-0 items-center gap-1.5'>
                    <span className='min-w-0 truncate'>{userLabel}</span>
                  </span>
                  <span className='shrink-0'>
                    {formatTimestampRelative(
                      ticket.updated_at,
                      'seconds',
                      toIntlLocale(i18n.language)
                    )}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
        {totalPages > 1 && (
          <li className='flex items-center justify-center gap-2 pt-1'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('Previous')}
            </Button>
            <span className='text-muted-foreground text-xs tabular-nums'>
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
          </li>
        )}
      </ul>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Breadcrumb>
        <ConsoleBreadcrumb
          items={[
            { label: t('Dashboard'), href: '/dashboard/overview' },
            { label: t('Tickets') },
          ]}
        />
      </SectionPageLayout.Breadcrumb>
      <SectionPageLayout.Title>
        <span className='flex items-center gap-2'>
          {t('Tickets')}
          <span
            className='size-2 rounded-full bg-green-500 transition-colors'
            title={t('Live')}
          />
        </span>
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button
          variant='outline'
          size='icon'
          className='size-8'
          aria-label={t('Refresh')}
          onClick={() => {
            void ticketsQuery.refetch()
            void statsQuery.refetch()
          }}
        >
          <RefreshCw className='size-4' aria-hidden='true' />
        </Button>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className='size-4' aria-hidden='true' />
          {t('Create Ticket')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='flex h-full min-h-0 flex-col gap-4 lg:flex-row'>
          <aside
            className={cn(
              'min-h-0 flex-1 lg:w-80 lg:flex-none',
              selectedId && 'max-lg:hidden'
            )}
          >
            <div className='border-border/40 bg-background/60 flex h-full min-h-0 flex-col gap-3 rounded-2xl border p-3'>
              <Tabs
                value={status}
                onValueChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
              >
                <TabsList className='border-border/40 bg-background/40 w-full gap-1 rounded-full border p-1'>
                  {STATUS_FILTERS.map((filter) => {
                    const count = statsQuery.data?.[filter.countKey] ?? 0
                    return (
                      <TabsTrigger
                        key={filter.value}
                        value={filter.value}
                        className='text-muted-foreground data-active:bg-foreground data-active:text-background h-auto flex-1 rounded-full px-3 py-1 text-xs shadow-none'
                      >
                        {t(filter.labelKey)}
                        {count > 0 && (
                          <span className='inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-semibold text-white'>
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
              <div className='relative'>
                <Search
                  className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2'
                  aria-hidden='true'
                />
                <Input
                  type='search'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('Search tickets')}
                  aria-label={t('Search tickets')}
                  className='border-border/40 bg-background/60 h-9 rounded-xl pl-9'
                />
              </div>
              <div className='[&::-webkit-scrollbar-thumb]:bg-muted -mr-1 min-h-0 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full'>
                {renderList()}
              </div>
            </div>
          </aside>
          <section className='min-h-0 min-w-0 flex-1'>
            {selectedId ? (
              <TicketConversation
                ticketId={selectedId}
                username={userLabel}
                onBack={() => setSelectedId(null)}
                onChanged={() => void ticketsQuery.refetch()}
              />
            ) : (
              <div className='border-border/40 bg-background/60 hidden h-full flex-col items-center justify-center gap-3 rounded-2xl border text-center lg:flex'>
                <Empty className='py-12'>
                  <EmptyHeader>
                    <EmptyMedia className='mb-2'>
                      <NoDataIllustration />
                    </EmptyMedia>
                    <EmptyTitle>{t('Welcome back')}</EmptyTitle>
                    <EmptyDescription>
                      {t('Hope we can help you today')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </section>
        </div>

        <NewTicketDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={(ticketId) => {
            setStatus('pending')
            setPage(1)
            void ticketsQuery.refetch()
            if (ticketId) setSelectedId(String(ticketId))
          }}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
