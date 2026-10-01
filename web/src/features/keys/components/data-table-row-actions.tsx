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
import type { Row } from '@tanstack/react-table'
import {
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popconfirm } from '@/components/ui/popconfirm'
import { Separator } from '@/components/ui/separator'
import { useChatPresets } from '@/features/chat/hooks/use-chat-presets'
import { resolveChatUrl, type ChatPreset } from '@/features/chat/lib/chat-links'
import { sendToFluent } from '@/features/chat/lib/send-to-fluent'
import { handleServerError } from '@/lib/handle-server-error'

import { deleteApiKey } from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import { apiKeySchema } from '../types'
import { useApiKeys } from './api-keys-provider'

type DataTableRowActionsProps<TData> = {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { t } = useTranslation()
  const apiKey = apiKeySchema.parse(row.original)
  const {
    setOpen,
    setCurrentRow,
    triggerRefresh,
    resolveRealKey,
    setResolvedKey,
  } = useApiKeys()
  const { chatPresets, serverAddress } = useChatPresets()

  const handleOpenChatPreset = useCallback(
    async (preset: ChatPreset) => {
      const realKey = await resolveRealKey(apiKey.id)
      if (!realKey) return

      if (preset.type === 'fluent') {
        const success = sendToFluent(realKey, serverAddress)
        if (success) {
          toast.success(t('Sent the API key to FluentRead.'))
        } else {
          toast.info(
            t(
              'FluentRead extension not detected. Please ensure it is installed and active.'
            )
          )
        }
        return
      }

      const resolvedUrl = resolveChatUrl({
        template: preset.url,
        apiKey: realKey,
        serverAddress,
      })

      if (!resolvedUrl) {
        toast.error(t('Invalid chat link. Please contact your administrator.'))
        return
      }

      if (typeof window === 'undefined') return

      try {
        window.open(resolvedUrl, '_blank', 'noopener')
      } catch {
        window.location.href = resolvedUrl
      }
    },
    [resolveRealKey, apiKey.id, serverAddress, t]
  )

  const handleDelete = useCallback(async () => {
    try {
      const result = await deleteApiKey(apiKey.id)
      if (result.success) {
        toast.success(t(SUCCESS_MESSAGES.API_KEY_DELETED))
        triggerRefresh()
      } else {
        handleServerError(result, t(ERROR_MESSAGES.DELETE_FAILED))
      }
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.UNEXPECTED))
    }
  }, [apiKey.id, t, triggerRefresh])

  return (
    <div className='flex items-center justify-end gap-1'>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              size='sm'
              variant='ghost'
              aria-label={t('Connect App')}
              className='data-popup-open:bg-muted'
            />
          }
        >
          <MessageSquare className='size-3.5' aria-hidden='true' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-60'>
          <DropdownMenuGroup>
            <DropdownMenuItem
              className='flex items-center gap-2'
              onClick={async () => {
                const realKey = await resolveRealKey(apiKey.id)
                if (!realKey) return
                setResolvedKey(realKey)
                setCurrentRow(apiKey)
                setOpen('cc-switch')
              }}
            >
              <span
                className='bg-card flex size-6 shrink-0 items-center justify-center rounded-md border'
                aria-hidden='true'
              >
                <ExternalLink strokeWidth={2.5} className='size-3' />
              </span>
              <span>{t('Configure CC Switch')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {chatPresets.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuGroup>
            {chatPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                className='flex items-center gap-2'
                onClick={() => void handleOpenChatPreset(preset)}
              >
                <span className='bg-card flex size-6 shrink-0 items-center justify-center rounded-md border'>
                  <MessageCircle className='size-3 fill-cyan-500/10' />
                </span>
                <span>{preset.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation='vertical' className='h-2 self-center' />

      <Button
        size='sm'
        variant='ghost'
        aria-label={t('Edit')}
        onClick={() => {
          setCurrentRow(apiKey)
          setOpen('update')
        }}
      >
        <Pencil className='size-3.5' aria-hidden='true' />
      </Button>

      <Separator orientation='vertical' className='h-2 self-center' />

      <Popconfirm
        title={t('Are you sure you want to delete "{{name}}"?', {
          name: apiKey.name,
        })}
        description={t('This action cannot be undone.')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        destructive
        onConfirm={handleDelete}
      >
        <Button size='sm' variant='ghost' aria-label={t('Delete')}>
          <Trash2 className='size-3.5' aria-hidden='true' />
        </Button>
      </Popconfirm>
    </div>
  )
}
