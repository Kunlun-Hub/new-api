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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { StaticDataTable } from '@/components/data-table/static/static-data-table'
import { StaticRowActions } from '@/components/data-table/static/static-row-actions'
import { Dialog } from '@/components/dialog'
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
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  adminCreateContent,
  adminDeleteContent,
  adminImportContent,
  adminListContent,
  adminUpdateContent,
  type AdminContentPayload,
  type SiteContentKind,
  type SiteContentRecord,
} from '@/features/help/lib/content-api'
import { buildBuiltinContentPayloads } from '@/features/help/lib/content-import'
import dayjs from '@/lib/dayjs'
import { handleServerError } from '@/lib/handle-server-error'

import { SettingsSection } from '../components/settings-section'

const CONTENT_KINDS: { value: SiteContentKind; labelKey: string }[] = [
  { value: 'doc', labelKey: 'Docs' },
  { value: 'blog', labelKey: 'Blog' },
  { value: 'faq', labelKey: 'FAQs' },
  { value: 'tutorial', labelKey: 'Tutorials' },
  { value: 'tutorial_category', labelKey: 'Tutorial categories' },
]

const PAGE_SIZE = 20

interface EditorState {
  id: number | null
  title: string
  slug: string
  category: string
  status: string
  sortOrder: string
  data: string
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: '',
  slug: '',
  category: '',
  status: 'published',
  sortOrder: '0',
  data: '{\n  \n}',
}

function toEditorState(item: SiteContentRecord<unknown>): EditorState {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    category: item.category,
    status: item.status,
    sortOrder: String(item.sort_order),
    data: JSON.stringify(item.data ?? {}, null, 2),
  }
}

