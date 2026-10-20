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
import { act, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { Turnstile } from '../turnstile'

afterEach(() => {
  delete window.turnstile
  document.querySelector('#cf-turnstile')?.remove()
})

test('binds the action, keeps callbacks current, and removes its widget', () => {
  const onVerify = vi.fn()
  const onVerifyNext = vi.fn()
  const renderWidget = vi.fn(
    (_element: HTMLElement, _options: Record<string, unknown>) => 'widget-1'
  )
  const removeWidget = vi.fn()
  window.turnstile = { render: renderWidget, remove: removeWidget }

  const { rerender, unmount } = render(
    <Turnstile
      siteKey='0x4AAAAAAFcg0kYqSMG8iS1o'
      action='login'
      onVerify={onVerify}
    />
  )

  expect(renderWidget).toHaveBeenCalledTimes(1)
  const options = renderWidget.mock.calls[0][1]
  expect(options).toMatchObject({
    sitekey: '0x4AAAAAAFcg0kYqSMG8iS1o',
    action: 'login',
  })

  act(() => {
    ;(options.callback as (token: string) => void)('token-1')
  })
  expect(onVerify).toHaveBeenCalledWith('token-1')

  rerender(
    <Turnstile
      siteKey='0x4AAAAAAFcg0kYqSMG8iS1o'
      action='login'
      onVerify={onVerifyNext}
    />
  )
  expect(renderWidget).toHaveBeenCalledTimes(1)

  act(() => {
    ;(options.callback as (token: string) => void)('token-2')
  })
  expect(onVerifyNext).toHaveBeenCalledWith('token-2')

  unmount()
  expect(removeWidget).toHaveBeenCalledWith('widget-1')
})
