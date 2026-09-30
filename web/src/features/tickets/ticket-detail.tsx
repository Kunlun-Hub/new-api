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
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'

import { closeTicket, getTicketDetail, replyTicket } from './api'
import { TicketCategoryBadge, TicketStatusBadge } from './ticket-badges'
import type { TicketReply } from './types'

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString()
}

function ReplyBubble({ reply }: { reply: TicketReply }) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-2xl border p-4',
        reply.is_staff ? 'border-primary/20 bg-primary/5' : 'bg-card'
      )}
    >
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium'>
          {reply.is_staff ? t('Support') : t('You')}
        </span>
        <span className='text-muted-foreground text-xs'>
          {formatTime(reply.created_at)}
        </span>
      </div>
      <p className='text-sm leading-relaxed break-words whitespace-pre-wrap'>
        {reply.content}
      </p>
    </div>
  )
}

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicketDetail(Number(ticketId)),
    retry: false,
  })

  const ticket = detailQuery.data?.ticket
  const replies = detailQuery.data?.replies ?? []
  const isClosed =
    ticket?.status === 'closed' || ticket?.status === 'resolved'

  async function handleReply() {
    const text = content.trim()
    if (!text || !ticket) return
    setSending(true)
    try {
      await replyTicket(ticket.id, text)
      setContent('')
      await queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    } catch (error) {
      handleServerError(error, t('Failed to send reply'))
    } finally {
      setSending(false)
    }
  }

  async function handleClose() {
    if (!ticket) return
    setClosing(true)
    try {
      await closeTicket(ticket.id)
      toast.success(t('Ticket closed'))
      await queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    } catch (error) {
      handleServerError(error, t('Failed to close ticket'))
    } finally {
      setClosing(false)
    }
  }

  function renderContent() {
    if (detailQuery.isLoading) {
      return (
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-28 rounded-2xl' />
          <Skeleton className='h-24 rounded-2xl' />
          <Skeleton className='h-24 rounded-2xl' />
        </div>
      )
    }
    if (detailQuery.isError || !ticket) {
      return (
        <div className='rounded-2xl border bg-card p-12 text-center shadow-xs'>
          <p className='text-muted-foreground text-sm'>
            {t('Ticket not found or you do not have access.')}
          </p>
          <Link to='/tickets'>
            <Button variant='outline' className='mt-4'>
              {t('Back to tickets')}
            </Button>
          </Link>
        </div>
      )
    }
    return (
      <div className='flex flex-col gap-4'>
        <div className='rounded-2xl border bg-card p-5 shadow-xs sm:p-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <TicketStatusBadge status={ticket.status} />
            <TicketCategoryBadge category={ticket.category} />
            {ticket.priority !== 'normal' && (
              <Badge variant='outline' className='capitalize'>
                {ticket.priority}
              </Badge>
            )}
          </div>
          <h2 className='mt-3 text-lg font-bold tracking-tight'>
            {ticket.title}
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Created')} {formatTime(ticket.created_at)}
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          {replies.map((reply) => (
            <ReplyBubble key={reply.id} reply={reply} />
          ))}
        </div>

        {isClosed ? (
          <div className='rounded-2xl border bg-card p-6 text-center shadow-xs'>
            <p className='text-muted-foreground text-sm'>
              {t(
                'This ticket is closed. Open a new ticket if you need further help.'
              )}
            </p>
          </div>
        ) : (
          <div className='rounded-2xl border bg-card p-4 shadow-xs sm:p-5'>
            <Textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('Write your reply...')}
            />
            <div className='mt-3 flex items-center justify-between'>
              <Button
                variant='outline'
                size='sm'
                disabled={closing}
                onClick={handleClose}
              >
                {t('Close ticket')}
              </Button>
              <Button
                size='sm'
                disabled={!content.trim() || sending}
                onClick={handleReply}
              >
                <Send className='size-4' aria-hidden='true' />
                {sending ? t('Sending...') : t('Send')}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div className='flex items-center gap-2'>
          <Link to='/tickets'>
            <Button variant='ghost' size='icon' aria-label={t('Back')}>
              <ArrowLeft className='size-4' aria-hidden='true' />
            </Button>
          </Link>
          {t('Ticket')} #{ticketId}
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>{renderContent()}</SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
