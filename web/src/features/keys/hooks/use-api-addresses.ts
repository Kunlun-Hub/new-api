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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useApiInfo } from '@/features/dashboard/hooks/use-status-data'
import { useStatus } from '@/hooks/use-status'

export interface ApiAddress {
  url: string
  route: string
  description?: string
}

export function useApiAddresses(): {
  addresses: ApiAddress[]
  loading: boolean
} {
  const { t } = useTranslation()
  const { status, loading } = useStatus()
  const { items } = useApiInfo()

  const serverAddress =
    (typeof status?.server_address === 'string' &&
      status.server_address.trim()) ||
    ''

  const addresses = useMemo<ApiAddress[]>(() => {
    if (items.length) return items
    return [
      {
        url: serverAddress || window.location.origin,
        route: serverAddress ? t('Default API address') : t('Current domain'),
        description: '',
      },
    ]
  }, [items, serverAddress, t])

  return { addresses, loading }
}
