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
import { ExternalLink, ImageOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { mjStatusMapper } from '../../lib/mappers'
import { isMjTaskFailure, parseMjArtifactUrls } from '../../lib/mj-artifacts'
import type { MidjourneyLog } from '../../types'
import { DetailRow } from './log-detail-layout'

interface DrawingTaskDialogProps {
  log: MidjourneyLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MediaCard({
  url,
  copyLabel,
  openLabel,
}: {
  url: string
  copyLabel: string
  openLabel: string
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className='group bg-muted/30 border-border/40 relative overflow-hidden rounded-lg border'>
      <div className='bg-muted/50 relative aspect-square w-full'>
        {failed ? (
          <div className='text-muted-foreground absolute inset-0 flex items-center justify-center'>
            <ImageOff className='size-8' />
          </div>
        ) : (
          <img
            src={url}
            alt=''
            referrerPolicy='no-referrer'
            className='h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]'
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className='bg-background/60 border-border/40 flex items-center gap-1 border-t px-2 py-1.5 backdrop-blur'>
        <CopyButton
          value={url}
          position='right'
          tooltip={copyLabel}
          className='h-auto min-w-0 flex-1 justify-start bg-transparent! p-0'
          iconClassName='size-3 shrink-0'
        >
          <span className='text-muted-foreground hover:text-foreground truncate font-mono text-[11px] transition-colors'>
            {url}
          </span>
        </CopyButton>
        <Button
          variant='ghost'
          size='icon'
          className='size-6 shrink-0'
          render={
            <a href={url} target='_blank' rel='noreferrer' title={openLabel} />
          }
          title={openLabel}
        >
          <ExternalLink className='size-3' />
        </Button>
      </div>
    </div>
  )
}

export function DrawingTaskDialog({
  log,
  open,
  onOpenChange,
}: DrawingTaskDialogProps) {
  const { t } = useTranslation()
  const images = useMemo(
    () => (log ? parseMjArtifactUrls(log.image_urls, log.image_url) : []),
    [log]
  )
  const videoUrls = useMemo(
    () => (log ? parseMjArtifactUrls(log.video_urls, log.video_url) : []),
    [log]
  )

  if (!log) {
    return null
  }

  const status = isMjTaskFailure(log) ? 'FAILURE' : log.status
  const statusClassName = mjStatusMapper.getBadgeClassName(status)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      contentClassName='bg-linear-to-br from-foreground/6 via-transparent to-transparent md:max-w-180 md:rounded-2xl md:p-6'
      bodyClassName='space-y-4'
      title={
        <div className='flex items-center gap-2'>
          <Badge>{(log.action ?? '').toUpperCase() || '-'}</Badge>
          <Badge
            variant={statusClassName ? 'default' : 'outline'}
            className={statusClassName}
          >
            {t(mjStatusMapper.getLabel(status))}
          </Badge>
          {log.mode ? (
            <span className='text-muted-foreground text-xs'>{log.mode}</span>
          ) : null}
        </div>
      }
      description={
        log.mj_id ? (
          <CopyButton
            value={log.mj_id}
            position='right'
            className='h-auto w-auto min-w-0 justify-start bg-transparent! p-0'
            iconClassName='size-3'
          >
            <span className='ml-1 font-mono text-xs'>{log.mj_id}</span>
          </CopyButton>
        ) : (
          formatTimestampToDate(log.submit_time, 'milliseconds')
        )
      }
    >
      {images.length > 0 || videoUrls.length > 0 ? (
        <section className='space-y-3'>
          {images.length > 0 && (
            <div
              className={cn(
                'grid gap-3',
                images.length === 1
                  ? 'grid-cols-1'
                  : 'grid-cols-2 md:grid-cols-4'
              )}
            >
              {images.map((url) => (
                <MediaCard
                  key={url}
                  url={url}
                  copyLabel={t('Copy URL')}
                  openLabel={t('Open in new tab')}
                />
              ))}
            </div>
          )}
          {videoUrls.length > 0 && (
            <div className='space-y-2'>
              {videoUrls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target='_blank'
                  rel='noreferrer'
                  className='flex items-center gap-2 text-sm text-blue-500 hover:underline'
                >
                  <ExternalLink className='size-4' />
                  {url}
                </a>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {log.prompt ? (
        <section className='space-y-2'>
          <h4 className='text-sm font-semibold'>{t('Prompt')}</h4>
          <div className='relative'>
            <div className='absolute top-2 right-2 z-1'>
              <CopyButton
                value={log.prompt}
                className='size-6 p-0'
                iconClassName='size-3.5'
              />
            </div>
            <pre className='border-border/40 bg-muted/30 rounded-lg border p-3 pr-8 text-xs wrap-break-word whitespace-pre-wrap'>
              {log.prompt}
            </pre>
          </div>
        </section>
      ) : null}

      {log.prompt_en && log.prompt_en !== log.prompt ? (
        <section className='space-y-2'>
          <h4 className='text-sm font-semibold'>{t('Prompt (EN)')}</h4>
          <div className='relative'>
            <div className='absolute top-2 right-2 z-1'>
              <CopyButton
                value={log.prompt_en}
                className='size-6 p-0'
                iconClassName='size-3.5'
              />
            </div>
            <pre className='border-border/40 bg-muted/30 rounded-lg border p-3 pr-8 text-xs wrap-break-word whitespace-pre-wrap'>
              {log.prompt_en}
            </pre>
          </div>
        </section>
      ) : null}

      <section className='space-y-2'>
        {status === 'FAILURE' && log.fail_reason ? (
          <DetailRow
            label={t('Fail Reason')}
            value={<span className='text-red-500'>{log.fail_reason}</span>}
          />
        ) : null}
        <DetailRow
          label={t('Submit Time')}
          value={formatTimestampToDate(log.submit_time, 'milliseconds')}
        />
        {log.start_time && log.start_time > 0 ? (
          <DetailRow
            label={t('Start Time')}
            value={formatTimestampToDate(log.start_time, 'milliseconds')}
          />
        ) : null}
        {log.finish_time && log.finish_time > 0 ? (
          <DetailRow
            label={t('Finish Time')}
            value={formatTimestampToDate(log.finish_time, 'milliseconds')}
          />
        ) : null}
      </section>
    </Dialog>
  )
}
