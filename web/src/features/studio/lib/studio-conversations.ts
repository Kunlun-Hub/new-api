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
import type { Message } from '@/features/playground/types'

import {
  openStudioDatabase,
  STUDIO_CONVERSATIONS_STORE,
  STUDIO_MESSAGES_STORE,
  studioRequestResult,
  studioTransactionDone,
} from './studio-store'

export type StudioConversation = {
  id: string
  title: string
  starred: boolean
  created_at: number
  updated_at: number
}

export type StudioStoredMessage = Message & {
  id: string
  conversation_id: string
}

/** Lists conversations, most recently updated first. */
export async function listStudioConversations(): Promise<StudioConversation[]> {
  const database = await openStudioDatabase()
  const request = database
    .transaction(STUDIO_CONVERSATIONS_STORE, 'readonly')
    .objectStore(STUDIO_CONVERSATIONS_STORE)
    .getAll()
  const conversations = (await studioRequestResult(
    request
  )) as StudioConversation[]
  return conversations.sort((left, right) => right.updated_at - left.updated_at)
}

/** Lists the messages of one conversation in send order. */
export async function listStudioMessages(
  conversationId: string
): Promise<StudioStoredMessage[]> {
  const database = await openStudioDatabase()
  const request = database
    .transaction(STUDIO_MESSAGES_STORE, 'readonly')
    .objectStore(STUDIO_MESSAGES_STORE)
    .index('conversation_id')
    .getAll(conversationId)
  const messages = (await studioRequestResult(request)) as StudioStoredMessage[]
  return messages.sort(
    (left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)
  )
}

/** Stores a conversation record. */
export async function saveStudioConversation(
  conversation: StudioConversation
): Promise<void> {
  const database = await openStudioDatabase()
  const transaction = database.transaction(
    STUDIO_CONVERSATIONS_STORE,
    'readwrite'
  )
  transaction.objectStore(STUDIO_CONVERSATIONS_STORE).put(conversation)
  await studioTransactionDone(transaction)
}

/** Replaces the stored messages of one conversation. */
export async function saveStudioMessages(
  conversationId: string,
  messages: Message[]
): Promise<void> {
  const database = await openStudioDatabase()
  const transaction = database.transaction(STUDIO_MESSAGES_STORE, 'readwrite')
  const store = transaction.objectStore(STUDIO_MESSAGES_STORE)
  const existing = store.index('conversation_id').getAllKeys(conversationId)
  existing.addEventListener('success', () => {
    for (const key of existing.result) {
      store.delete(key)
    }
    for (const message of messages) {
      store.put({
        ...message,
        id: message.key,
        conversation_id: conversationId,
      } satisfies StudioStoredMessage)
    }
  })
  await studioTransactionDone(transaction)
}

/** Removes a conversation together with its stored messages. */
export async function removeStudioConversation(
  conversationId: string
): Promise<void> {
  await removeStudioMessages([conversationId])
  const database = await openStudioDatabase()
  const transaction = database.transaction(
    STUDIO_CONVERSATIONS_STORE,
    'readwrite'
  )
  transaction.objectStore(STUDIO_CONVERSATIONS_STORE).delete(conversationId)
  await studioTransactionDone(transaction)
}

/** Removes every conversation except the starred ones, returning its count. */
export async function clearStudioConversations(): Promise<number> {
  const conversations = await listStudioConversations()
  const removable = conversations.filter(
    (conversation) => !conversation.starred
  )
  if (removable.length === 0) return 0

  await removeStudioMessages(removable.map((conversation) => conversation.id))
  const database = await openStudioDatabase()
  const transaction = database.transaction(
    STUDIO_CONVERSATIONS_STORE,
    'readwrite'
  )
  const store = transaction.objectStore(STUDIO_CONVERSATIONS_STORE)
  for (const conversation of removable) {
    store.delete(conversation.id)
  }
  await studioTransactionDone(transaction)
  return removable.length
}

/** Deletes the stored messages of the given conversations. */
async function removeStudioMessages(conversationIds: string[]): Promise<void> {
  const database = await openStudioDatabase()
  const transaction = database.transaction(STUDIO_MESSAGES_STORE, 'readwrite')
  const store = transaction.objectStore(STUDIO_MESSAGES_STORE)
  const index = store.index('conversation_id')
  for (const conversationId of conversationIds) {
    const keys = index.getAllKeys(conversationId)
    keys.addEventListener('success', () => {
      for (const key of keys.result) {
        store.delete(key)
      }
    })
  }
  await studioTransactionDone(transaction)
}

/** Conversation bucket shown in the chat sidebar. */
export type StudioConversationGroup = {
  key: 'starred' | 'today' | 'yesterday' | 'earlier'
  labelKey: string
  conversations: StudioConversation[]
}

/**
 * Splits conversations into the starred list plus the today / yesterday /
 * earlier buckets used by the sidebar. Empty groups are dropped.
 */
export function groupStudioConversations(
  conversations: StudioConversation[],
  now = Date.now()
): StudioConversationGroup[] {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const yesterdayStart = todayStart - 86_400_000

  const starred: StudioConversation[] = []
  const today: StudioConversation[] = []
  const yesterday: StudioConversation[] = []
  const earlier: StudioConversation[] = []

  for (const conversation of conversations) {
    if (conversation.starred) {
      starred.push(conversation)
      continue
    }
    if (conversation.updated_at >= todayStart) {
      today.push(conversation)
    } else if (conversation.updated_at >= yesterdayStart) {
      yesterday.push(conversation)
    } else {
      earlier.push(conversation)
    }
  }

  const groups: StudioConversationGroup[] = [
    { key: 'starred', labelKey: 'Starred', conversations: starred },
    { key: 'today', labelKey: 'Today', conversations: today },
    { key: 'yesterday', labelKey: 'Yesterday', conversations: yesterday },
    { key: 'earlier', labelKey: 'Earlier', conversations: earlier },
  ]

  return groups.filter((group) => group.conversations.length > 0)
}
