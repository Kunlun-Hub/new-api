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
import type { Table } from '@tanstack/react-table'
import { Copy, Trash2, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Popconfirm } from '@/components/ui/popconfirm'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { handleServerError } from '@/lib/handle-server-error'

import { batchDeleteApiKeys } from '../api'
import { ERROR_MESSAGES } from '../constants'
import type { ApiKey } from '../types'
import { useApiKeys } from './api-keys-provider'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation()
  const { resolveRealKeysBatch, triggerRefresh } = useApiKeys()
  const [isCopying, setIsCopying] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleBatchCopy = useCallback(async () => {
    if (selectedRows.length === 0) return

    setIsCopying(true)
    try {
      const ids = selectedRows.map((row) => (row.original as ApiKey).id)
      const keysMap = await resolveRealKeysBatch(ids)

      const lines: string[] = []
      for (const row of selectedRows) {
        const apiKey = row.original as ApiKey
        const realKey = keysMap[apiKey.id]
        if (realKey) {
          lines.push(`${apiKey.name}\t${realKey}`)
        }
      }

      if (lines.length > 0) {
        const ok = await copyToClipboard(lines.join('\n'))
        if (ok) {
          toast.success(t('Copied {{count}} key(s)', { count: lines.length }))
        } else {
          toast.error(t('Failed to copy keys'))
        }
      }
    } catch {
      toast.error(t('Failed to copy keys'))
    } finally {
      setIsCopying(false)
    }
  }, [selectedRows, resolveRealKeysBatch, t])

  const handleBatchDelete = async () => {
    const ids = selectedRows.map((row) => (row.original as ApiKey).id)
    const result = await batchDeleteApiKeys(ids)

    if (result.success) {
      toast.success(
        t('Successfully deleted {{count}} API key(s)', {
          count: result.data || ids.length,
        })
      )
      table.resetRowSelection()
      triggerRefresh()
      return
    }

    handleServerError(result, t(ERROR_MESSAGES.BATCH_DELETE_FAILED))
  }

  return (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleBatchCopy}
        disabled={isCopying}
      >
        {isCopying ? (
          <Loader2 className='mr-1 size-3.5 animate-spin' aria-hidden='true' />
        ) : (
          <Copy className='mr-1 size-3.5' aria-hidden='true' />
        )}
        {t('Copy {{count}}', { count: selectedCount })}
      </Button>

      <Popconfirm
        destructive
        title={t('Delete selected tokens?')}
        description={t(
          '{{count}} token(s) will be deleted. This action cannot be undone.',
          { count: selectedCount }
        )}
        confirmText={t('Delete')}
        onConfirm={handleBatchDelete}
      >
        <Button type='button' variant='outline' size='sm'>
          <Trash2 className='mr-1 size-3.5' aria-hidden='true' />
          {t('Delete {{count}}', { count: selectedCount })}
        </Button>
      </Popconfirm>

      <Button
        type='button'
        variant='secondary'
        size='sm'
        onClick={() => table.resetRowSelection()}
      >
        {t('Cancel')}
      </Button>
    </div>
  )
}
