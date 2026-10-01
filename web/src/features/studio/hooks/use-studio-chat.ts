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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useChatHandler } from '@/features/playground/hooks'
import {
  applyMessageStateUpdate,
  getInitialPlaygroundConfig,
  saveConfig,
  type MessageStateUpdater,
} from '@/features/playground/lib'
import type {
  Message,
  ParameterEnabled,
  PlaygroundConfig,
} from '@/features/playground/types'
import { createUuid } from '@/lib/uuid'

import {
  clearStudioConversations,
  listStudioConversations,
  listStudioMessages,
  removeStudioConversation,
  saveStudioConversation,
  saveStudioMessages,
  type StudioConversation,
} from '../lib/studio-conversations'
import { subscribeStudioDataChange } from '../lib/studio-store'

const SAVE_DEBOUNCE_MS = 500
const TITLE_MAX_LENGTH = 30

/**
 * Studio chat always applies the parameters its composer exposes (temperature
 * and response tokens) and never sends the playground-only sampling knobs.
 */
const STUDIO_PARAMETER_ENABLED: ParameterEnabled = {
  temperature: true,
  top_p: false,
  max_tokens: true,
  frequency_penalty: false,
  presence_penalty: false,
  seed: false,
}

/** Title of a conversation is the first question the visitor asked. */
function conversationTitle(messages: Message[]): string {
  const firstQuestion = messages.find((message) => message.from === 'user')
  const content = firstQuestion?.versions.at(-1)?.content ?? ''
  const title = content.replaceAll(/\s+/g, ' ').trim()
  if (!title) return ''
  return title.length > TITLE_MAX_LENGTH
    ? `${title.slice(0, TITLE_MAX_LENGTH)}…`
    : title
}

/**
 * Studio chat state: conversations and messages live in the browser only.
 *
 * Model parameters are shared with the playground, so switching between the
 * two surfaces keeps the same model and sampling settings.
 */
