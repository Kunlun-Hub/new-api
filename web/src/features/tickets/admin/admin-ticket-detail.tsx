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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'

import {
  adminGetTicket,
  adminReplyTicket,
  adminUpdateTicket,
} from '../api'
import { TicketCategoryBadge, TicketStatusBadge } from '../ticket-badges'
import type { TicketReply } from '../types'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

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
          {reply.is_staff ? t('Support') : `${t('User')} ${reply.user_id}`}
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

export function AdminTicketDetail({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: () => adminGetTicket(Number(ticketId)),
    retry: false,
  })

  const ticket = detailQuery.data?.ticket
  const replies = detailQuery.data?.replies ?? []

  const statusLabels: Record<string, string> = {
    open: t('Open'),
    in_progress: t('In progress'),
    resolved: t('Resolved'),
    closed: t('Closed'),
  }
  const priorityLabels: Record<string, string> = {
    low: t('Low'),
    normal: t('Normal'),
    high: t('High'),
    urgent: t('Urgent'),
  }

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ['admin-ticket', ticketId],
    })
    await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
  }

  async function handleReply() {
    const text = content.trim()
    if (!text || !ticket) return
    setSending(true)
    try {
      await adminReplyTicket(ticket.id, text)
      setContent('')
      await refresh()
    } catch (error) {
      handleServerError(error, t('Failed to send reply'))
    } finally {
      setSending(false)
    }
  }

  async function handleUpdate(input: { status?: string; priority?: string }) {
    if (!ticket) return
    setUpdating(true)
    try {
      await adminUpdateTicket(ticket.id, input)
      toast.success(t('Ticket updated'))
      await refresh()
    } catch (error) {
      handleServerError(error, t('Failed to update ticket'))
    } finally {
      setUpdating(false)
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
            {t('Ticket not found.')}
          </p>
          <Link to='/admin/tickets'>
            <Button variant='outline' className='mt-4'>
              {t('Back to ticket list')}
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
            <Badge variant='outline' className='capitalize'>
              {ticket.priority}
            </Badge>
          </div>
          <h2 className='mt-3 text-lg font-bold tracking-tight'>
            {ticket.title}
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('User')} {ticket.user_id} · {t('Created')}{' '}
            {formatTime(ticket.created_at)}
          </p>
          <div className='mt-4 flex flex-wrap items-center gap-3'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-sm'>
                {t('Status')}
              </span>
              <Select
                value={ticket.status}
                disabled={updating}
                onValueChange={(value) => { if (value) handleUpdate({ status: value }) }}
              >
                <SelectTrigger className='w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-sm'>
                {t('Priority')}
              </span>
              <Select
                value={ticket.priority}
                disabled={updating}
                onValueChange={(value) => { if (value) handleUpdate({ priority: value }) }}
              >
                <SelectTrigger className='w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          {replies.map((reply) => (
            <ReplyBubble key={reply.id} reply={reply} />
          ))}
        </div>

        <div className='rounded-2xl border bg-card p-4 shadow-xs sm:p-5'>
          <Textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('Write your reply...')}
          />
          <div className='mt-3 flex justify-end'>
            <Button
              size='sm'
              disabled={!content.trim() || sending}
              onClick={handleReply}
            >
              <Send className='size-4' aria-hidden='true' />
              {sending ? t('Sending...') : t('Send reply')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div className='flex items-center gap-2'>
          <Link to='/admin/tickets'>
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
