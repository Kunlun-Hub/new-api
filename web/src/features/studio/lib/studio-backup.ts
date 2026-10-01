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
import { t } from 'i18next'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import type {
  StudioConversation,
  StudioStoredMessage,
} from './studio-conversations'
import {
  announceStudioDataChange,
  openStudioDatabase,
  STUDIO_CONVERSATIONS_STORE,
  STUDIO_GENERATIONS_STORE,
  STUDIO_MESSAGES_STORE,
  studioRequestResult,
  studioTransactionDone,
} from './studio-store'

export const STUDIO_BACKUP_APP = 'studio-backup'
const STUDIO_BACKUP_VERSION = 1

export type StudioBackupCounts = {
  conversations: number
  messages: number
  generations: number
}

export type StudioBackupStatus = {
  configured: boolean
  exists: boolean
  updated_at: number
  size: number
}

export type StudioBackupData = {
  conversations: StudioConversation[]
  messages: StudioStoredMessage[]
  generations: Record<string, unknown>[]
}

type StudioBackupFile = {
  app?: string
  version?: number
  created_at?: number
  data?: StudioBackupData
}

/** Reads the backup status of the caller's personal bucket. */
export async function getStudioBackupStatus(): Promise<StudioBackupStatus> {
  const response = await api.get('/api/studio/backup')
  requireServerSuccess(response.data)
  const status = response.data?.data as StudioBackupStatus | undefined

  return {
    configured: status?.configured === true,
    exists: status?.exists === true,
    updated_at: status?.updated_at ?? 0,
    size: status?.size ?? 0,
  }
}

async function readStore<T>(store: string): Promise<T[]> {
  const database = await openStudioDatabase()
  const request = database
    .transaction(store, 'readonly')
    .objectStore(store)
    .getAll()
  return (await studioRequestResult(request)) as T[]
}

/** Reads every studio record kept in this browser. */
export async function exportStudioData(): Promise<StudioBackupData> {
  const [conversations, messages, generations] = await Promise.all([
    readStore<StudioConversation>(STUDIO_CONVERSATIONS_STORE),
    readStore<StudioStoredMessage>(STUDIO_MESSAGES_STORE),
    readStore<Record<string, unknown>>(STUDIO_GENERATIONS_STORE),
  ])

  return { conversations, messages, generations }
}

/** Uploads a full snapshot to the caller's personal bucket. */
export async function backupStudio(): Promise<StudioBackupCounts> {
  const data = await exportStudioData()

  await api.put('/api/studio/backup', {
    app: STUDIO_BACKUP_APP,
    version: STUDIO_BACKUP_VERSION,
    created_at: Date.now(),
    data,
  })

  return {
    conversations: data.conversations.length,
    messages: data.messages.length,
    generations: data.generations.length,
  }
}

/** Downloads the stored snapshot and adds locally missing records. */
export async function restoreStudio(): Promise<StudioBackupCounts> {
  const response = await api.get('/api/studio/backup/file')
  const file = response.data as StudioBackupFile | undefined

  if (file?.app !== STUDIO_BACKUP_APP || !file.data) {
    throw new Error(t('The backup file is invalid'))
  }

  const counts = await importStudioData(file.data)
  announceStudioDataChange()
  return counts
}

/** Adds records that are missing locally; existing records are kept as-is. */
async function importStudioData(
  data: StudioBackupData
): Promise<StudioBackupCounts> {
  const conversations = Array.isArray(data.conversations)
    ? data.conversations
    : []
  const messages = Array.isArray(data.messages) ? data.messages : []
  const generations = Array.isArray(data.generations) ? data.generations : []

  const addedConversations = await putMissing(
    STUDIO_CONVERSATIONS_STORE,
    conversations.filter(
      (conversation) => typeof conversation?.id === 'string'
    ),
    (conversation) => conversation.id
  )
  const addedMessages = await putMissing(
    STUDIO_MESSAGES_STORE,
    messages.filter((message) => typeof message?.id === 'string'),
    (message) => message.id
  )
  const addedGenerations = await putMissing(
    STUDIO_GENERATIONS_STORE,
    generations.filter((record) => record?.id !== undefined),
    (record) => record.id as IDBValidKey
  )

  return {
    conversations: addedConversations,
    messages: addedMessages,
    generations: addedGenerations,
  }
}

/** Writes the records whose key is not stored yet, returning the count added. */
async function putMissing<T>(
  store: string,
  records: T[],
  keyOf: (record: T) => IDBValidKey
): Promise<number> {
  if (records.length === 0) return 0

  const database = await openStudioDatabase()
  const transaction = database.transaction(store, 'readwrite')
  const objectStore = transaction.objectStore(store)
  const existing = await studioRequestResult(objectStore.getAllKeys())
  const existingKeys = new Set(existing.map((key) => String(key)))

  let added = 0
  for (const record of records) {
    const key = keyOf(record)
    if (existingKeys.has(String(key))) continue
    objectStore.put(record)
    added += 1
  }

  await studioTransactionDone(transaction)
  return added
}