export function useStudioChat() {
  const [conversations, setConversations] = useState<StudioConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [config, setConfig] = useState<PlaygroundConfig>(
    getInitialPlaygroundConfig
  )

  const conversationsRef = useRef<StudioConversation[]>([])
  const messagesRef = useRef<Message[]>([])
  const activeIdRef = useRef<string | null>(null)
  /** A conversation created in memory: it has no stored messages to load. */
  const skipLoadForIdRef = useRef<string | null>(null)
  const pendingSaveRef = useRef<{
    conversationId: string
    messages: Message[]
  } | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  const persistPendingSave = useCallback(async () => {
    const pending = pendingSaveRef.current
    if (!pending) return
    pendingSaveRef.current = null

    const conversation = conversationsRef.current.find(
      (item) => item.id === pending.conversationId
    )
    if (!conversation) return
    await saveStudioMessages(pending.conversationId, pending.messages)
    await saveStudioConversation(conversation)
  }, [])

  const scheduleSave = useCallback(
    (conversationId: string, next: Message[]) => {
      const previous = conversationsRef.current
      const existing = previous.find((item) => item.id === conversationId)
      const title = existing?.title || conversationTitle(next)
      if (!title) return

      const record: StudioConversation = existing
        ? { ...existing, title, updated_at: Date.now() }
        : {
            id: conversationId,
            title,
            starred: false,
            created_at: Date.now(),
            updated_at: Date.now(),
          }
      const nextConversations = [
        record,
        ...previous.filter((item) => item.id !== conversationId),
      ]
      conversationsRef.current = nextConversations
      setConversations(nextConversations)

      pendingSaveRef.current = { conversationId, messages: next }
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null
        void persistPendingSave()
      }, SAVE_DEBOUNCE_MS)
    },
    [persistPendingSave]
  )

  const setActiveConversation = useCallback((id: string | null) => {
    activeIdRef.current = id
    setActiveId(id)
  }, [])

  const updateMessages = useCallback(
    (updater: MessageStateUpdater) => {
      // The first message of a fresh visit opens a conversation of its own.
      let conversationId = activeIdRef.current
      if (!conversationId) {
        conversationId = createUuid()
        skipLoadForIdRef.current = conversationId
        setActiveConversation(conversationId)
      }
      const targetId = conversationId
      setMessages((previous) => {
        const next = applyMessageStateUpdate(previous, updater)
        messagesRef.current = next
        scheduleSave(targetId, next)
        return next
      })
    },
    [scheduleSave, setActiveConversation]
  )

  // Load the conversation list once, then open the most recent conversation.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await listStudioConversations().catch(() => [])
      if (cancelled) return
      conversationsRef.current = stored
      setConversations(stored)
      setActiveConversation(stored[0]?.id ?? null)
      if (!stored[0]) setIsLoadingMessages(false)
    })()
    return () => {
      cancelled = true
    }
  }, [setActiveConversation])

  // Load the messages of the active conversation.
  useEffect(() => {
    if (!activeId) {
      messagesRef.current = []
      setMessages([])
      return
    }
    if (skipLoadForIdRef.current === activeId) {
      skipLoadForIdRef.current = null
      setIsLoadingMessages(false)
      return
    }
    let cancelled = false
    setIsLoadingMessages(true)
    void (async () => {
      const stored = await listStudioMessages(activeId).catch(() => [])
      if (cancelled) return
      messagesRef.current = stored
      setMessages(stored)
      setIsLoadingMessages(false)
    })()
    return () => {
      cancelled = true
    }
  }, [activeId])

  // Records restored from a backup are written straight to IndexedDB.
  useEffect(
    () =>
      subscribeStudioDataChange(() => {
        void (async () => {
          const stored = await listStudioConversations().catch(() => [])
          conversationsRef.current = stored
          setConversations(stored)

          const currentId = activeIdRef.current
          const nextId =
            currentId && stored.some((item) => item.id === currentId)
              ? currentId
              : (stored[0]?.id ?? null)
          skipLoadForIdRef.current = null
          setActiveConversation(nextId)
          if (!nextId) {
            messagesRef.current = []
            setMessages([])
            return
          }
          const storedMessages = await listStudioMessages(nextId).catch(
            () => []
          )
          messagesRef.current = storedMessages
          setMessages(storedMessages)
          setIsLoadingMessages(false)
        })()
      }),
    [setActiveConversation]
  )

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        void persistPendingSave()
      }
    },
    [persistPendingSave]
  )

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled: STUDIO_PARAMETER_ENABLED,
    onMessageUpdate: updateMessages,
  })

  /**
   * Marks the current end of the conversation as a context boundary: earlier
   * messages stay visible but are no longer sent to the model.
   */
  const clearContext = useCallback(() => {
    const conversationId = activeIdRef.current
    if (!conversationId) return

    const current = messagesRef.current
    const lastIndex = current.length - 1
    if (lastIndex < 0 || current[lastIndex].contextBoundary) return

    // The pending debounce would write the previous messages, so drop it.
    pendingSaveRef.current = null
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const next = current.map((message, index) =>
      index === lastIndex ? { ...message, contextBoundary: true } : message
    )
    messagesRef.current = next
    setMessages(next)
    void saveStudioMessages(conversationId, next)
  }, [])

  const startConversation = useCallback(() => {
    const active = conversationsRef.current.find((item) => item.id === activeId)
    const activeMessages = messagesRef.current
    if (active && activeMessages.length === 0) return

    const id = createUuid()
    skipLoadForIdRef.current = id
    setActiveConversation(id)
    messagesRef.current = []
    setMessages([])
  }, [activeId, setActiveConversation])

  const selectConversation = useCallback(
    (id: string) => {
      void persistPendingSave()
      setActiveConversation(id)
    },
    [persistPendingSave, setActiveConversation]
  )

  const renameConversation = useCallback(async (id: string, title: string) => {
    const existing = conversationsRef.current.find((item) => item.id === id)
    if (!existing || !title.trim()) return
    const record = { ...existing, title: title.trim() }
    conversationsRef.current = conversationsRef.current.map((item) =>
      item.id === id ? record : item
    )
    setConversations(conversationsRef.current)
    await saveStudioConversation(record)
  }, [])

  const toggleConversationStar = useCallback(async (id: string) => {
    const existing = conversationsRef.current.find((item) => item.id === id)
    if (!existing) return
    const record = { ...existing, starred: !existing.starred }
    conversationsRef.current = conversationsRef.current.map((item) =>
      item.id === id ? record : item
    )
    setConversations(conversationsRef.current)
    await saveStudioConversation(record)
  }, [])

  const deleteConversation = useCallback(
    async (id: string) => {
      if (pendingSaveRef.current?.conversationId === id) {
        pendingSaveRef.current = null
      }
      await removeStudioConversation(id)
      const next = conversationsRef.current.filter((item) => item.id !== id)
      conversationsRef.current = next
      setConversations(next)
      if (activeIdRef.current === id) setActiveConversation(next[0]?.id ?? null)
    },
    [setActiveConversation]
  )

  const clearHistory = useCallback(async () => {
    const removedId = activeIdRef.current
    await persistPendingSave()
    await clearStudioConversations()
    const next = conversationsRef.current.filter((item) => item.starred)
    conversationsRef.current = next
    setConversations(next)
    if (removedId && !next.some((item) => item.id === removedId)) {
      setActiveConversation(next[0]?.id ?? null)
    }
  }, [persistPendingSave, setActiveConversation])

  const updateConfig = useCallback(
    <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => {
      setConfig((previous) => {
        const updated = { ...previous, [key]: value }
        saveConfig(updated)
        return updated
      })
    },
    []
  )

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId]
  )

  return {
    conversations,
    activeConversation,
    activeId,
    messages,
    isLoadingMessages,
    config,
    parameterEnabled: STUDIO_PARAMETER_ENABLED,
    sendChat,
    stopGeneration,
    isGenerating,
    updateMessages,
    clearContext,
    updateConfig,
    startConversation,
    selectConversation,
    renameConversation,
    toggleConversationStar,
    deleteConversation,
    clearHistory,
  }
}
