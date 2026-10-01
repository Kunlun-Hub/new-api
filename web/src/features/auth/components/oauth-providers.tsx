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
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  IconDiscord,
  IconGithub,
  IconLinuxDo,
  IconTelegram,
  IconWeChat,
} from '@/assets/brand-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useOAuthLogin } from '../hooks/use-oauth-login'
import type { SystemStatus } from '../types'

type OAuthProvidersProps = {
  status: SystemStatus | null
  disabled?: boolean
  className?: string
  onWeChatLogin?: () => void
  isWeChatLoading?: boolean
  redirectTo?: string
  /** Hide the "Or continue with" divider (caller renders its own) */
  showDivider?: boolean
  /** Render provider buttons in a 2-column grid instead of stacked */
  buttonLayout?: 'stack' | 'grid'
  /** Extra classes applied to each provider button */
  buttonClassName?: string
  /** Render the provider name only, keeping the full label as the accessible name */
  compactLabels?: boolean
}

type ProviderButton = {
  key: string
  label: string
  name: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
}

export function OAuthProviders({
  status,
  disabled = false,
  className,
  onWeChatLogin,
  isWeChatLoading = false,
  redirectTo,
  showDivider = true,
  buttonLayout = 'stack',
  buttonClassName,
  compactLabels = false,
}: OAuthProvidersProps) {
  const { t } = useTranslation()
  const {
    isLoading,
    githubButtonText,
    githubButtonDisabled,
    handleGitHubLogin,
    handleDiscordLogin,
    handleOIDCLogin,
    handleLinuxDOLogin,
    handleTelegramLogin,
    handleCustomOAuthLogin,
  } = useOAuthLogin(status, redirectTo)

  const providerButtons: ProviderButton[] = []

  if (status?.wechat_login && onWeChatLogin) {
    providerButtons.push({
      key: 'wechat',
      name: t('WeChat'),
      label: t('Continue with WeChat'),
      onClick: onWeChatLogin,
      icon: <IconWeChat className='h-4 w-4' />,
      disabled: isWeChatLoading,
    })
  }

  if (status?.github_oauth) {
    providerButtons.push({
      key: 'github',
      name: 'GitHub',
      label: githubButtonText || t('Continue with GitHub'),
      onClick: handleGitHubLogin,
      icon: <IconGithub className='h-4 w-4' />,
      disabled: githubButtonDisabled,
    })
  }

  if (status?.discord_oauth) {
    providerButtons.push({
      key: 'discord',
      name: t('Discord'),
      label: t('Continue with Discord'),
      onClick: handleDiscordLogin,
      icon: <IconDiscord className='h-4 w-4' />,
    })
  }

  if (status?.oidc_enabled) {
    const oidcDisplayName = status.oidc_display_name?.trim() || 'OIDC'
    providerButtons.push({
      key: 'oidc',
      name: oidcDisplayName,
      label: t('Continue with {{name}}', {
        name: oidcDisplayName,
      }),
      onClick: handleOIDCLogin,
    })
  }

  if (status?.linuxdo_oauth) {
    providerButtons.push({
      key: 'linuxdo',
      name: t('LinuxDO'),
      label: t('Continue with LinuxDO'),
      onClick: handleLinuxDOLogin,
      icon: <IconLinuxDo className='h-4 w-4' />,
    })
  }

  if (status?.telegram_oauth) {
    providerButtons.push({
      key: 'telegram',
      name: t('Telegram'),
      label: t('Continue with Telegram'),
      onClick: handleTelegramLogin,
      icon: <IconTelegram data-icon='inline-start' />,
    })
  }

  // Custom OAuth providers
  const customProviders = status?.custom_oauth_providers
  if (customProviders && customProviders.length > 0) {
    for (const provider of customProviders) {
      providerButtons.push({
        key: `custom-${provider.slug}`,
        label: t('Continue with {{name}}', { name: provider.name }),
        name: provider.name,
        onClick: () => handleCustomOAuthLogin(provider),
      })
    }
  }

  if (providerButtons.length === 0) return null

  return (
    <div className={cn('space-y-3', className)}>
      {showDivider && (
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              {t('Or continue with')}
            </span>
          </div>
        </div>
      )}

      <div
        className={
          buttonLayout === 'grid'
            ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
            : 'flex flex-col gap-2'
        }
      >
        {providerButtons.map(
          ({ key, label, name, onClick, icon, disabled: extraDisabled }) => (
            <Button
              key={key}
              variant='outline'
              type='button'
              disabled={disabled || isLoading || extraDisabled}
              onClick={onClick}
              aria-label={label}
              className={cn(
                'h-11 w-full justify-center gap-2 rounded-lg',
                buttonClassName
              )}
            >
              {icon}
              {compactLabels ? name : label}
            </Button>
          )
        )}
      </div>
    </div>
  )
}
