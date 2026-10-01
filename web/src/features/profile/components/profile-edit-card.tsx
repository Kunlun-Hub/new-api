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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ChangePasswordDialog } from '@/features/security/components/dialogs/change-password-dialog'
import { handleServerError } from '@/lib/handle-server-error'

import { updateUserProfile } from '../api'
import { getDisplayName } from '../lib/format'
import type { UserProfile } from '../types'

// ============================================================================
// Profile Edit Card Component
// ============================================================================

interface ProfileEditCardProps {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate: () => void
}

export function ProfileEditCard({
  profile,
  loading,
  onProfileUpdate,
}: ProfileEditCardProps) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(getDisplayName(profile))
    }
  }, [profile])

  if (loading) {
    return (
      <div className='border-border/40 space-y-6 rounded-xl border p-5'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-9 w-full' />
        </div>
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-9 w-28' />
      </div>
    )
  }

  if (!profile) return null

  const saveDisplayName = async () => {
    const nextName = displayName.trim()
    if (!nextName) {
      toast.error(t('Display name cannot be empty'))
      return false
    }
    if (nextName === getDisplayName(profile)) return true
    try {
      const response = await updateUserProfile({ display_name: nextName })
      if (!response.success) {
        handleServerError(response, t('Failed to update profile'))
        return false
      }
      onProfileUpdate()
      return true
    } catch (error) {
      handleServerError(error, t('Failed to update profile'))
      return false
    }
  }

  const handleSave = async () => {
    if (password && password.length < 8) {
      toast.error(t('Password must be at least 8 characters'))
      return
    }
    setSaving(true)
    try {
      const saved = await saveDisplayName()
      if (!saved) return
      if (password) {
        setPasswordDialogOpen(true)
        return
      }
      toast.success(t('Profile updated successfully'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='border-border/40 space-y-6 rounded-xl border p-5'>
      <Field>
        <FieldLabel htmlFor='profile-username'>{t('Username')}</FieldLabel>
        <Input id='profile-username' value={profile.username || ''} disabled />
      </Field>
      <Field>
        <FieldLabel htmlFor='profile-display-name'>
          {t('Display Name')}
        </FieldLabel>
        <Input
          id='profile-display-name'
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={t('Enter your display name')}
          maxLength={20}
          name='display_name'
          autoComplete='off'
        />
      </Field>
      <Field>
        <FieldLabel htmlFor='profile-password'>
          {t('Password')}
          <span className='text-muted-foreground ml-1 text-xs'>
            ({t('Optional')})
          </span>
        </FieldLabel>
        <PasswordInput
          id='profile-password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t(
            'Enter a new password to change it, at least 8 characters'
          )}
          name='password'
          autoComplete='new-password'
        />
      </Field>
      <Button type='button' onClick={() => void handleSave()} disabled={saving}>
        {saving ? t('Saving...') : t('Save')}
      </Button>
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open)
          if (!open) setPassword('')
        }}
        username={profile.username}
        hasPassword={profile.has_password}
        initialNewPassword={password}
        onSuccess={onProfileUpdate}
      />
    </div>
  )
}
