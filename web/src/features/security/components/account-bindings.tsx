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
  CircleDot,
  KeyRound,
  Link2,
  Mail,
  MessageCircleMore,
  Send,
  Unlink,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SiGithub, SiGooglechrome, SiLinux } from 'react-icons/si'
import { toast } from 'sonner'

import { IconDiscord } from '@/assets/brand-icons'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { createOAuthAuthorization } from '@/features/auth/api'
import {
  openOAuthPopup,
  type OAuthPopupExchange,
} from '@/features/auth/lib/oauth-popup'
import { usePasskeyManagement } from '@/features/auth/passkey'
import { SecureVerificationDialog } from '@/features/auth/secure-verification'
import type { CustomOAuthProviderInfo } from '@/features/auth/types'
import { getSelfOAuthBindings, unbindCustomOAuth } from '@/features/profile/api'
import type {
  UserProfile,
  BindingItem,
  AccountSecurityResult,
} from '@/features/profile/types'
import { useDialogs } from '@/hooks/use-dialog'
import { useStatus } from '@/hooks/use-status'
import { api } from '@/lib/api'
import {
  buildOAuthAuthorizationUrl,
  indexCustomOAuthBindings,
  type CustomOAuthBinding,
} from '@/lib/oauth'
import {
  AuthOperationError,
  authRequestOptions,
  authResult,
} from '@/lib/secure-verification'

import { useAccountSecurity } from '../hooks/use-account-security'
import { EmailBindDialog } from './dialogs/email-bind-dialog'
import { WeChatBindDialog } from './dialogs/wechat-bind-dialog'

// ============================================================================
// Account Bindings Tab Component
// ============================================================================

interface AccountBindingsProps {
  profile: UserProfile | null
  onUpdate: () => void
}

type DialogKey = 'email' | 'wechat'

type PreparedOAuthBinding = AccountSecurityResult & {
  provider: string
  state: string
  url: string
}

