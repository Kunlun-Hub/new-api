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
import { UserRoundPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(getDisplayName(profile))
    }
  }, [profile])

  if (loading) {
    return (
      <TitledCard
        title={t('Edit Profile')}
        description={t('Update how your name appears across the console')}
        icon={<UserRoundPen className='h-4 w-4' />}
        iconTone='info'
        disableHoverEffect
      >
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-10 w-full' />
          </div>
          <Skeleton className='h-10 w-28' />
        </div>
      </TitledCard>
    )
  }

  if (!profile) return null

  const handleSave = async () => {
    const nextName = displayName.trim()
    if (!nextName) {
      toast.error(t('Display name cannot be empty'))
      return
    }
    try {
      setSaving(true)
      const response = await updateUserProfile({ display_name: nextName })
      if (response.success) {
        toast.success(t('Profile updated successfully'))
        onProfileUpdate()
      } else {
        handleServerError(response, t('Failed to update profile'))
      }
    } catch (error) {
      handleServerError(error, t('Failed to update profile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <TitledCard
      title={t('Edit Profile')}
      description={t('Update how your name appears across the console')}
      icon={<UserRoundPen className='h-4 w-4' />}
      iconTone='info'
      disableHoverEffect
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='profile-display-name'>{t('Display Name')}</Label>
          <Input
            id='profile-display-name'
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t('Enter your display name')}
            maxLength={64}
            className='max-w-md'
          />
          <p className='text-muted-foreground text-xs'>
            {t('Your username and email cannot be changed here')}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('Saving...') : t('Save Changes')}
        </Button>
      </div>
    </TitledCard>
  )
}
