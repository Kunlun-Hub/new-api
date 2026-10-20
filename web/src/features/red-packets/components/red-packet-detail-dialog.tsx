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
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { formatQuotaFixed, formatTimestamp } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  composeRedPacketShareText,
  getRedPacketClaimLink,
} from '../lib/red-packet-links'
import {
  RED_PACKET_CLAIM_MODE,
  RED_PACKET_TYPE,
  type RedPacket,
} from '../types'
import { RedPacketClaimsList } from './red-packet-claims-list'
import { RedPacketStatusBadge } from './red-packet-status-badge'

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='bg-muted/20 min-w-0 rounded-md px-3 py-2'>
      <div className='text-muted-foreground text-xs leading-none font-medium'>
        {label}
      </div>
      <div className='mt-1.5 text-sm font-medium break-words'>{value}</div>
    </div>
  )
}

/** Administrator packet detail: amounts, landing link, claim code and records. */
export function RedPacketDetailDialog({
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
  const isGiftPacket = packet.type === RED_PACKET_TYPE.GIFT

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Red packet details')}
      description={packet.remark || t('Red packet')}
      contentClassName='sm:max-w-3xl'
    >
      <div className='space-y-5'>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          <DetailItem
            label={t('Type')}
            value={
              <Badge
                variant='outline'
                className={cn(
                  isGiftPacket &&
                    'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {isGiftPacket ? t('Gift Credit') : t('Balance')}
              </Badge>
            }
          />
          <DetailItem
            label={t('Claim mode')}
            value={isCodePacket ? t('Claim code') : t('Direct claim')}
          />
          <DetailItem
            label={t('Status')}
            value={<RedPacketStatusBadge status={packet.status} />}
          />
          <DetailItem
            label={t('Total Amount')}
            value={
              <span className='tabular-nums'>
                {formatQuotaFixed(packet.total_quota)}
              </span>
            }
          />
          <DetailItem
            label={t('Claimed amount')}
            value={
              <span className='text-emerald-600 tabular-nums dark:text-emerald-400'>
                {formatQuotaFixed(packet.claimed_amount)}
              </span>
            }
          />
          <DetailItem
            label={t('Remaining')}
            value={
              <span className='tabular-nums'>
                {t('{{remaining}}/{{total}} left', {
                  remaining: packet.remaining_count,
                  total: packet.share_count,
                })}
              </span>
            }
          />
          <DetailItem
            label={t('Distribution')}
            value={
              packet.distribution === 'average'
                ? t('Equal split')
                : t('Random split')
            }
          />
          <DetailItem
            label={t('Expires at')}
            value={
              packet.expires_at > 0
                ? formatTimestamp(packet.expires_at)
                : t('Never expires')
            }
          />
          {isGiftPacket && (
            <DetailItem
              label={t('Gift credit validity (days)')}
              value={
                packet.gift_expire_days > 0
                  ? String(packet.gift_expire_days)
                  : t('Never expires')
              }
            />
          )}
        </div>

        <section className='space-y-2'>
          <div className='text-sm font-semibold'>{t('Landing page URL')}</div>
          <div className='bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2'>
            <code className='min-w-0 flex-1 truncate text-xs'>{claimLink}</code>
            <CopyButton
              value={claimLink}
              variant='outline'
              size='sm'
              tooltip={t('Copy landing page URL')}
            />
          </div>
          {isCodePacket && (
            <div className='bg-muted/30 flex items-center gap-2 rounded-md px-3 py-2'>
              <span className='text-muted-foreground text-xs'>
                {t('Claim code')}
              </span>
              <code className='min-w-0 flex-1 font-mono text-sm font-semibold tracking-widest'>
                {packet.claim_code}
              </code>
              <CopyButton
                value={packet.claim_code}
                variant='outline'
                size='sm'
                tooltip={t('Copy claim code')}
              />
            </div>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              void copyToClipboard(composeRedPacketShareText(packet, t))
            }
          >
            {t('Copy claim info')}
          </Button>
        </section>

        <section className='space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-sm font-semibold'>{t('Claim records')}</div>
            <span className='text-muted-foreground text-xs'>
              {t('{{claimed}}/{{total}} shares claimed', {
                claimed: packet.claimed_count,
                total: packet.share_count,
              })}
            </span>
          </div>
          <RedPacketClaimsList
            packetId={packet.id}
            showGiftExpiry={isGiftPacket}
          />
        </section>
      </div>
    </Dialog>
  )
}
