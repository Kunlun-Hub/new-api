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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

import {
  composeRedPacketShareText,
  getRedPacketClaimLink,
} from '../lib/red-packet-links'
import { RED_PACKET_CLAIM_MODE, type RedPacket } from '../types'

/**
 * Shown right after issuing a packet so the administrator can copy the landing
 * URL and, for code packets, the claim code before leaving the page.
 */
export function RedPacketShareDialog({
  packet,
  open,
  onOpenChange,
}: {
  packet: RedPacket | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { copyToClipboard } = useCopyToClipboard()

  if (!packet) {
    return null
  }

  const claimLink = getRedPacketClaimLink(packet)
  const isCodePacket = packet.claim_mode === RED_PACKET_CLAIM_MODE.CODE

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Share red packet')}
      description={t(
        'The landing link and claim code are ready to share with users.'
      )}
      footer={
        <div className='flex flex-wrap justify-end gap-2'>
          <Button
            size='sm'
            onClick={() =>
              void copyToClipboard(composeRedPacketShareText(packet, t))
            }
          >
            {t('Copy claim info')}
          </Button>
        </div>
      }
    >
      <div className='space-y-3'>
        <div className='bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2'>
          <div className='min-w-0 flex-1'>
            <div className='text-muted-foreground text-xs'>
              {t('Landing page URL')}
            </div>
            <code className='block truncate text-xs'>{claimLink}</code>
          </div>
          <CopyButton
            value={claimLink}
            variant='outline'
            size='sm'
            tooltip={t('Copy landing page URL')}
          />
        </div>
        {isCodePacket && (
          <div className='bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2'>
            <div className='min-w-0 flex-1'>
              <div className='text-muted-foreground text-xs'>
                {t('Claim code')}
              </div>
              <code className='font-mono text-base font-semibold tracking-widest'>
                {packet.claim_code}
              </code>
            </div>
            <CopyButton
              value={packet.claim_code}
              variant='outline'
              size='sm'
              tooltip={t('Copy claim code')}
            />
          </div>
        )}
      </div>
    </Dialog>
  )
}
