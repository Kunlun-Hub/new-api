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
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { StaticDataTable } from '@/components/data-table/static/static-data-table'
import { StaticRowActions } from '@/components/data-table/static/static-row-actions'
import { DateTimePicker } from '@/components/datetime-picker'
import { Dialog } from '@/components/dialog'
import { StatusBadge, type StatusVariant } from '@/components/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toIntlLocale } from '@/i18n/languages'
import dayjs from '@/lib/dayjs'
import { formatTimestampRelative } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'

import { SettingsSwitchField } from '../components/settings-form-layout'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

export type NoticeEditorTypeOption = {
  value: string
  labelKey: string
  color: string
  badgeVariant: StatusVariant
}

export type NoticeEditorLabels = {
  add: string
  edit: string
  empty: string
  added: string
  updated: string
  deleted: string
  batchDeleted: (count: number) => string
  deleteSingleDescription: string
  deleteBatchDescription: (count: number) => string
  saved: string
  saveFailed: string
  dialogDescription: string
  contentPlaceholder: string
  publishDateDescription: string
  typePlaceholder: string
  extraLabel?: string
  extraPlaceholder?: string
  extraDescription?: string
}

type NoticeEditorSectionProps = {
  title: string
  enabled: boolean
  data: string
  enabledKey: string
  dataKey: string
  defaultType: string
  typeOptions: NoticeEditorTypeOption[]
  showExtra?: boolean
  labels: NoticeEditorLabels
}

type NoticeEditorItem = {
  id: number
  content: string
  publishDate: string
  type: string
  extra?: string
  [key: string]: unknown
}

const noticeEditorSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(500, 'Content must be less than 500 characters'),
  publishDate: z.string().min(1, 'Publish date is required'),
  type: z.string().min(1, 'Type is required'),
  extra: z
    .string()
    .max(100, 'Extra must be less than 100 characters')
    .optional(),
})

type NoticeEditorFormValues = z.infer<typeof noticeEditorSchema>

