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
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { handleServerError } from '@/lib/handle-server-error'

import { uploadTicketAttachment } from './api'

export const TICKET_UPLOAD_ACCEPT =
  '.png,.jpg,.jpeg,.gif,.webp,.bmp,.avif,.pdf,.doc,.docx'

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|avif)$/i
const ALLOWED_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|avif|pdf|docx?)$/i

/**
 * Shared behaviour of the ticket composers (create dialog and reply box):
 * insert a fenced code block at the caret and upload dropped or pasted files
 * as markdown media links.
 */
export function useTicketComposer(
  value: string,
  onChange: (next: string) => void
) {
  const { t } = useTranslation()
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const insertAtCursor = (snippet: string, caretOffset?: number) => {
    const textarea = textRef.current
    if (!textarea) {
      onChange(value + snippet)
      return
    }
    const start = textarea.selectionStart ?? value.length
    const end = textarea.selectionEnd ?? value.length
    onChange(value.slice(0, start) + snippet + value.slice(end))
    const caret = start + (caretOffset ?? snippet.length)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(caret, caret)
    })
  }

  const insertCodeBlock = () => {
    const prefix = value && !value.endsWith('\n') ? '\n' : ''
    insertAtCursor(`${prefix}\`\`\`\n\n\`\`\`\n`, prefix.length + 4)
  }

  const uploadFiles = async (files: File[]) => {
    const accepted = files.filter((file) => {
      if (!ALLOWED_FILE_PATTERN.test(file.name)) {
        toast.error(t('Unsupported file type'))
        return false
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(t('File is too large: {{name}}', { name: file.name }))
        return false
      }
      return true
    })
    if (accepted.length === 0) return
    setUploading(true)
    try {
      const links: string[] = []
      for (const file of accepted) {
        const attachment = await uploadTicketAttachment(file)
        const label = file.name || 'file'
        const isImage = attachment.is_image || IMAGE_FILE_PATTERN.test(label)
        links.push(
          isImage
            ? `![${label}](${attachment.url})`
            : `[${label}](${attachment.url})`
        )
      }
      const separator = value && !value.endsWith('\n') ? '\n' : ''
      insertAtCursor(`${separator}${links.join('\n')}\n`)
    } catch (error) {
      handleServerError(error, t('Failed to upload attachment'))
    } finally {
      setUploading(false)
    }
  }

  const handlePickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : []
    event.target.value = ''
    if (files.length > 0) void uploadFiles(files)
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...(event.clipboardData?.files ?? [])]
    if (files.length === 0) return
    event.preventDefault()
    void uploadFiles(files)
  }

  const openFilePicker = () => fileRef.current?.click()

  return {
    accept: TICKET_UPLOAD_ACCEPT,
    fileRef,
    handlePaste,
    handlePickFile,
    insertCodeBlock,
    openFilePicker,
    textRef,
    uploading,
  }
}
