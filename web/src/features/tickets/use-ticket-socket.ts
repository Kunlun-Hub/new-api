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
import { useEffect, useRef } from 'react'

import { useAuthStore } from '@/stores/auth-store'

export const TICKET_SOCKET_PROTOCOL = 'newapi.ws.v1'

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 15000

export interface TicketSocketEvent {
  type: string
  ticket_id: number
  user_id: number
  data?: unknown
}

/**
 * Subscribe to live support-ticket events.
 *
 * Browsers cannot attach an Authorization header to a WebSocket handshake, so
 * the access token is sent as the second requested subprotocol; the backend
 * reads it there and runs the ordinary dashboard authentication.
 */
export function useTicketSocket(
  admin: boolean,
  onEvent: (event: TicketSocketEvent) => void
): void {
  const token = useAuthStore((state) => state.auth.accessToken)
  const handlerRef = useRef(onEvent)

  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!token) return

    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let attempts = 0
    let disposed = false

    const connect = () => {
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const path = admin ? '/api/ticket/admin/ws' : '/api/ticket/ws'
      socket = new WebSocket(`${scheme}://${window.location.host}${path}`, [
        TICKET_SOCKET_PROTOCOL,
        token,
      ])

      socket.addEventListener('open', () => {
        attempts = 0
      })
      socket.addEventListener('message', (message) => {
        try {
          handlerRef.current(JSON.parse(message.data) as TicketSocketEvent)
        } catch {
          // Ignore frames that are not ticket events.
        }
      })
      socket.addEventListener('close', () => {
        if (disposed) return
        attempts += 1
        const delay = Math.min(
          RECONNECT_MAX_MS,
          RECONNECT_BASE_MS * 2 ** Math.min(attempts, 4)
        )
        reconnectTimer = window.setTimeout(connect, delay)
      })
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
    }
  }, [admin, token])
}