export function PublishingSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<SiteContentKind>('doc')
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<SiteContentRecord<unknown> | null>(null)

  const listQuery = useQuery({
    queryKey: ['admin-content', kind, page, keyword],
    queryFn: () =>
      adminListContent<unknown>(kind, {
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword.trim(),
      }),
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-content', kind] })
    queryClient.invalidateQueries({ queryKey: ['site-content'] })
  }

  const saveMutation = useMutation({
    mutationFn: async (values: EditorState) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(values.data || '{}')
      } catch {
        throw new Error(t('Invalid JSON content'))
      }
      const payload: AdminContentPayload = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        category: values.category.trim(),
        status: values.status,
        sort_order: Number(values.sortOrder) || 0,
        data: parsed,
      }
      if (values.id === null) {
        return adminCreateContent(kind, payload)
      }
      return adminUpdateContent(kind, values.id, payload)
    },
    onSuccess: () => {
      toast.success(t('Content saved'))
      setEditor(null)
      invalidate()
    },
    onError: (error) => {
      if (error instanceof Error && error.message === t('Invalid JSON content')) {
        toast.error(error.message)
        return
      }
      handleServerError(error, t('Failed to save content'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminDeleteContent(kind, id),
    onSuccess: () => {
      toast.success(t('Content deleted'))
      setDeleteTarget(null)
      invalidate()
    },
    onError: (error) => handleServerError(error, t('Failed to delete content')),
  })

  const importMutation = useMutation({
    mutationFn: () => adminImportContent(kind, buildBuiltinContentPayloads(kind)),
    onSuccess: (imported) => {
      toast.success(
        t('Imported {{count}} built-in items', { count: imported })
      )
      invalidate()
    },
    onError: (error) => handleServerError(error, t('Failed to import content')),
  })

  const startCreate = () => {
    setEditor({ ...EMPTY_EDITOR })
  }

  const submitEditor = () => {
    if (!editor) return
    if (editor.title.trim() === '' || editor.slug.trim() === '') {
      toast.error(t('Title and slug are required'))
      return
    }
    saveMutation.mutate(editor)
  }

  return (
    <SettingsSection title={t('Content Publishing')}>
      <div className='space-y-4'>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Publish documentation, blog posts, FAQs and tutorials from the backend. Items become visible on the website immediately.'
          )}
        </p>

        <div className='flex flex-wrap items-center gap-1 rounded-lg border p-1'>
          {CONTENT_KINDS.map((option) => (
            <Button
              key={option.value}
              type='button'
              size='sm'
              variant={kind === option.value ? 'secondary' : 'ghost'}
              onClick={() => {
                setKind(option.value)
                setPage(1)
                setKeyword('')
              }}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button type='button' size='sm' onClick={startCreate}>
            <Plus className='mr-2 h-4 w-4' />
            {t('New item')}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='secondary'
            disabled={importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            <Upload className='mr-2 h-4 w-4' />
            {importMutation.isPending
              ? t('Importing...')
              : t('Import built-in content')}
          </Button>
          <Input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
            placeholder={t('Search title, slug or category')}
            className='h-9 max-w-xs'
          />
          <div className='text-muted-foreground ml-auto text-sm'>
            {t('{{count}} items', { count: total })}
          </div>
        </div>

        <StaticDataTable
          data={items}
          getRowKey={(item) => item.id}
          emptyContent={t(
            'No published content yet. Create an item or import the built-in content.'
          )}
          columns={[
            {
              id: 'title',
              header: t('Title'),
              cellClassName: 'max-w-xs truncate font-medium',
              cell: (item) => item.title,
            },
            {
              id: 'slug',
              header: t('Slug'),
              cellClassName: 'text-muted-foreground max-w-xs truncate',
              cell: (item) => item.slug,
            },
            {
              id: 'category',
              header: t('Category'),
              cellClassName: 'text-muted-foreground max-w-40 truncate',
              cell: (item) => item.category || '-',
            },
            {
              id: 'status',
              header: t('Status'),
              cell: (item) => (
                <StatusBadge
                  variant={item.status === 'published' ? 'success' : 'neutral'}
                  label={item.status === 'published' ? t('Published') : t('Draft')}
                />
              ),
            },
            {
              id: 'updated_at',
              header: t('Updated'),
              cellClassName: 'text-muted-foreground whitespace-nowrap',
              cell: (item) =>
                item.updated_at > 0
                  ? dayjs.unix(item.updated_at).format('YYYY-MM-DD HH:mm')
                  : '-',
            },
            {
              id: 'actions',
              header: t('Actions'),
              cell: (item) => (
                <StaticRowActions
                  editLabel={t('Edit')}
                  deleteLabel={t('Delete')}
                  menuLabel={t('Open menu')}
                  onEdit={() => setEditor(toEditorState(item))}
                  onDelete={() => setDeleteTarget(item)}
                />
              ),
            },
          ]}
        />

        {totalPages > 1 && (
          <div className='flex items-center justify-end gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('Previous')}
            </Button>
            <span className='text-muted-foreground text-sm'>
              {page} / {totalPages}
            </span>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('Next')}
            </Button>
          </div>
        )}

        <p className='text-muted-foreground text-xs'>
          {t(
            'Content visibility follows the header navigation switches (Docs, Blog, Help Center).'
          )}{' '}
          <Link
            to='/system-settings/site/$section'
            params={{ section: 'header-navigation' }}
            className='text-primary underline-offset-4 hover:underline'
          >
            {t('Top navigation')}
          </Link>
        </p>
      </div>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        title={editor?.id ? t('Edit content') : t('New content')}
        description={t(
          'The JSON payload is what the website renders. Keep the same fields as the built-in content.'
        )}
        contentClassName='max-w-3xl'
        contentHeight='auto'
        bodyClassName='space-y-4'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setEditor(null)}
            >
              {t('Cancel')}
            </Button>
            <Button
              type='button'
              disabled={saveMutation.isPending}
              onClick={submitEditor}
            >
              {saveMutation.isPending ? t('Saving...') : t('Save')}
            </Button>
          </>
        }
      >
        {editor && (
          <div className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label>{t('Title')}</Label>
                <Input
                  value={editor.title}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('Slug')}</Label>
                <Input
                  value={editor.slug}
                  onChange={(event) =>
                    setEditor({ ...editor, slug: event.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('Category')}</Label>
                <Input
                  value={editor.category}
                  onChange={(event) =>
                    setEditor({ ...editor, category: event.target.value })
                  }
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>{t('Status')}</Label>
                  <Select
                    value={editor.status}
                    onValueChange={(value) => {
                      if (value) setEditor({ ...editor, status: value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='published'>{t('Published')}</SelectItem>
                      <SelectItem value='draft'>{t('Draft')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>{t('Sort order')}</Label>
                  <Input
                    inputMode='numeric'
                    value={editor.sortOrder}
                    onChange={(event) =>
                      setEditor({ ...editor, sortOrder: event.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className='space-y-2'>
              <Label>{t('Content JSON')}</Label>
              <Textarea
                value={editor.data}
                onChange={(event) =>
                  setEditor({ ...editor, data: event.target.value })
                }
                className='min-h-64 font-mono text-xs'
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete content')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This permanently deletes "{{title}}".', {
                title: deleteTarget?.title ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
              }}
            >
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {listQuery.isError && (
        <div className='text-destructive mt-2 flex items-center gap-2 text-sm'>
          <Trash2 className='h-4 w-4' />
          {t('Failed to load content')}
          <Button
            type='button'
            size='sm'
            variant='link'
            onClick={() => listQuery.refetch()}
          >
            <Download className='h-4 w-4' />
            {t('Retry')}
          </Button>
        </div>
      )}
    </SettingsSection>
  )
}
