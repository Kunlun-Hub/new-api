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

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileProps {
  siteKey: string
  action: string
  onVerify: (token: string) => void
  onExpire?: () => void
  className?: string
}

export function Turnstile({
  siteKey,
  action,
  onVerify,
  onExpire,
  className,
}: TurnstileProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const callbacksRef = useRef({ onVerify, onExpire })

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire }
  }, [onVerify, onExpire])

  useEffect(() => {
    let cancelled = false

    const render = () => {
      const container = ref.current
      const turnstile = window.turnstile
      if (cancelled || !container || !turnstile || widgetIdRef.current) return

      try {
        const widgetId = turnstile.render(container, {
          sitekey: siteKey,
          action,
          callback: (token: string) => {
            if (!cancelled) callbacksRef.current.onVerify(token)
          },
          'error-callback': () => {
            if (!cancelled) callbacksRef.current.onExpire?.()
          },
          'expired-callback': () => {
            if (!cancelled) callbacksRef.current.onExpire?.()
          },
        })
        if (cancelled) {
          turnstile.remove(widgetId)
          return
        }
        widgetIdRef.current = widgetId
      } catch {
        if (!cancelled) callbacksRef.current.onExpire?.()
      }
    }

    const handleError = () => {
      if (!cancelled) callbacksRef.current.onExpire?.()
    }

    let script: HTMLScriptElement | null = null
    if (window.turnstile) {
      render()
    } else {
      const scriptId = 'cf-turnstile'
      script = document.querySelector<HTMLScriptElement>(`#${scriptId}`)
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render, { once: true })
      script.addEventListener('error', handleError, { once: true })
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', render)
      script?.removeEventListener('error', handleError)

      const widgetId = widgetIdRef.current
      widgetIdRef.current = null
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          /* The widget may already have been removed by the browser. */
        }
      }
    }
  }, [siteKey, action])

  return <div ref={ref} className={className} />
}
