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
import { describe, expect, it } from 'vitest'

import type { Message } from '../../../types'
import { formatMessageForAPI } from '../message-utils'

function userMessage(attachments: Message['attachments']): Message {
  return {
    key: 'message-1',
    from: 'user',
    versions: [{ id: 'version-1', content: 'describe this' }],
    attachments,
  }
}

describe('formatMessageForAPI attachments', () => {
  it('sends images inline and other files as URLs', () => {
    const payload = formatMessageForAPI(
      userMessage([
        {
          id: 'attachment-1',
          name: 'shot.png',
          url: 'https://files.example.com/shot.png',
          isImage: true,
        },
        {
          id: 'attachment-2',
          name: 'report.pdf',
          url: 'https://files.example.com/report.pdf',
          isImage: false,
        },
      ])
    )

    expect(payload.content).toEqual([
      { type: 'text', text: 'describe this' },
      {
        type: 'image_url',
        image_url: { url: 'https://files.example.com/shot.png' },
      },
      {
        type: 'file',
        file: {
          filename: 'report.pdf',
          file_data: 'https://files.example.com/report.pdf',
        },
      },
    ])
  })

  it('keeps attachments that are still uploading out of the request', () => {
    const payload = formatMessageForAPI(
      userMessage([
        {
          id: 'attachment-1',
          name: 'pending.txt',
          url: '',
          isImage: false,
          status: 'uploading',
        },
      ])
    )

    expect(payload.content).toBe('describe this')
  })

  it('keeps plain text messages unchanged', () => {
    const payload = formatMessageForAPI(userMessage([]))
    expect(payload.content).toBe('describe this')
  })
})