export function NoticeEditorSection({
  title,
  enabled,
  data,
  enabledKey,
  dataKey,
  defaultType,
  typeOptions,
  showExtra = false,
  labels,
}: NoticeEditorSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const formId = useId()
  const updateOption = useUpdateOption()
  const [notices, setNotices] = useState<NoticeEditorItem[]>([])
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingNotice, setEditingNotice] = useState<NoticeEditorItem | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'batch'>('single')

  const form = useForm<NoticeEditorFormValues>({
    resolver: zodResolver(noticeEditorSchema),
    defaultValues: {
      content: '',
      publishDate: new Date().toISOString(),
      type: defaultType,
      extra: '',
    },
  })

  useEffect(() => {
    try {
      const parsed = JSON.parse(data || '[]') as unknown
      if (!Array.isArray(parsed)) {
        setNotices([])
        return
      }
      setNotices(
        parsed.flatMap<NoticeEditorItem>((item, index) => {
          if (!item || typeof item !== 'object') return []
          const record = item as Record<string, unknown>
          const configuredType =
            typeof record.type === 'string' &&
            typeOptions.some((option) => option.value === record.type)
              ? record.type
              : defaultType
          return [
            {
              ...record,
              id:
                typeof record.id === 'number' && Number.isInteger(record.id)
                  ? record.id
                  : index + 1,
              content: typeof record.content === 'string' ? record.content : '',
              publishDate:
                typeof record.publishDate === 'string'
                  ? record.publishDate
                  : new Date().toISOString(),
              type: configuredType,
            },
          ]
        })
      )
      setSelectedIds([])
    } catch {
      setNotices([])
      setSelectedIds([])
    }
  }, [data, defaultType, typeOptions])

  useEffect(() => {
    setIsEnabled(enabled)
  }, [enabled])

  const handleToggleEnabled = async (checked: boolean) => {
    try {
      await updateOption.mutateAsync({ key: enabledKey, value: checked })
      setIsEnabled(checked)
      toast.success(t('Setting saved'))
    } catch (error) {
      handleServerError(error, t('Failed to update setting'))
    }
  }

  const handleAdd = () => {
    setEditingNotice(null)
    form.reset({
      content: '',
      publishDate: new Date().toISOString(),
      type: defaultType,
      extra: '',
    })
    setShowDialog(true)
  }

  const handleEdit = (notice: NoticeEditorItem) => {
    setEditingNotice(notice)
    form.reset({
      content: notice.content,
      publishDate: notice.publishDate,
      type: notice.type,
      extra: notice.extra || '',
    })
    setShowDialog(true)
  }

  const handleDelete = (notice: NoticeEditorItem) => {
    setEditingNotice(notice)
    setDeleteTarget('single')
    setShowDeleteDialog(true)
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast.error(t('Please select items to delete'))
      return
    }
    setDeleteTarget('batch')
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (deleteTarget === 'single' && editingNotice) {
      setNotices((prev) => prev.filter((item) => item.id !== editingNotice.id))
      setHasChanges(true)
      toast.success(labels.deleted)
    } else if (deleteTarget === 'batch') {
      const count = selectedIds.length
      setNotices((prev) =>
        prev.filter((item) => !selectedIds.includes(item.id))
      )
      setSelectedIds([])
      setHasChanges(true)
      toast.success(labels.batchDeleted(count))
    }
    setShowDeleteDialog(false)
    setEditingNotice(null)
  }

  const handleSubmitForm = (values: NoticeEditorFormValues) => {
    const nextValues = showExtra
      ? values
      : {
          content: values.content,
          publishDate: values.publishDate,
          type: values.type,
        }
    if (editingNotice) {
      setNotices((prev) =>
        prev.map((item) =>
          item.id === editingNotice.id ? { ...item, ...nextValues } : item
        )
      )
      toast.success(labels.updated)
    } else {
      const newId = Math.max(...notices.map((item) => item.id), 0) + 1
      setNotices((prev) => [...prev, { id: newId, ...nextValues }])
      toast.success(labels.added)
    }
    setHasChanges(true)
    setShowDialog(false)
  }

  const handleSaveAll = async () => {
    try {
      await updateOption.mutateAsync({
        key: dataKey,
        value: JSON.stringify(notices),
      })
      setHasChanges(false)
      toast.success(labels.saved)
    } catch (error) {
      handleServerError(error, labels.saveFailed)
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? notices.map((item) => item.id) : [])
  }

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    )
  }

  const sortedNotices = useMemo(() => {
    return [...notices].sort((a, b) => {
      return (
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      )
    })
  }, [notices])

  return (
    <SettingsSection title={title}>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button onClick={handleAdd} size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              {labels.add}
            </Button>
            <Button
              onClick={handleBatchDelete}
              size='sm'
              variant='destructive'
              disabled={selectedIds.length === 0}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('Delete (')}
              {selectedIds.length})
            </Button>
            <Button
              onClick={handleSaveAll}
              size='sm'
              variant='secondary'
              disabled={!hasChanges || updateOption.isPending}
            >
              <Save className='mr-2 h-4 w-4' />
              {updateOption.isPending ? t('Saving...') : t('Save Settings')}
            </Button>
          </div>
          <SettingsSwitchField
            checked={isEnabled}
            onCheckedChange={handleToggleEnabled}
            label={t('Enabled')}
            className='py-0'
          />
        </div>

        <StaticDataTable
          data={sortedNotices}
          getRowKey={(notice) => notice.id}
          emptyContent={labels.empty}
          columns={[
            {
              id: 'select',
              header: (
                <Checkbox
                  checked={
                    selectedIds.length === notices.length && notices.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              ),
              className: 'w-12',
              cell: (notice) => (
                <Checkbox
                  checked={selectedIds.includes(notice.id)}
                  onCheckedChange={(checked) =>
                    toggleSelectOne(notice.id, checked as boolean)
                  }
                />
              ),
            },
            {
              id: 'content',
              header: t('Content'),
              cellClassName: 'max-w-xs truncate',
              cell: (notice) => notice.content,
            },
            {
              id: 'publish-date',
              header: t('Publish Date'),
              cell: (notice) => (
                <div className='flex flex-col gap-1'>
                  <span className='text-sm font-medium'>
                    {formatTimestampRelative(
                      new Date(notice.publishDate).getTime(),
                      'milliseconds',
                      locale
                    )}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {dayjs(notice.publishDate).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                </div>
              ),
            },
            {
              id: 'type',
              header: t('Type'),
              cell: (notice) => {
                const option = typeOptions.find(
                  (item) => item.value === notice.type
                )
                return (
                  <StatusBadge
                    label={option ? t(option.labelKey) : notice.type}
                    variant={option?.badgeVariant ?? 'neutral'}
                    copyable={false}
                  />
                )
              },
            },
            ...(showExtra
              ? [
                  {
                    id: 'extra',
                    header: t('Extra'),
                    cellClassName: 'text-muted-foreground max-w-xs truncate',
                    cell: (notice: NoticeEditorItem) => notice.extra || '-',
                  },
                ]
              : []),
            {
              id: 'actions',
              header: t('Actions'),
              cell: (notice) => (
                <StaticRowActions
                  editLabel={t('Edit')}
                  deleteLabel={t('Delete')}
                  menuLabel={t('Open menu')}
                  onEdit={() => handleEdit(notice)}
                  onDelete={() => handleDelete(notice)}
                />
              ),
            },
          ]}
        />
      </div>

      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={editingNotice ? labels.edit : labels.add}
        description={labels.dialogDescription}
        contentClassName='max-w-2xl'
        contentHeight='auto'
        bodyClassName='space-y-4'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowDialog(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type='submit' form={formId}>
              {editingNotice ? t('Update') : t('Add')}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(handleSubmitForm)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Content')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={labels.contentPlaceholder}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('Maximum 500 characters. Supports Markdown and HTML.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='publishDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Publish Date')}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) =>
                        field.onChange(date ? date.toISOString() : '')
                      }
                      placeholder={t('Select publish date')}
                    />
                  </FormControl>
                  <FormDescription>
                    {labels.publishDateDescription}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Type')}</FormLabel>
                  <Select
                    items={typeOptions.map((option) => ({
                      value: option.value,
                      label: (
                        <div className='flex items-center gap-2'>
                          <div
                            className={`h-3 w-3 rounded-full ${option.color}`}
                          />
                          {t(option.labelKey)}
                        </div>
                      ),
                    }))}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={labels.typePlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className='flex items-center gap-2'>
                              <div
                                className={`h-3 w-3 rounded-full ${option.color}`}
                              />
                              {t(option.labelKey)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showExtra && labels.extraLabel && (
              <FormField
                control={form.control}
                name='extra'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.extraLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={labels.extraPlaceholder} {...field} />
                    </FormControl>
                    <FormDescription>{labels.extraDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'single'
                ? labels.deleteSingleDescription
                : labels.deleteBatchDescription(selectedIds.length)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={confirmDelete}>
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  )
}
