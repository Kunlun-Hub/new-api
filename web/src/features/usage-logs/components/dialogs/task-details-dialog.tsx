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
import { Shield01Icon, Wrench01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { formatLogQuota, formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getTaskArtifacts } from '../../api'
import { taskStatusMapper } from '../../lib/mappers'
import { resolveTaskDetailAccess } from '../../lib/task-details'
import type { TaskLog } from '../../types'
import { PluginAuthorLink } from '../plugin-author-link'

function DetailRow(props: {
  label: React.ReactNode
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className='grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]'>
      <span className='text-muted-foreground text-xs'>{props.label}</span>
      <span
        className={cn(
          'min-w-0 text-xs break-all sm:wrap-break-word',
          props.mono && 'font-mono'
        )}
      >
        {props.value}
      </span>
    </div>
  )
}

function DetailSection(props: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className='min-w-0 space-y-1.5'>
      <Label className='flex items-center gap-1.5 text-xs font-semibold'>
        {props.icon}
        {props.label}
      </Label>
      <div className='bg-muted/30 min-w-0 space-y-1.5 rounded-md border p-2.5'>
        {props.children}
      </div>
    </section>
  )
}

function formatTaskTimestamp(value?: number): string {
  return value ? formatTimestampToDate(value, 'seconds') : '-'
}

