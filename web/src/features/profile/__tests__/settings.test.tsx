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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { updateUserSettings } from '../api'
import { NotificationTab } from '../components/tabs/notification-tab'
import type { UserProfile } from '../types'

const profile: UserProfile = {
  id: 1,
  username: 'alice',
  display_name: 'Alice',
  role: 1,
  group: 'default',
  quota: 1000000,
  used_quota: 0,
  request_count: 0,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 0,
}
const settings = {
  notify_type: 'webhook',
  quota_warning_threshold: 1200,
  notification_email: '',
  webhook_url: 'https://example.com/notify',
  webhook_secret: 'webhook-secret',
  bark_url: '',
  gotify_url: '',
  gotify_token: '',
  gotify_priority: 5,
  accept_unset_model_ratio_model: true,
  record_ip_log: true,
  upstream_model_update_notify_enabled: true,
  wecom_url: '',
  dingtalk_url: '',
  feishu_url: '',
  telegram_bot_token: '',
  telegram_chat_id: '',
  subscribe_quota_insufficient: true,
  subscribe_discount: true,
  subscribe_keepalive: true,
  subscribe_system_notice: false,
  subscribe_model_price_change: true,
}

function renderNotificationTab(profile: UserProfile, onUpdate = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <NotificationTab profile={profile} onUpdate={onUpdate} />
    </QueryClientProvider>
  )
  return onUpdate
}

afterEach(() => vi.restoreAllMocks())

describe('user settings saves across profile and security', () => {
  it('disabling IP recording sends the latest complete notification settings', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(settings) },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    await updateUserSettings({ record_ip_log: false })
    expect(get).toHaveBeenCalledWith('/api/user/self')
    expect(put).toHaveBeenCalledWith('/api/user/setting', {
      ...settings,
      record_ip_log: false,
    })
  })

  it('saving IP recording for a user with no settings supplies the existing defaults', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: profile },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    await updateUserSettings({ record_ip_log: true })
    expect(put).toHaveBeenCalledWith('/api/user/setting', {
      notify_type: 'email',
      quota_warning_threshold: 500000,
      notification_email: '',
      webhook_url: '',
      webhook_secret: '',
      bark_url: '',
      gotify_url: '',
      gotify_token: '',
      gotify_priority: 5,
      accept_unset_model_ratio_model: false,
      record_ip_log: true,
      upstream_model_update_notify_enabled: false,
      wecom_url: '',
      dingtalk_url: '',
      feishu_url: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
      subscribe_quota_insufficient: true,
      subscribe_discount: true,
      subscribe_keepalive: true,
      subscribe_system_notice: false,
      subscribe_model_price_change: true,
    })
  })

  it('alternating notification and IP saves retains the latest values from each page', async () => {
    let saved = { ...settings }
    vi.spyOn(api, 'get').mockImplementation(async () => ({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(saved) },
      },
    }))
    vi.spyOn(api, 'put').mockImplementation(async (_url, body) => {
      saved = body as typeof settings
      return { data: { success: true } }
    })
    await updateUserSettings({ record_ip_log: false })
    await updateUserSettings({ quota_warning_threshold: 2500 })
    await updateUserSettings({ record_ip_log: true })
    expect(saved).toEqual({
      ...settings,
      quota_warning_threshold: 2500,
      record_ip_log: true,
    })
  })

  it('a rejected profile read prevents the settings write', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('offline'))
    const put = vi.spyOn(api, 'put')
    await expect(updateUserSettings({ record_ip_log: false })).rejects.toThrow(
      'offline'
    )
    expect(put).not.toHaveBeenCalled()
  })

  it('an unsuccessful profile response prevents the settings write', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: false, message: 'Unavailable' },
    })
    const put = vi.spyOn(api, 'put')
    expect(await updateUserSettings({ record_ip_log: false })).toEqual({
      success: false,
      message: 'Unavailable',
    })
    expect(put).not.toHaveBeenCalled()
  })

  it('an unsuccessful settings write is returned to the caller', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: profile },
    })
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: false, message: 'Save failed' },
    })
    expect(await updateUserSettings({ record_ip_log: true })).toEqual({
      success: false,
      message: 'Save failed',
    })
  })

  it('saving a stale notification form keeps the current IP setting and the alert amount the user typed', async () => {
    const onUpdate = vi.fn()
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          ...profile,
          setting: JSON.stringify({ ...settings, record_ip_log: false }),
        },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    renderNotificationTab(
      { ...profile, setting: JSON.stringify(settings) },
      onUpdate
    )
    expect(
      screen.queryByRole('switch', { name: 'Record IP Address' })
    ).not.toBeInTheDocument()

    // The stored threshold is quota units; the field shows the configured
    // currency amount the user actually reasons about.
    const thresholdInput = screen.getByRole('spinbutton', {
      name: 'Quota Warning Threshold',
    })
    fireEvent.change(thresholdInput, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/api/user/setting', {
      ...settings,
      quota_warning_threshold: 1000000,
      record_ip_log: false,
    })
  })

  it('unsubscribing an event is persisted with the rest of the form', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(settings) },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    renderNotificationTab({
      ...profile,
      setting: JSON.stringify(settings),
    })

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'System announcement notice' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0][1]).toMatchObject({
      subscribe_system_notice: true,
      subscribe_quota_insufficient: true,
    })
  })

  it('a robot channel webhook URL typed in the form is saved with the settings', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(settings) },
      },
    })
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    renderNotificationTab({
      ...profile,
      setting: JSON.stringify({ ...settings, wecom_url: '' }),
    })

    fireEvent.click(screen.getByRole('radio', { name: 'WeCom' }))
    fireEvent.change(screen.getByLabelText('WebHook URL'), {
      target: {
        value: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0][1]).toMatchObject({
      notify_type: 'wecom',
      wecom_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc',
    })
  })

  it('a warning amount of zero is rejected before the request', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...profile, setting: JSON.stringify(settings) },
      },
    })
    const put = vi.spyOn(api, 'put')
    renderNotificationTab({
      ...profile,
      setting: JSON.stringify(settings),
    })

    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Quota Warning Threshold' }),
      { target: { value: '0' } }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save' })).toBeInTheDocument()
    )
    expect(put).not.toHaveBeenCalled()
  })
})
