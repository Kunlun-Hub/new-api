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
import { Banknote, CircleAlert, CircleCheck, Gift, LogIn } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { RedPacketStatusBadge } from '@/features/red-packets/components/red-packet-status-badge'
import {
  RED_PACKET_CLAIM_MODE,
  RED_PACKET_STATUS,
  RED_PACKET_TYPE,
  type RedPacketLandingInfo,
  type RedPacketMyClaimState,
} from '@/features/red-packets/types'
import { formatQuotaFixed, formatTimestamp } from '@/lib/format'
import { cn } from '@/lib/utils'

type RedPacketLandingCardProps = {
  info: RedPacketLandingInfo
  isAuthenticated: boolean
  claimState: RedPacketMyClaimState | undefined
  code: string
  onCodeChange: (code: string) => void
  onClaim: () => void
  onSignIn: () => void
  isClaiming: boolean
  claimError: string | null
}

function LandingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='bg-muted/30 min-w-0 rounded-md px-3 py-2 text-center'>
      <div className='text-muted-foreground text-xs leading-none font-medium'>
        {label}
      </div>
      <div className='mt-1.5 text-sm font-medium break-words tabular-nums'>
        {value}
      </div>
    </div>
  )
}

/** Public red packet landing page: packet details plus the claim action. */
export function RedPacketLandingCard({
  info,
  isAuthenticated,
  claimState,
  code,
  onCodeChange,
  onClaim,
  onSignIn,
  isClaiming,
  claimError,
}: RedPacketLandingCardProps) {
  const { t } = useTranslation()

  const isGiftPacket = info.type === RED_PACKET_TYPE.GIFT
  const isCodePacket = info.claim_mode === RED_PACKET_CLAIM_MODE.CODE
  const isActive = info.status === RED_PACKET_STATUS.ACTIVE
  const hasClaimed = claimState?.claimed === true
  const claimedRatio =
    info.share_count > 0
      ? Math.min(100, Math.round((info.claimed_count / info.share_count) * 100))
      : 0
  const remainingPercent = info.share_count > 0 ? 100 - claimedRatio : 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onClaim()
  }

  let claimSection: ReactNode
  if (hasClaimed) {
    claimSection = (
      <Alert className='border-emerald-500/40'>
        <CircleCheck className='text-emerald-600 dark:text-emerald-400' />
        <AlertTitle>
          {t('You already claimed {{amount}}', {
            amount: formatQuotaFixed(claimState?.quota ?? 0),
          })}
        </AlertTitle>
        <AlertDescription>
          {claimState && claimState.expires_at > 0
            ? t('Gift credit expires at {{time}}', {
                time: formatTimestamp(claimState.expires_at),
              })
            : t('The credit has been added to your account.')}
        </AlertDescription>
      </Alert>
    )
  } else if (!isActive) {
    const soldOut = info.status === RED_PACKET_STATUS.SOLD_OUT
    claimSection = (
      <Alert>
        <CircleAlert />
        <AlertTitle>
          {soldOut
            ? t('This red packet is sold out')
            : t('This red packet has expired')}
        </AlertTitle>
        <AlertDescription>
          {soldOut
            ? t('Every share of this red packet has been claimed.')
            : t('This red packet can no longer be claimed.')}
        </AlertDescription>
      </Alert>
    )
  } else if (!isAuthenticated) {
    claimSection = (
      <div className='space-y-2'>
        <Button size='lg' className='w-full' onClick={onSignIn}>
          <LogIn className='size-4' />
          {t('Log in to claim')}
        </Button>
        <p className='text-muted-foreground text-center text-xs'>
          {t('Sign in to claim this red packet.')}
        </p>
      </div>
    )
  } else {
    claimSection = (
      <form className='space-y-3' onSubmit={handleSubmit}>
        {isCodePacket && (
          <div className='space-y-1.5'>
            <label
              htmlFor='red-packet-claim-code'
              className='text-sm font-medium'
            >
              {t('Claim code')}
            </label>
            <Input
              id='red-packet-claim-code'
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder={t('Enter the claim code')}
              autoComplete='off'
              autoCapitalize='characters'
              spellCheck={false}
              aria-invalid={claimError !== null}
              className='text-center font-mono tracking-widest'
            />
          </div>
        )}
        {claimError && (
          <Alert variant='destructive'>
            <CircleAlert />
            <AlertTitle>{t('Failed to claim red packet')}</AlertTitle>
            <AlertDescription>{claimError}</AlertDescription>
          </Alert>
        )}
        <Button
          type='submit'
          size='lg'
          className='w-full'
          disabled={isClaiming || (isCodePacket && code.trim().length === 0)}
        >
          <Gift className='size-4' />
          {isClaiming ? t('Claiming...') : t('Claim now')}
        </Button>
      </form>
    )
  }

  return (
    <Card className='mx-auto w-full max-w-xl pt-0'>
      <div className='bg-linear-to-b from-emerald-500/15 via-emerald-500/5 to-transparent px-6 pt-8 pb-6 text-center'>
        <div
          className={cn(
            'mx-auto flex size-14 items-center justify-center rounded-full',
            isGiftPacket
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
          )}
        >
          {isGiftPacket ? (
            <Gift className='size-7' aria-hidden='true' />
          ) : (
            <Banknote className='size-7' aria-hidden='true' />
          )}
        </div>
        <h1 className='mt-3 text-xl font-semibold tracking-tight break-words'>
          {info.remark || t('Red packet')}
        </h1>
        <div className='mt-3 flex flex-wrap items-center justify-center gap-2'>
          <Badge
            variant='outline'
            className={cn(
              isGiftPacket &&
                'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            )}
          >
            {isGiftPacket ? t('Gift Credit') : t('Balance')}
          </Badge>
          <Badge variant='outline'>
            {isCodePacket ? t('Claim code') : t('Direct claim')}
          </Badge>
          <RedPacketStatusBadge status={info.status} />
        </div>
      </div>

      <CardContent className='space-y-5'>
        <div className='text-center'>
          <div className='text-muted-foreground text-xs'>
            {t('Total Amount')}
          </div>
          <div className='mt-1 text-3xl font-semibold tracking-tight tabular-nums'>
            {formatQuotaFixed(info.total_quota)}
          </div>
        </div>

        <div className='space-y-2'>
          <Progress value={claimedRatio} aria-label={t('Claimed')} />
          <div className='text-muted-foreground flex items-center justify-end text-xs'>
            <span>
              {t('{{percent}}% remaining', { percent: remainingPercent })}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <LandingStat
            label={t('Expires at')}
            value={
              info.expires_at > 0
                ? formatTimestamp(info.expires_at)
                : t('Never expires')
            }
          />
          {isGiftPacket && (
            <LandingStat
              label={t('Gift credit validity')}
              value={
                info.gift_expire_days > 0
                  ? t('{{days}} days after claiming', {
                      days: info.gift_expire_days,
                    })
                  : t('Never expires')
              }
            />
          )}
        </div>

        {claimSection}
      </CardContent>
    </Card>
  )
}
