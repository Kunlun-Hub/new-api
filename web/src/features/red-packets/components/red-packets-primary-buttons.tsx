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
import { Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { RED_PACKETS_QUERY_KEY } from '../api'
import { useRedPackets } from './red-packets-provider'

export function RedPacketsPrimaryButtons() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { setOpen } = useRedPackets()

  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        size='sm'
        variant='outline'
        onClick={() =>
          void queryClient.invalidateQueries({
            queryKey: [RED_PACKETS_QUERY_KEY],
          })
        }
      >
        <RefreshCw className='h-4 w-4' />
        {t('Refresh')}
      </Button>
      <Button size='sm' onClick={() => setOpen('create')}>
        <Plus className='h-4 w-4' />
        {t('New Red Packet')}
      </Button>
    </div>
  )
}
