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
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  StarOff,
  Trash,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popconfirm } from '@/components/ui/popconfirm'
import { cn } from '@/lib/utils'

import {
  groupStudioConversations,
  type StudioConversation,
} from '../lib/studio-conversations'

type StudioChatSidebarProps = {
  conversations: StudioConversation[]
  activeId: string | null
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  onRenameConversation: (id: string, title: string) => void
  onToggleStar: (id: string) => void
  onDeleteConversation: (id: string) => void
  onClearHistory: () => void
}

/** Conversation list of the studio chat, mirroring the reference sidebar. */
export function StudioChatSidebar(
  props: StudioChatSidebarProps & {
    open: boolean
  }
) {
  return (
    <div className='relative hidden md:block' data-open={props.open}>
      {/* Layout gap: the sidebar itself floats over the page while open. */}
      <div
        className={cn(
          'relative transition-[width] duration-200 ease-linear',
          props.open ? 'w-64' : 'w-0'
        )}
      />
      <div
        className={cn(
          'fixed top-16 bottom-0 z-20 flex w-64 flex-col border-r border-border/50 bg-muted/30 transition-transform duration-200 ease-linear',
          !props.open && '-translate-x-full'
        )}
      >
        <StudioChatSidebarBody {...props} />
      </div>
    </div>
  )
}

/** Sidebar body shared by the desktop rail and the mobile sheet. */
export function StudioChatSidebarBody(props: StudioChatSidebarProps) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState<StudioConversation | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<StudioConversation | null>(
    null
  )

  const groups = groupStudioConversations(props.conversations)

  const openRename = (conversation: StudioConversation) => {
    setRenaming(conversation)
    setRenameTitle(conversation.title)
  }

  const submitRename = () => {
    const title = renameTitle.trim()
    if (renaming && title && title !== renaming.title) {
      props.onRenameConversation(renaming.id, title)
    }
    setRenaming(null)
  }

  const confirmDelete = () => {
    if (pendingDelete) {
      props.onDeleteConversation(pendingDelete.id)
    }
    setPendingDelete(null)
  }

  return (
    <>
      <div className='flex flex-row items-center gap-1.5 p-3'>
        <Button
          variant='outline'
          className='border-border/40 grow justify-start gap-2'
          onClick={props.onNewChat}
        >
          <Plus className='size-4' />
          {t('New chat')}
        </Button>
        <Popconfirm
          title={t('Clear chat history?')}
          description={t('All unstarred chats will be cleared.')}
          destructive
          onConfirm={props.onClearHistory}
        >
          <Button
            variant='outline'
            className='border-border/40 justify-start'
            title={t('Clear chat history')}
          >
            <Trash className='text-muted-foreground size-4' />
          </Button>
        </Popconfirm>
      </div>

      <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto'>
        {groups.map((group) => (
          <div
            key={group.key}
            className='relative flex w-full min-w-0 flex-col p-2 py-1'
          >
            <div className='text-sidebar-foreground/70 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium'>
              {t(group.labelKey)}
            </div>
            <ul className='flex w-full min-w-0 flex-col gap-1'>
              {group.conversations.map((conversation) => {
                const isActive = conversation.id === props.activeId
                return (
                  <li
                    key={conversation.id}
                    className='group/menu-item relative'
                  >
                    <button
                      type='button'
                      title={conversation.title}
                      data-active={isActive ? '' : undefined}
                      className={cn(
                        'peer/menu-button group/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] select-none',
                        'group-has-data-[sidebar=menu-action]/menu-item:pr-8',
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-hidden',
                        'data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground'
                      )}
                      onClick={() =>
                        props.onSelectConversation(conversation.id)
                      }
                    >
                      <span className='truncate'>{conversation.title}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type='button'
                            title={t('More')}
                            data-sidebar='menu-action'
                            className={cn(
                              'text-sidebar-foreground ring-sidebar-ring absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-opacity',
                              'hover:bg-muted hover:text-sidebar-foreground focus-visible:ring-2',
                              'md:opacity-0 md:group-hover/menu-item:opacity-100 md:group-focus-within/menu-item:opacity-100',
                              'aria-expanded:opacity-100'
                            )}
                          />
                        }
                      >
                        <MoreHorizontal className='size-4' />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side='right' align='start'>
                        <DropdownMenuItem
                          onClick={() => props.onToggleStar(conversation.id)}
                        >
                          {conversation.starred ? <StarOff /> : <Star />}
                          {conversation.starred ? t('Unstar') : t('Star')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openRename(conversation)}
                        >
                          <Pencil />
                          {t('Rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPendingDelete(conversation)}
                        >
                          <Trash2 />
                          {t('Delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {props.conversations.length === 0 && (
          <div className='text-muted-foreground px-4 py-8 text-center text-sm'>
            {t('No chats yet')}
          </div>
        )}
      </div>

      <div className='mt-auto flex flex-col gap-2 p-3'>
        <div className='border-border/60 bg-card text-muted-foreground rounded-lg border p-3 text-xs leading-relaxed'>
          {t(
            'For your privacy, chat history is stored only in this browser. Use the icon in the upper-right corner to back it up to your OSS bucket.'
          )}
        </div>
      </div>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title={t('Rename chat')}
        contentClassName='sm:max-w-sm'
        footer={
          <>
            <Button variant='outline' onClick={() => setRenaming(null)}>
              {t('Cancel')}
            </Button>
            <Button onClick={submitRename} disabled={!renameTitle.trim()}>
              {t('Save')}
            </Button>
          </>
        }
      >
        <Input
          value={renameTitle}
          maxLength={60}
          autoFocus
          onChange={(event) => setRenameTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
            event.preventDefault()
            submitRename()
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('Delete chat?')}
        desc={t(
          '"{{title}}" and all of its messages will be permanently deleted.',
          { title: pendingDelete?.title ?? '' }
        )}
        confirmText={t('Delete')}
        destructive
        handleConfirm={confirmDelete}
      />
    </>
  )
}
