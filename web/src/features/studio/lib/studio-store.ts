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
/**
 * Browser-local studio storage.
 *
 * The studio keeps conversations and generated works in the visitor's browser
 * only, matching the reference product: nothing leaves the device unless the
 * user backs it up to their personal bucket.
 */
export const STUDIO_DATABASE = 'studio'
export const STUDIO_GENERATIONS_STORE = 'generations'
export const STUDIO_CONVERSATIONS_STORE = 'conversations'
export const STUDIO_MESSAGES_STORE = 'messages'

const STUDIO_DATABASE_VERSION = 2

let databasePromise: Promise<IDBDatabase> | null = null

/** Opens (and upgrades) the studio database. */
export function openStudioDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'))
  }

  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(STUDIO_DATABASE, STUDIO_DATABASE_VERSION)
      request.addEventListener('upgradeneeded', () => {
        const database = request.result
        for (const store of [
          STUDIO_GENERATIONS_STORE,
          STUDIO_CONVERSATIONS_STORE,
          STUDIO_MESSAGES_STORE,
        ]) {
          if (!database.objectStoreNames.contains(store)) {
            database.createObjectStore(store, { keyPath: 'id' })
          }
        }
        const messages = request.transaction?.objectStore(STUDIO_MESSAGES_STORE)
        if (messages && !messages.indexNames.contains('conversation_id')) {
          messages.createIndex('conversation_id', 'conversation_id')
        }
      })
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () =>
        reject(request.error ?? new Error('Failed to open studio storage'))
      )
    })
  }

  return databasePromise
}

/** Resolves when the given request succeeds. */
export function studioRequestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () =>
      reject(request.error ?? new Error('Studio storage request failed'))
    )
  })
}

/** Resolves when the transaction commits. */
export function studioTransactionDone(
  transaction: IDBTransaction
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('error', () =>
      reject(transaction.error ?? new Error('Studio storage write failed'))
    )
    transaction.addEventListener('abort', () =>
      reject(transaction.error ?? new Error('Studio storage write aborted'))
    )
  })
}

const STUDIO_DATA_CHANGED_EVENT = 'studio:data-changed'

/** Announces that studio records were written outside the current hook. */
export function announceStudioDataChange(): void {
  window.dispatchEvent(new Event(STUDIO_DATA_CHANGED_EVENT))
}

/** Subscribes to studio record changes, returning the unsubscribe function. */
export function subscribeStudioDataChange(listener: () => void): () => void {
  window.addEventListener(STUDIO_DATA_CHANGED_EVENT, listener)
  return () => window.removeEventListener(STUDIO_DATA_CHANGED_EVENT, listener)
}
