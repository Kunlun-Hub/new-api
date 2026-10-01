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
import { useCallback, useMemo, useState } from 'react'

import {
  useAnnouncements,
  usePriceNotices,
} from '@/features/dashboard/hooks/use-status-data'
import type {
  AnnouncementItem,
  PriceNoticeItem,
} from '@/features/dashboard/types'

const NOTICE_BELL_SEEN_KEY = 'notice_bell_seen_id'

function toUnixSeconds(value?: string): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return 0
  return Math.floor(parsed / 1000)
}

function readSeenNoticeTimestamp(): number {
  const parsed = Number.parseInt(
    window.localStorage.getItem(NOTICE_BELL_SEEN_KEY) ?? '',
    10
  )
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Notification center data for the header bell: system announcements and
 * price notices plus the unread dot state tracked in localStorage.
 */
export function useNotifications() {
  const { items: announcements, loading: announcementsLoading } =
    useAnnouncements()
  const { items: priceNotices, loading: priceNoticesLoading } =
    usePriceNotices()
  const [seenTimestamp, setSeenTimestamp] = useState(readSeenNoticeTimestamp)

  const latestTimestamp = useMemo(() => {
    let latest = 0
    const collect = (item: AnnouncementItem | PriceNoticeItem) => {
      latest = Math.max(latest, toUnixSeconds(item.publishDate))
    }
    announcements.forEach(collect)
    priceNotices.forEach(collect)
    return latest
  }, [announcements, priceNotices])

  const markSeen = useCallback(() => {
    if (latestTimestamp <= 0) return
    window.localStorage.setItem(NOTICE_BELL_SEEN_KEY, String(latestTimestamp))
    setSeenTimestamp(latestTimestamp)
  }, [latestTimestamp])

  return {
    announcements,
    priceNotices,
    loading: announcementsLoading || priceNoticesLoading,
    hasUnread: latestTimestamp > 0 && latestTimestamp > seenTimestamp,
    markSeen,
  }
}
