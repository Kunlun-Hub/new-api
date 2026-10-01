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
import { useEffect, useState, type ReactNode } from 'react'

import { PlaygroundChat } from './components/chat/playground-chat'
import { PlaygroundInput } from './components/input/playground-input'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from './hooks'
import type { MessageStateUpdater } from './lib'
import type {
  GroupOption,
  Message,
  MessageAttachment,
  ModelOption,
  ParameterEnabled,
  PlaygroundConfig,
} from './types'

/**
 * Playground state that a host surface (for example the studio chat) owns
 * itself, so conversations can be stored outside the playground.
 */
export type PlaygroundState = {
  config: PlaygroundConfig
  parameterEnabled: ParameterEnabled
  messages: Message[]
  isLoadingMessages: boolean
  updateMessages: (updater: MessageStateUpdater) => void
  updateConfig: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  /** Only needed by the default playground composer. */
  updateParameterEnabled?: (key: keyof ParameterEnabled, value: boolean) => void
  clearMessages: () => void
}

/**
 * Values handed to a host-provided composer, so a surface can render its own
 * input area while reuse of the conversation and request handling stays here.
 */
export type PlaygroundInputRenderProps = {
  config: PlaygroundConfig
  disabled: boolean
  groups: GroupOption[]
  isGenerating: boolean
  isModelLoading: boolean
  hasMessages: boolean
  models: ModelOption[]
  onClearMessages: () => void
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onGroupChange: (value: string) => void
  onModelChange: (value: string) => void
  onParameterEnabledChange: (
    key: keyof ParameterEnabled,
    value: boolean
  ) => void
  onStop: () => void
  onSubmit: (text: string, attachments?: MessageAttachment[]) => void
}

const noopParameterEnabledUpdate = () => {}

type PlaygroundProps = {
  initialModel?: string
  emptyState?: ReactNode
  state?: PlaygroundState
  renderInput?: (props: PlaygroundInputRenderProps) => ReactNode
}

export function Playground(props: PlaygroundProps) {
  if (props.state) {
    return (
      <PlaygroundSurface
        emptyState={props.emptyState}
        initialModel={props.initialModel}
        renderInput={props.renderInput}
        state={props.state}
      />
    )
  }

  return (
    <PlaygroundWithLocalState
      emptyState={props.emptyState}
      initialModel={props.initialModel}
      renderInput={props.renderInput}
    />
  )
}

/** Default playground: conversations are stored in this browser tab's storage. */
function PlaygroundWithLocalState(props: {
  initialModel?: string
  emptyState?: ReactNode
  renderInput?: (props: PlaygroundInputRenderProps) => ReactNode
}) {
  const state = usePlaygroundState()

  return (
    <PlaygroundSurface
      emptyState={props.emptyState}
      initialModel={props.initialModel}
      renderInput={props.renderInput}
      state={state}
    />
  )
}

function PlaygroundSurface(props: {
  state: PlaygroundState
  initialModel?: string
  emptyState?: ReactNode
  renderInput?: (props: PlaygroundInputRenderProps) => ReactNode
}) {
  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    updateMessages,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
  } = props.state

  const [models, setModels] = useState<ModelOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
  } = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat,
  })

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  const initialModel = props.initialModel

  useEffect(() => {
    if (initialModel && initialModel !== config.model) {
      updateConfig('model', initialModel)
    }
  }, [initialModel, config.model, updateConfig])

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: config.group,
    currentModel: config.model,
    setGroups,
    setModels,
    updateConfig,
  })

  const inputRenderProps: PlaygroundInputRenderProps = {
    config,
    disabled: isGenerating,
    groups,
    isGenerating,
    isModelLoading: isLoadingModels,
    hasMessages: messages.length > 0,
    models,
    onClearMessages: handleClearMessages,
    onConfigChange: updateConfig,
    onGroupChange: (value) => updateConfig('group', value),
    onModelChange: (value) => updateConfig('model', value),
    onParameterEnabledChange:
      updateParameterEnabled ?? noopParameterEnabledUpdate,
    onStop: stopGeneration,
    onSubmit: handleSendMessage,
  }

  // Hosts may center a custom composer together with their empty state
  if (props.renderInput && messages.length === 0 && !isLoadingMessages) {
    return (
      <div className='relative flex size-full min-h-0 flex-col overflow-hidden'>
        {props.renderInput(inputRenderProps)}
      </div>
    )
  }

  return (
    <div className='relative flex size-full min-h-0 flex-col overflow-hidden'>
      {/* Full-width scroll container: scrolling works even over side whitespace */}
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <PlaygroundChat
          emptyState={props.emptyState}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          onRegenerateMessage={handleRegenerateMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onSelectPrompt={handleSendMessage}
          isGenerating={isGenerating}
          editingKey={editingMessageKey}
          onCancelEdit={handleEditOpenChange}
          onSaveEdit={(newContent) => applyEdit(newContent, false)}
          onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
        />
      </div>

      {/* Input area: hosts may replace the composer while sharing chat state */}
      {props.renderInput ? (
        props.renderInput(inputRenderProps)
      ) : (
        <div className='mx-auto w-full max-w-4xl'>
          <PlaygroundInput
            config={config}
            disabled={isGenerating}
            groups={groups}
            groupValue={config.group}
            isGenerating={isGenerating}
            isModelLoading={isLoadingModels}
            modelValue={config.model}
            models={models}
            onGroupChange={(value) => updateConfig('group', value)}
            onConfigChange={updateConfig}
            onClearMessages={handleClearMessages}
            onModelChange={(value) => updateConfig('model', value)}
            onParameterEnabledChange={
              updateParameterEnabled ?? noopParameterEnabledUpdate
            }
            onStop={stopGeneration}
            onSubmit={handleSendMessage}
            parameterEnabled={parameterEnabled}
            hasMessages={messages.length > 0}
          />
        </div>
      )}
    </div>
  )
}
