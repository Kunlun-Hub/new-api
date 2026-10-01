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
import type { TFunction } from 'i18next'
import {
  MoveRight,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Markdown } from '@/components/ui/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, truncateText } from '@/lib/utils'

export type NoticeStatus = 'info' | 'success' | 'warning' | 'danger'
export type NoticeVariant = 'system' | 'price'

export interface NoticeSourceItem {
  id?: number | string
  content: string
  publishDate?: string
  type?: string
  extra?: string
}

interface NoticeStatusMeta {
  icon: LucideIcon
  systemTextKey: string
  priceTextKey: string
  className: string
}

const NOTICE_STATUS_META: Record<NoticeStatus, NoticeStatusMeta> = {
  info: {
    icon: MoveRight,
    systemTextKey: 'Notice',
    priceTextKey: 'Price Update',
    className: 'bg-secondary text-secondary-foreground',
  },
  success: {
    icon: TrendingDown,
    systemTextKey: 'Good news',
    priceTextKey: 'Price Cut',
    className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: TrendingUp,
    systemTextKey: 'Heads-up',
    priceTextKey: 'Slight Rise',
    className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  },
  danger: {
    icon: TrendingUp,
    systemTextKey: 'Urgent',
    priceTextKey: 'Price Up',
    className: 'bg-red-500/20 text-red-600 dark:text-red-400',
  },
}

const ANNOUNCEMENT_STATUS_BY_TYPE: Record<string, NoticeStatus> = {
  default: 'info',
  ongoing: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
}

const PRICE_STATUS_BY_TYPE: Record<string, NoticeStatus> = {
  update: 'info',
  price_cut: 'success',
  price_up: 'danger',
}

const SKELETON_ROWS = [0, 1, 2, 3]

interface NoticeEntry {
  key: string
  title: string
  content: string
  status: NoticeStatus
  createdAt?: number
}

function hashString(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function toUnixSeconds(value?: string): number | undefined {
  if (!value) return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return Math.floor(parsed / 1000)
}

function toNoticeTitle(content: string): string {
  const firstLine = content.split('\n').find((line) => line.trim() !== '')
  return truncateText(
    (firstLine ?? content).replaceAll(/[#*_]/g, '').trim(),
    60
  )
}

function formatNoticeTime(value: number | undefined, t: TFunction): string {
  if (!value) return '-'

  const timestamp = value.toString().length < 13 ? value * 1000 : value
  const seconds = Math.max(0, Date.now() - timestamp) / 1000

  if (seconds < 60) {
    return t('{{count}} seconds ago', { count: Math.floor(seconds) })
  }
  if (seconds < 3600) {
    return t('{{count}} minutes ago', { count: Math.floor(seconds / 60) })
  }
  if (seconds < 86400) {
    return t('{{count}} hours ago', { count: Math.floor(seconds / 3600) })
  }
  if (seconds < 2592000) {
    return t('{{count}} days ago', { count: Math.floor(seconds / 86400) })
  }
  if (seconds < 31536000) {
    return t('{{count}} months ago', { count: Math.floor(seconds / 2592000) })
  }
  return t('{{count}} years ago', { count: Math.floor(seconds / 31536000) })
}

function buildNoticeEntries(
  items: NoticeSourceItem[],
  variant: NoticeVariant
): NoticeEntry[] {
  const statusByType =
    variant === 'price' ? PRICE_STATUS_BY_TYPE : ANNOUNCEMENT_STATUS_BY_TYPE

  return items.map((item) => {
    const content = (item.content ?? '').trim()
    const fingerprint = `${item.publishDate ?? ''}|${item.type ?? ''}|${content}`
    return {
      key: String(item.id ?? hashString(fingerprint)),
      title: toNoticeTitle(content),
      content,
      status: statusByType[item.type ?? ''] ?? 'info',
      createdAt: toUnixSeconds(item.publishDate),
    }
  })
}

function NoticeAccordion({
  entries,
  variant,
}: {
  entries: NoticeEntry[]
  variant: NoticeVariant
}) {
  const { t } = useTranslation()
  const [openValues, setOpenValues] = useState<string[]>(() => [entries[0].key])

  const handleValueChange = (values: string[]) => {
    const latest = values.at(-1)
    setOpenValues(latest === undefined ? [] : [latest])
  }

  return (
    <Accordion
      value={openValues}
      onValueChange={handleValueChange}
      className='gap-2 text-sm'
    >
      {entries.map((entry) => {
        const meta = NOTICE_STATUS_META[entry.status]
        const StatusIcon = meta.icon
        return (
          <AccordionItem
            key={entry.key}
            value={entry.key}
            className='border-border/30 bg-background/40 hover:border-border/40 hover:bg-background/60 rounded-lg border px-4'
          >
            {variant === 'price' ? (
              <AccordionTrigger className='flex items-center gap-3 py-4 hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden'>
                <div className='flex flex-1 flex-col gap-2'>
                  <span>{entry.title}</span>
                  <span className='text-muted-foreground shrink-0 text-xs font-normal'>
                    <Badge className={cn('mr-2 font-semibold', meta.className)}>
                      {t(meta.priceTextKey)}
                    </Badge>
                    {formatNoticeTime(entry.createdAt, t)}
                  </span>
                </div>
                <StatusIcon
                  aria-hidden='true'
                  strokeWidth={2}
                  className='size-4'
                />
              </AccordionTrigger>
            ) : (
              <AccordionTrigger className='flex items-center gap-2 py-4 hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden'>
                <Badge className={cn('font-semibold', meta.className)}>
                  {t(meta.systemTextKey)}
                </Badge>
                {entry.title}
                <span className='text-muted-foreground ml-auto shrink-0 text-xs font-normal'>
                  {formatNoticeTime(entry.createdAt, t)}
                </span>
              </AccordionTrigger>
            )}
            <AccordionContent>
              <Markdown className='prose-sm prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1.5'>
                {entry.content}
              </Markdown>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

export function NoticeList({
  items,
  variant = 'system',
  scrollClassName,
  emptyText,
  loading = false,
}: {
  items: NoticeSourceItem[]
  variant?: NoticeVariant
  scrollClassName?: string
  emptyText?: string
  loading?: boolean
}) {
  if (loading && items.length === 0) {
    return (
      <div className={cn('space-y-2 px-4', scrollClassName)}>
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className='border-border/30 bg-background/40 flex items-center gap-2 rounded-lg border px-4 py-4'
          >
            <Skeleton className='h-5 w-12 shrink-0 rounded-full' />
            <Skeleton className='h-4 flex-1' />
            <Skeleton className='h-3 w-10 shrink-0' />
          </div>
        ))}
      </div>
    )
  }

  const entries = buildNoticeEntries(items, variant)

  if (entries.length === 0) {
    return (
      <div className='text-muted-foreground px-4 py-10 text-center text-sm'>
        {emptyText ?? '-'}
      </div>
    )
  }

  return (
    <ScrollArea className={cn('px-4', scrollClassName)}>
      <NoticeAccordion
        key={`${variant}-${entries[0].key}`}
        entries={entries}
        variant={variant}
      />
    </ScrollArea>
  )
}
