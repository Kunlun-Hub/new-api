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
import { PanelLeft, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Playground,
  type PlaygroundInputRenderProps,
  type PlaygroundState,
} from '@/features/playground'
import { StudioBackupDialog } from '@/features/studio/components/studio-backup-dialog'
import { StudioChatInput } from '@/features/studio/components/studio-chat-input'
import {
  StudioChatSidebar,
  StudioChatSidebarBody,
} from '@/features/studio/components/studio-chat-sidebar'
import { StudioGreeting } from '@/features/studio/components/studio-greeting'
import { StudioShell } from '@/features/studio/components/studio-shell'
import { useStudioChat } from '@/features/studio/hooks/use-studio-chat'
import { useStudioModelCatalog } from '@/features/studio/hooks/use-studio-model-catalog'
import { useIsMobile } from '@/hooks/use-mobile'

const SIDEBAR_STORAGE_KEY = 'studio:sidebar-open'

function readSidebarOpen(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function StudioChat() {
  const { t } = useTranslation()
  const chat = useStudioChat()
  const { catalog } = useStudioModelCatalog()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open)
      return
    }
    setSidebarOpen((open) => {
      const next = !open
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      } catch {
        // Storage can be unavailable in private modes; the state still works.
      }
      return next
    })
  }, [isMobile])

  const sidebarProps = {
    conversations: chat.conversations,
    activeId: chat.activeId,
    onNewChat: chat.startConversation,
    onSelectConversation: chat.selectConversation,
    onRenameConversation: chat.renameConversation,
    onToggleStar: chat.toggleConversationStar,
    onDeleteConversation: chat.deleteConversation,
    onClearHistory: chat.clearHistory,
  }

  const playgroundState: PlaygroundState = {
    config: chat.config,
    parameterEnabled: chat.parameterEnabled,
    messages: chat.messages,
    isLoadingMessages: chat.isLoadingMessages,
    updateMessages: chat.updateMessages,
    updateConfig: chat.updateConfig,
    clearMessages: chat.clearContext,
  }

  const renderInput = useCallback(
    (input: PlaygroundInputRenderProps) => (
      <StudioChatInput
        catalog={catalog}
        config={input.config}
        disabled={input.disabled}
        greeting={
          <StudioGreeting icon={Sparkles} question={t('how can I help?')} />
        }
        groups={input.groups}
        hasMessages={input.hasMessages}
        isGenerating={input.isGenerating}
        models={input.models}
        onClearContext={chat.clearContext}
        onConfigChange={input.onConfigChange}
        onNewTopic={chat.startConversation}
        onStop={input.onStop}
        onSubmit={input.onSubmit}
      />
    ),
    [catalog, chat.clearContext, chat.startConversation, t]
  )

  return (
    <StudioShell>
      <div className='flex min-h-0 flex-1'>
        <StudioChatSidebar open={sidebarOpen} {...sidebarProps} />

        <div className='relative flex min-h-0 min-w-0 flex-1 flex-col'>
          <Button
            variant='ghost'
            size='icon-sm'
            className='text-muted-foreground absolute top-2 left-2 z-30'
            aria-label={t('Toggle Sidebar')}
            onClick={toggleSidebar}
          >
            <PanelLeft className='size-5 md:size-4' />
          </Button>
          <StudioBackupDialog className='absolute top-2 right-2 z-30' />
          <Playground renderInput={renderInput} state={playgroundState} />
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side='left' className='bg-muted/30 w-64 p-0'>
          <SheetHeader className='sr-only'>
            <SheetTitle>{t('Chats')}</SheetTitle>
            <SheetDescription>{t('Conversation list')}</SheetDescription>
          </SheetHeader>
          <StudioChatSidebarBody {...sidebarProps} />
        </SheetContent>
      </Sheet>
    </StudioShell>
  )
}
