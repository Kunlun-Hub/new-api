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

import { Badge } from '@/components/ui/badge'

import { RED_PACKET_STATUS, type RedPacketStatus } from '../types'

/** Server computed packet state, shared by the admin list and detail views. */
export function RedPacketStatusBadge({ status }: { status: RedPacketStatus }) {
  const { t } = useTranslation()

  if (status === RED_PACKET_STATUS.ACTIVE) {
    return (
      <Badge
        variant='outline'
        className='border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
      >
        {t('Active')}
      </Badge>
    )
  }
  if (status === RED_PACKET_STATUS.SOLD_OUT) {
    return <Badge variant='outline'>{t('Sold out')}</Badge>
  }
  return (
    <Badge variant='outline' className='text-muted-foreground'>
      {t('Expired')}
    </Badge>
  )
}
