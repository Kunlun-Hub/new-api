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
import dayjs from 'dayjs'
import {
  CheckCheck,
  ChevronLeft,
  Code2,
  Paperclip,
  Send,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toIntlLocale } from '@/i18n/languages'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'

import { closeTicket, getTicketDetail, replyTicket } from './api'
import { TicketStatusBadge } from './ticket-badges'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_MESSAGE_MARKDOWN_CLASS,
} from './ticket-constants'
import type { TicketReply } from './types'
import { useTicketComposer } from './use-ticket-composer'

function formatMessageTime(unix: number, locale?: string): string {
  const time = dayjs.unix(unix)
  if (time.isSame(dayjs(), 'day')) {
    return time.format('HH:mm')
  }
  const intlLocale = toIntlLocale(locale)
  return new Intl.DateTimeFormat(intlLocale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(time.toDate())
}

function ReplyBubble(props: {
  reply: TicketReply
  username: string
  locale?: string
}) {
  const { t } = useTranslation()
  const isStaff = props.reply.is_staff
  const author = isStaff ? t('Support') : props.username
  return (
    <div
      className={cn('flex items-start gap-2.5', !isStaff && 'flex-row-reverse')}
    >
      <div
        aria-hidden='true'
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
          isStaff
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {author.slice(0, 1).toUpperCase()}
      </div>
      <div
        className={cn(
          'min-w-0 max-w-[78%] space-y-1',
          !isStaff && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'text-muted-foreground flex items-center gap-2 text-[0.7rem]',
            !isStaff && 'flex-row-reverse'
          )}
        >
          <span className='text-foreground/80 font-medium'>{author}</span>
          <span>{formatMessageTime(props.reply.created_at, props.locale)}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl border px-3 py-2',
            isStaff
              ? 'bg-muted/60 border-border/40'
              : 'bg-primary text-primary-foreground border-primary/40'
          )}
        >
          <Markdown className={TICKET_MESSAGE_MARKDOWN_CLASS}>
            {props.reply.content}
          </Markdown>
        </div>
        {!isStaff && (
          <div className='flex h-3 justify-end'>
            <CheckCheck
              className='text-muted-foreground size-3'
              aria-hidden='true'
            />
          </div>
        )}
      </div>
    </div>
  )
}

type TicketConversationProps = {
  ticketId: string
  username: string
  onBack?: () => void
  onChanged?: () => void
}

export function TicketConversation(props: TicketConversationProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const composer = useTicketComposer(content, setContent)

  const detailQuery = useQuery({
    queryKey: ['ticket', props.ticketId],
    queryFn: () => getTicketDetail(Number(props.ticketId)),
    retry: false,
    meta: { errorToast: false },
  })

  const ticket = detailQuery.data?.ticket
  const replies = detailQuery.data?.replies ?? []
  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved'

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ['ticket', props.ticketId],
    })
    props.onChanged?.()
  }

  async function handleReply() {
    const text = content.trim()
    if (!text || !ticket || composer.uploading) return
    setSending(true)
    try {
      await replyTicket(ticket.id, text)
      setContent('')
      await refresh()
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
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    } catch (error) {
      handleServerError(error, t('Failed to close ticket'))
    } finally {
      setClosing(false)
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className='border-border/40 bg-background/60 flex h-full min-h-0 flex-col gap-3 rounded-2xl border p-4'>
        <Skeleton className='h-12 w-1/2' />
        <Skeleton className='h-24 w-2/3' />
        <Skeleton className='h-24 w-2/3 self-end' />
      </div>
    )
  }

  if (detailQuery.isError || !ticket) {
    return (
      <div className='border-border/40 bg-background/60 flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center'>
        <p className='text-muted-foreground text-sm'>
          {t('Ticket not found or you do not have access.')}
        </p>
        <Button variant='outline' size='sm' onClick={() => void refresh()}>
          {t('Retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className='border-border/40 bg-background/60 flex h-full min-h-0 flex-col rounded-2xl border'>
      <header className='border-border/40 flex items-start justify-between gap-3 border-b p-4'>
        <div className='flex min-w-0 items-start gap-2'>
          {props.onBack && (
            <Button
              variant='ghost'
              size='icon'
              aria-label={t('Back')}
              className='-ml-1 size-8 shrink-0 lg:hidden'
              onClick={props.onBack}
            >
              <ChevronLeft className='size-5' aria-hidden='true' />
            </Button>
          )}
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h3 className='truncate text-sm font-semibold sm:text-base'>
                {ticket.title}
              </h3>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className='text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
              <span className='bg-secondary text-secondary-foreground inline-flex h-5 shrink-0 items-center justify-center rounded-full border border-transparent px-2 py-0 font-medium'>
                {ticket.ticket_no}
              </span>
              <span>
                {t(TICKET_CATEGORY_LABELS[ticket.category] ?? 'Other')}
              </span>
              <span>·</span>
              <span className='truncate'>{props.username}</span>
            </div>
          </div>
        </div>
        {!isClosed && (
          <div className='flex shrink-0 flex-wrap justify-end gap-2'>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-border/60 shrink-0'
                  />
                }
              >
                <X className='size-4' aria-hidden='true' />
                {t('Close ticket')}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('Close this ticket?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      'You will not be able to reply after closing. Are you sure?'
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={closing}
                    onClick={() => void handleClose()}
                  >
                    {t('Close ticket')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </header>

      <div className='[&::-webkit-scrollbar-thumb]:bg-muted flex-1 space-y-4 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full'>
        {replies.length === 0 ? (
          <p className='text-muted-foreground py-8 text-center text-sm'>
            {t('No messages yet')}
          </p>
        ) : (
          replies.map((reply) => (
            <ReplyBubble
              key={reply.id}
              reply={reply}
              username={props.username}
              locale={i18n.language}
            />
          ))
        )}
      </div>

      {isClosed ? (
        <div className='border-border/40 text-muted-foreground border-t px-4 py-5 text-center text-sm'>
          {t(
            'This ticket is closed. Please create a new ticket for further questions.'
          )}
        </div>
      ) : (
        <form
          className='p-3'
          onSubmit={(event) => {
            event.preventDefault()
            void handleReply()
          }}
        >
          <div className='border-border/40 bg-background/60 focus-within:border-primary/40 focus-within:ring-primary/20 flex flex-col rounded-2xl border p-2 focus-within:ring-2'>
            <Textarea
              ref={composer.textRef}
              rows={2}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onPaste={composer.handlePaste}
              placeholder={t('Write your reply...')}
              className='max-h-40 min-h-12 resize-none border-none bg-transparent px-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent'
            />
            <div className='flex items-center gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={t('Insert code block')}
                title={t('Insert code block')}
                className='text-muted-foreground size-9 rounded-xl'
                onClick={composer.insertCodeBlock}
              >
                <Code2 className='size-4' aria-hidden='true' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={t('Upload attachment')}
                title={t('Upload attachment')}
                className='text-muted-foreground size-9 rounded-xl'
                disabled={composer.uploading}
                onClick={composer.openFilePicker}
              >
                {composer.uploading ? (
                  <Spinner />
                ) : (
                  <Paperclip className='size-4' aria-hidden='true' />
                )}
              </Button>
              <input
                ref={composer.fileRef}
                type='file'
                className='hidden'
                accept={composer.accept}
                onChange={composer.handlePickFile}
              />
              <div className='flex-1' />
              <Button
                type='submit'
                size='icon'
                aria-label={t('Send')}
                className='size-9 rounded-xl'
                disabled={!content.trim() || sending || composer.uploading}
              >
                <Send className='size-4' aria-hidden='true' />
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
