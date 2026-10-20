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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { formatQuotaFixed, formatTimestamp } from '@/lib/format'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { getRedPacketClaims } from '../api'
import { ERROR_MESSAGES } from '../constants'
import type { RedPacketClaim } from '../types'

/** Claim records of one packet, embedded in the administrator detail dialog. */
export function RedPacketClaimsList({
  packetId,
  showGiftExpiry,
}: {
  packetId: number
  showGiftExpiry: boolean
}) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['red-packet-claims', packetId],
    queryFn: async () => {
      const response = await getRedPacketClaims(packetId)
      if (!response.success) {
        throw new Error(t(ERROR_MESSAGES.CLAIMS_LOAD_FAILED))
      }
      return response.data ?? []
    },
    enabled: packetId > 0,
  })

  if (query.isLoading) {
    return <LoadingState />
  }
  if (query.isError) {
    return (
      <ErrorState
        description={getServerErrorMessage(
          query.error,
          t(ERROR_MESSAGES.CLAIMS_LOAD_FAILED)
        )}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const columns = [
    {
      id: 'username',
      header: t('User'),
      cell: (claim: RedPacketClaim) => claim.username || `#${claim.user_id}`,
    },
    {
      id: 'quota',
      header: t('Amount'),
      cell: (claim: RedPacketClaim) => (
        <span className='tabular-nums'>{formatQuotaFixed(claim.quota)}</span>
      ),
    },
    {
      id: 'created_at',
      header: t('Claimed at'),
      cell: (claim: RedPacketClaim) => (
        <span className='whitespace-nowrap tabular-nums'>
          {formatTimestamp(claim.created_at)}
        </span>
      ),
    },
    ...(showGiftExpiry
      ? [
          {
            id: 'expires_at',
            header: t('Gift credit expires'),
            cell: (claim: RedPacketClaim) => (
              <span className='whitespace-nowrap tabular-nums'>
                {claim.expires_at > 0
                  ? formatTimestamp(claim.expires_at)
                  : t('Never expires')}
              </span>
            ),
          },
        ]
      : []),
  ]

  return (
    <StaticDataTable
      data={query.data ?? []}
      columns={columns}
      getRowKey={(claim) => claim.id}
      emptyContent={t('No claims yet')}
    />
  )
}
