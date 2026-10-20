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
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ErrorState } from '@/components/error-state'
import { PublicLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import {
  claimRedPacketByLanding,
  getMyRedPacketClaim,
  getRedPacketLanding,
  RED_PACKET_LANDING_QUERY_KEY,
} from '@/features/red-packets/api'
import { formatQuotaFixed } from '@/lib/format'
import {
  createServerError,
  getServerErrorMessage,
} from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { RedPacketLandingCard } from './components/red-packet-landing-card'
import { ERROR_MESSAGES } from './constants'

const route = getRouteApi('/r/$token')

/** Public landing page reached through a red packet landing URL. */
export function RedPacketLanding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token } = route.useParams()
  const search = route.useSearch()
  const isAuthenticated = useAuthStore((state) => Boolean(state.auth.user))
  const [code, setCode] = useState(search.code ?? '')
  const [claimError, setClaimError] = useState<string | null>(null)

  const landingQuery = useQuery({
    queryKey: [RED_PACKET_LANDING_QUERY_KEY, token],
    queryFn: async () => {
      const response = await getRedPacketLanding(token)
      if (!response.success || !response.data) {
        throw createServerError(response, t(ERROR_MESSAGES.LANDING_LOAD_FAILED))
      }
      return response.data
    },
    // A deleted packet answers with a definitive business failure; retrying it
    // would keep the viewer on the loading state for seconds before the error.
    retry: false,
  })

  const claimStateQuery = useQuery({
    queryKey: [RED_PACKET_LANDING_QUERY_KEY, token, 'claim'],
    queryFn: async () => {
      const response = await getMyRedPacketClaim(token)
      if (!response.success) {
        throw createServerError(
          response,
          t(ERROR_MESSAGES.CLAIM_STATE_LOAD_FAILED)
        )
      }
      return response.data
    },
    enabled: isAuthenticated,
    retry: false,
  })

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await claimRedPacketByLanding(token, code.trim())
      if (!response.success) {
        throw createServerError(response, t(ERROR_MESSAGES.CLAIM_FAILED))
      }
      return response.data
    },
    onSuccess: async (result) => {
      setClaimError(null)
      if (result) {
        toast.success(
          t('Claimed: {{amount}}', {
            amount: formatQuotaFixed(result.quota),
          })
        )
      }
      await queryClient.invalidateQueries({
        queryKey: [RED_PACKET_LANDING_QUERY_KEY, token],
      })
    },
    onError: (error) => {
      setClaimError(
        getServerErrorMessage(error, t(ERROR_MESSAGES.CLAIM_FAILED))
      )
    },
  })

  const handleSignIn = () => {
    const landingPath = search.code
      ? `/r/${token}?code=${encodeURIComponent(search.code)}`
      : `/r/${token}`
    void navigate({ to: '/sign-in', search: { redirect: landingPath } })
  }

  if (landingQuery.isLoading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    )
  }

  if (landingQuery.isError || !landingQuery.data) {
    return (
      <PublicLayout>
        <ErrorState
          description={getServerErrorMessage(
            landingQuery.error,
            t(ERROR_MESSAGES.LANDING_LOAD_FAILED)
          )}
          onRetry={() => void landingQuery.refetch()}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='py-6 sm:py-10'>
        <RedPacketLandingCard
          info={landingQuery.data}
          isAuthenticated={isAuthenticated}
          claimState={claimStateQuery.data}
          code={code}
          onCodeChange={(value) => {
            setCode(value)
            setClaimError(null)
          }}
          onClaim={() => claimMutation.mutate()}
          onSignIn={handleSignIn}
          isClaiming={claimMutation.isPending}
          claimError={claimError}
        />
      </div>
    </PublicLayout>
  )
}
