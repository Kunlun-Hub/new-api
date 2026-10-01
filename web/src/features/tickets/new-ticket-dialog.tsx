import { zodResolver } from '@hookform/resolvers/zod'
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
import { Code2, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'

import { createTicket } from './api'
import { useTicketComposer } from './use-ticket-composer'

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string(),
  priority: z.string(),
  content: z.string().min(1, 'Description is required').max(5000),
})

type TicketFormValues = z.infer<typeof ticketSchema>

const FORM_ID = 'new-ticket-form'

export function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (ticketId?: number) => void
}) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      category: 'technical',
      priority: 'normal',
      content: '',
    },
  })

  const composer = useTicketComposer(form.watch('content'), (next) =>
    form.setValue('content', next, {
      shouldDirty: true,
      shouldValidate: true,
    })
  )

  const categories = [
    { value: 'technical', label: t('Technical') },
    { value: 'account', label: t('Account') },
    { value: 'billing', label: t('Billing') },
    { value: 'other', label: t('Other') },
  ]

  const priorities = [
    { value: 'low', label: t('Low') },
    { value: 'normal', label: t('Medium') },
    { value: 'high', label: t('High') },
    { value: 'urgent', label: t('Urgent') },
  ]

  async function onSubmit(values: TicketFormValues) {
    setSubmitting(true)
    try {
      const ticket = await createTicket(values)
      toast.success(t('Ticket created'))
      onOpenChange(false)
      form.reset()
      onCreated?.(ticket.id)
    } catch (error) {
      handleServerError(error, t('Failed to create ticket'))
    } finally {
      setSubmitting(false)
    }
  }

  const renderRequiredLabel = (label: string) => (
    <>
      {label}
      <span className='text-red-500'>*</span>
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Create Ticket')}
      contentClassName='sm:max-w-lg'
      bodyClassName='px-1 py-1'
      footer={
        <div className='flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <Button
            type='button'
            variant='secondary'
            onClick={() => onOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button type='submit' form={FORM_ID} disabled={submitting}>
            {submitting ? t('Submitting...') : t('Submit Ticket')}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4'
          noValidate
        >
          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{renderRequiredLabel(t('Ticket Title'))}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('Briefly describe your issue')}
                    maxLength={200}
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Issue Category')}</FormLabel>
                  <Select
                    items={categories}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='priority'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Priority')}</FormLabel>
                  <Select
                    items={priorities}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name='content'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {renderRequiredLabel(t('Issue Description'))}
                </FormLabel>
                <div className='border-input focus-within:border-ring focus-within:ring-ring/50 flex flex-col rounded-lg border transition-colors focus-within:ring-[3px]'>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder={[
                        t('Please describe your issue in detail, including:'),
                        t(
                          '1. When and where it happened, error messages, the model used, token group, etc.'
                        ),
                        t('2. The result you expected'),
                        t('3. Screenshots of the error (if any)'),
                        t('Vague or overly simple tickets may be closed'),
                      ].join('\n')}
                      className={cn(
                        'resize-none border-0 shadow-none focus-visible:ring-0',
                        'min-h-32 rounded-b-none'
                      )}
                      {...field}
                      onPaste={composer.handlePaste}
                      ref={(node) => {
                        field.ref(node)
                        composer.textRef.current = node
                      }}
                    />
                  </FormControl>
                  <div className='flex items-center gap-1 px-2 pb-2'>
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
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </Dialog>
  )
}
