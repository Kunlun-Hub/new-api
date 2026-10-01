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
import { Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ActionCard } from '@/components/ui/action-card'
import { Button } from '@/components/ui/button'

import { ChangePasswordDialog } from './dialogs/change-password-dialog'
import { DeleteAccountDialog } from './dialogs/delete-account-dialog'

type AccountActionCardProps = {
  action: 'password' | 'delete'
  username: string
  hasPassword?: boolean
  onUpdate?: () => void
}

export function AccountActionCard(props: AccountActionCardProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const actions = {
    password: {
      title: t(
        props.hasPassword === false ? 'Set Password' : 'Change Password'
      ),
      description: t(
        props.hasPassword === false
          ? 'Add a password after verifying your identity'
          : 'Update your password to keep your account secure'
      ),
      icon: Shield,
    },
    delete: {
      title: t('Delete Account'),
      description: t('Permanently delete your account and all data'),
      icon: Trash2,
    },
  }
  const action = actions[props.action]
  return (
    <>
      <ActionCard
        icon={<action.icon aria-hidden='true' />}
        iconTone={props.action === 'delete' ? 'destructive' : undefined}
        title={action.title}
        description={action.description}
        footer={
          <Button
            type='button'
            variant={props.action === 'delete' ? 'outline' : 'outline'}
            className={
              props.action === 'delete'
                ? 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive w-full'
                : 'w-full'
            }
            onClick={() => setOpen(true)}
          >
            {action.title}
          </Button>
        }
      />
      {props.action === 'password' && (
        <ChangePasswordDialog
          open={open}
          onOpenChange={setOpen}
          username={props.username}
          hasPassword={props.hasPassword}
          onSuccess={props.onUpdate}
        />
      )}
      {props.action === 'delete' && (
        <DeleteAccountDialog
          open={open}
          onOpenChange={setOpen}
          username={props.username}
        />
      )}
    </>
  )
}