export function AccountBindings({ profile, onUpdate }: AccountBindingsProps) {
  const { t } = useTranslation()
  const dialogs = useDialogs<DialogKey>()
  const { status, loading } = useStatus()
  const [customBindings, setCustomBindings] = useState<CustomOAuthBinding[]>([])
  const [unbindTarget, setUnbindTarget] = useState<CustomOAuthBinding | null>(
    null
  )
  const security = useAccountSecurity()
  const passkey = usePasskeyManagement()
  const unbinding = security.pending
  const [preparedBinding, setPreparedBinding] =
    useState<PreparedOAuthBinding | null>(null)
  const bindingsLocked =
    security.pending ||
    passkey.registering ||
    Boolean(preparedBinding) ||
    dialogs.hasAnyOpen

  const customProviders = status?.custom_oauth_providers as
    | CustomOAuthProviderInfo[]
    | undefined
  const customBindingsByProviderId = useMemo(
    () => indexCustomOAuthBindings(customBindings),
    [customBindings]
  )

  const fetchCustomBindings = useCallback(async () => {
    if (!customProviders || customProviders.length === 0) return
    try {
      const res = await getSelfOAuthBindings()
      if (res.success && res.data) {
        setCustomBindings(res.data)
      }
    } catch {
      // ignore
    }
  }, [customProviders])

  useEffect(() => {
    fetchCustomBindings()
  }, [fetchCustomBindings])

  const handleUnbindCustom = async () => {
    if (!unbindTarget) return
    const target = unbindTarget
    setUnbindTarget(null)
    const result = await security.run(async (signal) => {
      const proof = await security.verify(
        {
          scope: 'account.binding.unbind',
          context: { provider_id: target.provider_id },
        },
        signal
      )
      return unbindCustomOAuth(target.provider_id, proof, signal)
    })
    if (result) {
      toast.success(
        t('Unbound {{provider}}', { provider: target.provider_name })
      )
      await fetchCustomBindings()
      onUpdate()
    }
  }

  const startOAuthBinding = async (provider: string) => {
    const prepared = await security.run(async (signal) => {
      const proof = await security.verify(
        { scope: 'account.binding.bind', context: { provider } },
        signal
      )
      const authorization = await createOAuthAuthorization(
        provider,
        'bind',
        undefined,
        signal,
        proof
      )
      return {
        provider,
        state: authorization.state,
        url:
          authorization.authorizationUrl ??
          buildOAuthAuthorizationUrl(
            provider,
            authorization.state,
            status ?? {}
          ),
        notification_warning: false,
      }
    })
    if (prepared) setPreparedBinding(prepared)
  }

  // A separate user click opens the provider popup. Opening it after an async
  // verification response would otherwise be blocked by browsers such as Safari.
  const completeOAuthBinding = async () => {
    if (!preparedBinding) return
    const prepared = preparedBinding
    setPreparedBinding(null)
    const result = await security.run(async (signal) => {
      let exchange: OAuthPopupExchange | undefined
      try {
        exchange = await openOAuthPopup({
          provider: prepared.provider,
          intent: 'bind',
          signal,
          prepare: async () => ({ state: prepared.state, url: prepared.url }),
        })
        const callback = exchange.callback
        const outcome = await authResult<AccountSecurityResult>(
          api.get(`/api/oauth/${prepared.provider}`, {
            ...authRequestOptions,
            singleUseAuthorization: true,
            disableDuplicate: true,
            signal: exchange.signal,
            params: {
              state: callback.state,
              code: callback.code,
              error: callback.error,
              error_description: callback.errorDescription,
            },
          })
        )
        exchange.signal.throwIfAborted()
        exchange.finish({ success: true })
        return outcome
      } catch (error) {
        const failure = AuthOperationError.from(
          exchange?.signal.aborted ? exchange.signal.reason : error
        )
        exchange?.finish({ success: false, message: failure.message })
        throw failure
      }
    })
    if (result) {
      toast.success(t('Binding successful!'))
      onUpdate()
      await fetchCustomBindings()
    }
  }

  const handleBindCustomOAuth = (provider: CustomOAuthProviderInfo) =>
    startOAuthBinding(provider.slug)

  const handlePasskeyBind = async () => {
    const result = await security.run(async (signal) => {
      const proofToken = await security.verify(
        { scope: 'passkey.register' },
        signal
      )
      await passkey.register(proofToken)
      return { notification_warning: false }
    })
    if (result) {
      toast.success(t('Passkey registered successfully'))
      onUpdate()
    }
  }

  const closeDialogs = dialogs.closeAll
  useEffect(() => {
    setPreparedBinding(null)
    setUnbindTarget(null)
    closeDialogs()
  }, [security.sessionKey, closeDialogs])

  if (!profile || !status || loading) return null

  const githubId = (profile as unknown as Record<string, unknown>).github_id as
    | string
    | undefined
  const discordId = (profile as unknown as Record<string, unknown>)
    .discord_id as string | undefined
  const oidcId = (profile as unknown as Record<string, unknown>).oidc_id as
    | string
    | undefined
  const wechatId = (profile as unknown as Record<string, unknown>).wechat_id as
    | string
    | undefined
  const telegramId = (profile as unknown as Record<string, unknown>)
    .telegram_id as string | undefined
  const linuxDoId = (profile as unknown as Record<string, unknown>)
    .linux_do_id as string | undefined

  const googleProvider = customProviders?.find(
    (provider) =>
      provider.slug.toLowerCase() === 'google' ||
      provider.name.trim().toLowerCase() === 'google'
  )
  const googleBinding = googleProvider
    ? customBindingsByProviderId.get(googleProvider.id)
    : undefined

  // The reference site only surfaces the providers it supports. Ours keeps the
  // same core list and reveals the extra channels once an administrator enables
  // them or the account is already linked to one.
  const bindings: BindingItem[] = [
    {
      id: 'email',
      label: t('Bind Email'),
      icon: Mail,
      value: profile.email,
      isBound: Boolean(profile.email),
      isEnabled: true,
      onBind: () => dialogs.open('email'),
    },
    {
      id: 'github',
      label: t('GitHub'),
      icon: SiGithub,
      value: githubId,
      isBound: Boolean(githubId),
      isEnabled: status?.github_oauth || false,
      onBind: () => void startOAuthBinding('github'),
    },
    {
      id: 'google',
      label: t('Google'),
      icon: SiGooglechrome,
      value: googleBinding?.provider_user_id,
      isBound: Boolean(googleBinding),
      isEnabled: Boolean(googleProvider),
      onBind: () => {
        if (googleProvider) void handleBindCustomOAuth(googleProvider)
      },
    },
    {
      id: 'oidc',
      label: t('OIDC'),
      icon: CircleDot,
      value: oidcId,
      isBound: Boolean(oidcId),
      isEnabled: status?.oidc_enabled || false,
      onBind: () => void startOAuthBinding('oidc'),
    },
    {
      id: 'wechat',
      label: t('WeChat'),
      icon: MessageCircleMore,
      value: wechatId,
      isBound: Boolean(wechatId),
      isEnabled: status?.wechat_login || false,
      onBind: () => dialogs.open('wechat'),
    },
    {
      id: 'passkey',
      label: t('Passkey'),
      icon: KeyRound,
      value: passkey.enabled
        ? t('Bound')
        : t('Not bound — bind to enable passwordless sign-in'),
      isBound: passkey.enabled,
      isEnabled: Boolean(status?.passkey_login) && passkey.supported,
      onBind: () => void handlePasskeyBind(),
    },
  ]

  if (status?.discord_oauth || discordId) {
    bindings.push({
      id: 'discord',
      label: t('Discord'),
      icon: IconDiscord,
      value: discordId,
      isBound: Boolean(discordId),
      isEnabled: status?.discord_oauth || false,
      onBind: () => void startOAuthBinding('discord'),
    })
  }
  if (status?.telegram_oauth || telegramId) {
    bindings.push({
      id: 'telegram',
      label: t('Telegram'),
      icon: Send,
      value: telegramId,
      isBound: Boolean(telegramId),
      isEnabled: status?.telegram_oauth || false,
      onBind: () => void startOAuthBinding('telegram'),
    })
  }
  if (status?.linuxdo_oauth || linuxDoId) {
    bindings.push({
      id: 'linuxdo',
      label: t('LinuxDO'),
      icon: SiLinux as React.ComponentType<{ className?: string }>,
      value: linuxDoId,
      isBound: Boolean(linuxDoId),
      isEnabled: status?.linuxdo_oauth || false,
      onBind: () => void startOAuthBinding('linuxdo'),
    })
  }

  return (
    <>
      <ul
        aria-label={t('Account Bindings')}
        className='grid grid-cols-1 gap-4 sm:grid-cols-2'
      >
        {bindings.map((binding) => {
          const googleUnbindTarget =
            binding.id === 'google' && binding.isBound
              ? googleBinding
              : undefined
          let actionLabel = t('Bind')
          if (!binding.isEnabled) {
            actionLabel = t('Not enabled')
          } else if (binding.isBound && binding.id !== 'email') {
            actionLabel = t('Bound')
          }

          return (
            <li
              key={binding.id}
              className='hover:from-foreground/4 border-border/40 flex min-w-0 items-center gap-3 rounded-xl border bg-linear-to-br via-transparent to-transparent p-4 transition duration-300'
            >
              <div className='border-border/40 bg-background/60 flex size-10 shrink-0 items-center justify-center rounded-lg border'>
                <binding.icon className='text-foreground/70 size-5' />
              </div>
              <div className='min-w-0 flex-1'>
                <div className='text-sm font-medium'>{binding.label}</div>
                <div
                  className='text-muted-foreground truncate text-xs'
                  title={binding.value || undefined}
                >
                  {binding.value || t('Not bound')}
                </div>
              </div>
              {googleUnbindTarget ? (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive shrink-0'
                  onClick={() => setUnbindTarget(googleUnbindTarget)}
                  disabled={bindingsLocked}
                >
                  <Unlink className='mr-1 h-3 w-3' />
                  {t('Unbind')}
                </Button>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  className='border-border/60 shrink-0'
                  onClick={binding.onBind}
                  disabled={
                    !binding.isEnabled ||
                    bindingsLocked ||
                    (binding.isBound && binding.id !== 'email')
                  }
                >
                  {actionLabel}
                </Button>
              )}
            </li>
          )
        })}
        {customProviders
          ?.filter((provider) => provider.id !== googleProvider?.id)
          .map((provider) => {
            const binding = customBindingsByProviderId.get(provider.id)
            const isBound = !!binding
            return (
              <li
                key={provider.id}
                className='hover:from-foreground/4 border-border/40 flex min-w-0 items-center gap-3 rounded-xl border bg-linear-to-br via-transparent to-transparent p-4 transition duration-300'
              >
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                  <div className='border-border/40 bg-background/60 flex size-10 shrink-0 items-center justify-center rounded-lg border'>
                    <Link2 className='text-foreground/70 size-5' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5'>
                      <p
                        className='truncate text-sm font-medium'
                        title={provider.name}
                      >
                        {provider.name}
                      </p>
                      {isBound && (
                        <StatusBadge
                          label={t('Bound')}
                          variant='success'
                          copyable={false}
                        />
                      )}
                    </div>
                    <p className='text-muted-foreground truncate text-xs'>
                      {isBound
                        ? binding?.provider_user_id || t('Bound')
                        : t('Not bound')}
                    </p>
                  </div>
                </div>
                {isBound ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-destructive shrink-0'
                    onClick={() => setUnbindTarget(binding)}
                    disabled={bindingsLocked}
                  >
                    <Unlink className='mr-1 h-3 w-3' />
                    {t('Unbind')}
                  </Button>
                ) : (
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-border/60 shrink-0'
                    onClick={() => void handleBindCustomOAuth(provider)}
                    disabled={bindingsLocked}
                  >
                    {t('Bind')}
                  </Button>
                )}
              </li>
            )
          })}
      </ul>

      {security.showVerification && (
        <SecureVerificationDialog {...security.verificationDialogProps} />
      )}
      <ConfirmDialog
        open={preparedBinding !== null}
        onOpenChange={(open) => {
          if (!open) setPreparedBinding(null)
        }}
        title={t('Continue account binding')}
        desc={t(
          'Your identity has been verified. Continue to the provider to finish linking your account.'
        )}
        handleConfirm={() => void completeOAuthBinding()}
        confirmText={t('Continue')}
      />
      {/* Custom OAuth Unbind Confirmation */}
      <ConfirmDialog
        open={!!unbindTarget}
        onOpenChange={(open) => !open && setUnbindTarget(null)}
        title={t('Confirm Unbind')}
        desc={t(
          'Are you sure you want to unbind {{provider}}? You will no longer be able to log in via this method.',
          {
            provider: unbindTarget?.provider_name || '',
          }
        )}
        confirmText={t('Confirm Unbind')}
        destructive
        handleConfirm={handleUnbindCustom}
        isLoading={unbinding}
      />

      {/* Email Bind Dialog */}
      <EmailBindDialog
        open={dialogs.isOpen('email')}
        onOpenChange={(open) =>
          open ? dialogs.open('email') : dialogs.close('email')
        }
        currentEmail={profile.email}
        onSuccess={onUpdate}
      />

      {/* WeChat Bind Dialog */}
      <WeChatBindDialog
        open={dialogs.isOpen('wechat')}
        qrCodeUrl={
          typeof status?.wechat_qrcode === 'string' ? status.wechat_qrcode : ''
        }
        onOpenChange={(open) =>
          open ? dialogs.open('wechat') : dialogs.close('wechat')
        }
        onSuccess={onUpdate}
      />
    </>
  )
}