interface TaskDetailsDialogProps {
  log: TaskLog | null
  isAdmin: boolean
  isRoot: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailsDialog(props: TaskDetailsDialogProps) {
  const { t } = useTranslation()
  const taskId = props.log?.task_id ?? ''
  const hasInlineData = props.log?.data != null
  // Task lists omit the persisted snapshot, so the dialog loads it on demand
  // the same way the artifact preview does.
  const snapshotQuery = useQuery({
    queryKey: ['usage-logs', 'task-snapshot', taskId],
    queryFn: async () => getTaskArtifacts(taskId, { includeData: true }),
    enabled: props.open && !hasInlineData && taskId.length > 0,
    retry: false,
    staleTime: 30_000,
  })

  if (!props.log) {
    return null
  }

  const log = props.log
  const access = resolveTaskDetailAccess(log, props.isAdmin, props.isRoot)
  const plugin = access.plugin
  const runtime = access.runtime
  const properties = log.properties
  const status = log.status ?? ''
  const statusClassName = taskStatusMapper.getBadgeClassName(status)
  const taskData = JSON.stringify(
    log.data ?? snapshotQuery.data?.taskData ?? {},
    null,
    2
  )

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      contentClassName='bg-linear-to-br from-foreground/6 via-transparent to-transparent md:max-w-160 md:rounded-2xl md:p-6'
      headerClassName='gap-1 mb-5'
      title={
        <div className='flex items-center gap-2'>
          <Badge>{log.platform}</Badge>
          <span className='font-mono text-base'>
            {(log.action ?? '').toUpperCase()}
          </span>
        </div>
      }
      description={
        log.task_id ? (
          <CopyButton
            value={log.task_id}
            position='right'
            className='h-auto w-auto min-w-0 justify-start bg-transparent! p-0'
            iconClassName='size-3'
          >
            <span className='ml-1 font-mono text-xs'>{log.task_id}</span>
          </CopyButton>
        ) : (
          formatTaskTimestamp(log.created_at)
        )
      }
      bodyClassName='space-y-4'
    >
      <section>
        <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm'>
          <dt className='text-muted-foreground min-w-18 whitespace-nowrap'>
            {t('Status')}
          </dt>
          <dd className='text-foreground'>
            <Badge
              variant={statusClassName ? 'default' : 'outline'}
              className={statusClassName}
            >
              {t(taskStatusMapper.getLabel(status, 'Unknown'))}
            </Badge>
          </dd>
          {(status === 'FAILURE' || status === 'UNKNOWN') && log.fail_reason ? (
            <>
              <dt className='text-muted-foreground min-w-18 whitespace-nowrap'>
                {t('Fail Reason')}
              </dt>
              <dd className='text-red-500'>{log.fail_reason}</dd>
            </>
          ) : null}
          <dt className='text-muted-foreground min-w-18 whitespace-nowrap'>
            {t('Submit Time')}
          </dt>
          <dd className='text-foreground'>
            {formatTaskTimestamp(log.submit_time)}
          </dd>
          {log.start_time && log.start_time > 0 ? (
            <>
              <dt className='text-muted-foreground min-w-18 whitespace-nowrap'>
                {t('Start Time')}
              </dt>
              <dd className='text-foreground'>
                {formatTaskTimestamp(log.start_time)}
              </dd>
            </>
          ) : null}
          {log.finish_time && log.finish_time > 0 ? (
            <>
              <dt className='text-muted-foreground min-w-18 whitespace-nowrap'>
                {t('Finish Time')}
              </dt>
              <dd className='text-foreground'>
                {formatTaskTimestamp(log.finish_time)}
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className='space-y-3'>
        <h4 className='text-sm font-semibold'>{t('Task Data')}</h4>
        <div className='relative'>
          <div className='absolute top-2 right-2 z-1'>
            <CopyButton
              value={taskData}
              className='size-6 p-0'
              iconClassName='size-3.5'
            />
          </div>
          <pre className='border-border/40 bg-muted/30 rounded-lg border p-3 pr-8 text-xs wrap-break-word whitespace-pre-wrap'>
            {taskData}
          </pre>
        </div>
      </section>

      {props.isAdmin ? (
        <DetailSection
          label={t('Admin Only')}
          icon={
            <HugeiconsIcon
              icon={Shield01Icon}
              className='size-3.5 text-blue-500'
              strokeWidth={2}
            />
          }
        >
          <DetailRow
            label={t('User')}
            value={log.username || String(log.user_id)}
          />
          <DetailRow label={t('Channel')} value={`#${log.channel_id}`} mono />
          <DetailRow label={t('Group')} value={log.group || '-'} />
          <DetailRow
            label={t('Quota')}
            value={formatLogQuota(log.quota)}
            mono
          />
          {properties?.origin_model_name ? (
            <DetailRow
              label={t('Original Model')}
              value={properties.origin_model_name}
              mono
            />
          ) : null}
          {properties?.upstream_model_name ? (
            <DetailRow
              label={t('Actual Model')}
              value={properties.upstream_model_name}
              mono
            />
          ) : null}
          {log.admin_info?.request_id ? (
            <DetailRow
              label={t('Request ID')}
              value={log.admin_info.request_id}
              mono
            />
          ) : null}
          {log.admin_info?.request_path ? (
            <DetailRow
              label={t('Request Path')}
              value={log.admin_info.request_path}
              mono
            />
          ) : null}
          {plugin ? (
            <>
              <DetailRow
                label={t('Task Plugin')}
                value={plugin.name || plugin.key}
              />
              <DetailRow label={t('Plugin key')} value={plugin.key} mono />
              <DetailRow
                label={t('Version')}
                value={plugin.version || '-'}
                mono
              />
              {plugin.author ? (
                <DetailRow
                  label={t('Plugin author')}
                  value={<PluginAuthorLink author={plugin.author} showUrl />}
                />
              ) : null}
            </>
          ) : null}
        </DetailSection>
      ) : null}

      {props.isRoot && log.root_info ? (
        <DetailSection
          label={t('Root Diagnostics')}
          icon={
            <HugeiconsIcon
              icon={Wrench01Icon}
              className='size-3.5 text-amber-500'
              strokeWidth={2}
            />
          }
        >
          {runtime ? (
            <>
              <DetailRow
                label={t('API Version')}
                value={String(runtime.api_version)}
                mono
              />
              <DetailRow
                label={t('Plugin Generation')}
                value={String(runtime.generation)}
                mono
              />
            </>
          ) : null}
          {access.upstreamTaskId ? (
            <DetailRow
              label={t('Upstream Task ID')}
              value={access.upstreamTaskId}
              mono
            />
          ) : null}
          {access.nodeName ? (
            <DetailRow label={t('Node Name')} value={access.nodeName} mono />
          ) : null}
        </DetailSection>
      ) : null}
    </Dialog>
  )
}
