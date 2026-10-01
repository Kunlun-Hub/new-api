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
import { Link } from '@tanstack/react-router'
import { CloudDownload, CloudUpload, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Popconfirm } from '@/components/ui/popconfirm'
import { Spinner } from '@/components/ui/spinner'
import { getUserStorage } from '@/features/profile/api'
import { toIntlLocale } from '@/i18n/languages'
import { formatTimestampRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  backupStudio,
  getStudioBackupStatus,
  restoreStudio,
  type StudioBackupCounts,
} from '../lib/studio-backup'

type BackupViewState = 'loading' | 'unconfigured' | 'ready'

type BackupProbe = {
  exists: boolean
  updated_at: number
  size: number
  probeFailed: boolean
}

/** Trigger button plus dialog that backs the studio up to the user bucket. */
export function StudioBackupDialog(props: { className?: string }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<BackupViewState>('loading')
  const [probe, setProbe] = useState<BackupProbe | null>(null)
  const [pending, setPending] = useState(false)

  const loadStatus = useCallback(async (isCancelled: () => boolean) => {
    try {
      const storage = await getUserStorage()
      if (isCancelled()) return
      if (!storage.success || !storage.data?.configured) {
        setView('unconfigured')
        setProbe(null)
        return
      }

      setView('ready')
      setProbe(null)
      try {
        const next = await getStudioBackupStatus()
        if (isCancelled()) return
        setProbe({
          exists: next.exists,
          updated_at: next.updated_at,
          size: next.size,
          probeFailed: false,
        })
      } catch {
        // The bucket is configured but unreachable, so let the user retry.
        if (isCancelled()) return
        setProbe({
          exists: false,
          updated_at: 0,
          size: 0,
          probeFailed: true,
        })
      }
    } catch {
      if (!isCancelled()) setView('unconfigured')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setView('loading')
    setProbe(null)
    void loadStatus(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [open, loadStatus])

  const reportCounts = (key: string, counts: StudioBackupCounts) => {
    toast.success(t(key, counts))
  }

  const handleBackup = async () => {
    setPending(true)
    try {
      reportCounts(
        'Backup complete: {{conversations}} chats, {{messages}} messages, and {{generations}} artworks.',
        await backupStudio()
      )
      await loadStatus(() => false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Operation failed')
      )
    } finally {
      setPending(false)
    }
  }

  const handleRestore = async () => {
    setPending(true)
    try {
      const counts = await restoreStudio()
      if (counts.conversations + counts.messages + counts.generations === 0) {
        toast.success(
          t('Local data already contains everything in the backup.')
        )
      } else {
        reportCounts(
          'Restore complete: added {{conversations}} chats, {{messages}} messages, and {{generations}} artworks.',
          counts
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('Operation failed')
      )
    } finally {
      setPending(false)
    }
  }

  const lastBackup = probe?.exists
    ? [
        formatTimestampRelative(
          probe.updated_at * 1000,
          'milliseconds',
          toIntlLocale(i18n.language)
        ),
        formatBytes(probe.size),
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  let probeText: ReactNode = lastBackup ?? t('No backup found')
  if (probe === null) {
    probeText = <Spinner className='text-muted-foreground size-4' />
  } else if (probe.probeFailed) {
    probeText = t(
      'Could not check backup status. Allow GET and HEAD in your bucket CORS policy.'
    )
  }

  return (
    <>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={t('Backup and restore')}
        className={cn('text-muted-foreground', props.className)}
        onClick={() => setOpen(true)}
      >
        <Settings2 />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('Backup and restore')}
        description={t(
          'Back up chats, images, and videos to your personal bucket, then restore them after changing devices or clearing browser data.'
        )}
        contentClassName='sm:max-w-md'
      >
        {view === 'loading' && (
          <div className='flex min-h-28 items-center justify-center'>
            <Spinner className='text-muted-foreground size-5' />
          </div>
        )}

        {view === 'unconfigured' && (
          <div className='space-y-4'>
            <div className='bg-muted/40 text-muted-foreground rounded-lg p-4 text-sm leading-relaxed'>
              {t(
                'Backup requires your own S3-compatible bucket, such as Cloudflare R2, Alibaba Cloud OSS, or Tencent Cloud COS. Configure it in Profile first.'
              )}
            </div>
            <Button
              className='w-full'
              render={<Link to='/profile' search={{ tab: 'storage' }} />}
            >
              {t('Configure in Profile')}
            </Button>
          </div>
        )}

        {view === 'ready' && (
          <div className='space-y-4'>
            <div className='border-border/60 rounded-lg border p-4 text-sm'>
              <div className='text-muted-foreground'>{t('Last backup')}</div>
              <div className='mt-1'>{probeText}</div>
            </div>
            <div className='flex gap-2'>
              <Button
                className='flex-1'
                disabled={pending}
                onClick={() => void handleBackup()}
              >
                {pending ? <Spinner className='size-4' /> : <CloudUpload />}
                {t('Back up now')}
              </Button>
              <Popconfirm
                title={t('Restore from backup?')}
                description={t(
                  'Only missing local records will be added. Existing data will not be overwritten or deleted.'
                )}
                confirmText={t('Continue')}
                disabled={pending || !probe?.exists}
                onConfirm={handleRestore}
              >
                <Button
                  variant='outline'
                  className='border-border/60 flex-1'
                  disabled={pending || !probe?.exists}
                >
                  <CloudDownload />
                  {t('Restore from backup')}
                </Button>
              </Popconfirm>
            </div>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              {t(
                'The backup contains record text and file links only; image and video files are already in your bucket. It is stored as a private file and each backup replaces the previous one.'
              )}
            </p>
          </div>
        )}
      </Dialog>
    </>
  )
}

/** Formats a stored byte size the way the reference does: KB or MB. */
function formatBytes(size: number): string {
  if (!size || size <= 0) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
