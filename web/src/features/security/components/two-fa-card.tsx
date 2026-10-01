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
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { ActionCard } from '@/components/ui/action-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SecureVerificationDialog } from '@/features/auth/secure-verification'
import { useDialogs } from '@/hooks/use-dialog'

import { useTwoFA } from '../hooks/use-two-fa'
import { useTwoFASetup } from '../hooks/use-two-fa-setup'
import { TwoFABackupDialog } from './dialogs/two-fa-backup-dialog'
import { TwoFADisableDialog } from './dialogs/two-fa-disable-dialog'
import { TwoFASetupDialog } from './dialogs/two-fa-setup-dialog'

// ============================================================================
// Two-Factor Authentication Card Component
// ============================================================================

interface TwoFACardProps {
  loading: boolean
}

type DialogKey = 'disable' | 'backup'

export function TwoFACard({ loading: pageLoading }: TwoFACardProps) {
  const { t } = useTranslation()
  const { status, loading, error, refetch } = useTwoFA(!pageLoading)
  const dialogs = useDialogs<DialogKey>()
  const setup = useTwoFASetup(refetch)

  if (pageLoading || loading) {
    return (
      <ActionCard
        icon={<ShieldCheck aria-hidden='true' />}
        title={t('Two-Factor Auth (2FA)')}
        description={<Skeleton className='mt-2 h-3 w-64' />}
        footer={<Skeleton className='h-9 w-full' />}
      />
    )
  }

  if (error) {
    return (
      <ActionCard
        icon={<ShieldCheck aria-hidden='true' />}
        title={t('Two-Factor Auth (2FA)')}
        footer={
          <div className='space-y-2'>
            <p role='alert' className='text-destructive text-xs'>
              {t(error)}
            </p>
            <Button className='w-full' onClick={() => void refetch()}>
              {t('Retry')}
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <>
      <ActionCard
        icon={<ShieldCheck aria-hidden='true' />}
        title={t('Two-Factor Auth (2FA)')}
        description={
          status.enabled
            ? t('Backup codes remaining: {{count}}', {
                count: status.backup_codes_remaining,
              })
            : t(
                "Add a one-time code at sign-in so a leaked password alone can't log in"
              )
        }
        footer={
          status.enabled ? (
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => dialogs.open('backup')}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                {t('Regenerate Backup Codes')}
              </Button>
              <Button
                variant='destructive'
                className='flex-1'
                onClick={() => dialogs.open('disable')}
              >
                <AlertTriangle className='mr-2 h-4 w-4' />
                {t('Disable 2FA')}
              </Button>
            </div>
          ) : (
            <div className='space-y-2'>
              <Button
                className='w-full'
                onClick={setup.start}
                disabled={setup.active}
              >
                {t('Enable 2FA')}
              </Button>
              {status.locked && (
                <div className='flex justify-center'>
                  <StatusBadge
                    label={t('Locked')}
                    variant='danger'
                    showDot
                    copyable={false}
                  />
                </div>
              )}
            </div>
          )
        }
      />

      {/* Dialogs */}
      <SecureVerificationDialog {...setup.verificationDialogProps} />
      <TwoFASetupDialog
        key={setup.setupDialogProps.setupData?.flow_token ?? 'initializing'}
        {...setup.setupDialogProps}
      />

      <TwoFADisableDialog
        open={dialogs.isOpen('disable')}
        onOpenChange={(open) =>
          open ? dialogs.open('disable') : dialogs.close('disable')
        }
        onSuccess={refetch}
      />

      <TwoFABackupDialog
        open={dialogs.isOpen('backup')}
        onOpenChange={(open) =>
          open ? dialogs.open('backup') : dialogs.close('backup')
        }
        onSuccess={refetch}
      />
    </>
  )
}
