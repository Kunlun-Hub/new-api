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
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, Link2, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { handleServerError } from '@/lib/handle-server-error'

import { deleteRedPacket, RED_PACKETS_QUERY_KEY } from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import { getRedPacketClaimLink } from '../lib/red-packet-links'
import { RED_PACKET_CLAIM_MODE, type RedPacket } from '../types'
import { useRedPackets } from './red-packets-provider'

export function RedPacketRowActions({ packet }: { packet: RedPacket }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { setOpen, setCurrentRow } = useRedPackets()
  const { copyToClipboard } = useCopyToClipboard()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isCodePacket = packet.claim_mode === RED_PACKET_CLAIM_MODE.CODE

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteRedPacket(packet.id)
      if (result.success) {
        toast.success(t(SUCCESS_MESSAGES.RED_PACKET_DELETED))
        setConfirmDeleteOpen(false)
        await queryClient.invalidateQueries({
          queryKey: [RED_PACKETS_QUERY_KEY],
        })
      } else {
        handleServerError(result, t(ERROR_MESSAGES.DELETE_FAILED))
      }
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.DELETE_FAILED))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          setCurrentRow(packet)
          setOpen('detail')
        }}
      >
        {t('Details')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size='sm' variant='ghost' aria-label={t('Actions')}>
              <MoreHorizontal className='size-4' />
            </Button>
          }
        />
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuItem
            onClick={() => void copyToClipboard(getRedPacketClaimLink(packet))}
          >
            <Link2 className='mr-2 size-4' />
            {t('Copy landing page URL')}
          </DropdownMenuItem>
          {isCodePacket && (
            <DropdownMenuItem
              onClick={() => void copyToClipboard(packet.claim_code)}
            >
              <KeyRound className='mr-2 size-4' />
              {t('Copy claim code')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className='mr-2 size-4' />
            {t('Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        destructive
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        handleConfirm={handleDelete}
        isLoading={isDeleting}
        className='max-w-md'
        title={t('Delete Red Packet?')}
        desc={t(
          'This removes the red packet together with every claim record. Unclaimed shares can no longer be collected.'
        )}
        confirmText={t('Delete')}
      />
    </div>
  )
}
