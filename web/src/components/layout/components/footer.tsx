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
import { Link } from '@tanstack/react-router'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

interface FooterLink {
  text: string
  href: string
}

interface FooterColumnProps {
  title: string
  links: FooterLink[]
}

interface FooterProps {
  logo?: string
  name?: string
  columns?: FooterColumnProps[]
  copyright?: string
  className?: string
}

function FooterLinkItem(props: { link: FooterLink }) {
  const { t } = useTranslation()
  const isExternal = props.link.href.startsWith('http')
  const label = t(props.link.text)

  if (isExternal) {
    return (
      <a
        href={props.link.href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-muted-foreground hover:text-primary block duration-150'
      >
        {label}
      </a>
    )
  }

  return (
    <Link
      to={props.link.href}
      className='text-muted-foreground hover:text-primary block duration-150'
    >
      {label}
    </Link>
  )
}

// Renders User Agreement / Privacy Policy links inline with the parent's
// copyright row when either is configured in System Settings → Site. Emits
// fragmented siblings so the parent flex container's gap controls spacing.
function LegalLinks(props: { leadingSeparator?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { key: string; label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({
      key: 'user-agreement',
      label: t('User Agreement'),
      href: '/user-agreement',
    })
  }
  if (status?.privacy_policy_enabled) {
    items.push({
      key: 'privacy-policy',
      label: t('Privacy Policy'),
      href: '/privacy-policy',
    })
  }
  if (items.length === 0) {
    return null
  }
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {(props.leadingSeparator || index > 0) && (
            <span aria-hidden='true' className='text-muted-foreground/30'>
              ·
            </span>
          )}
          <Link
            to={item.href}
            className='hover:text-foreground transition-colors duration-200'
          >
            {item.label}
          </Link>
        </Fragment>
      ))}
    </>
  )
}

// Renders the enabled legal documents as their own footer column, so the
// layout matches the reference site's agreement column.
function LegalColumn() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { key: string; label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({
      key: 'user-agreement',
      label: t('User Agreement'),
      href: '/user-agreement',
    })
  }
  if (status?.privacy_policy_enabled) {
    items.push({
      key: 'privacy-policy',
      label: t('Privacy Policy'),
      href: '/privacy-policy',
    })
  }
  if (items.length === 0) {
    return null
  }
  return (
    <div className='space-y-4 text-sm'>
      <span className='block font-medium'>
        {t('footer.columns.legal.title')}
      </span>
      <div className='flex flex-wrap gap-4 sm:flex-col'>
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.href}
            className='text-muted-foreground hover:text-primary block duration-150'
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const { systemName, logo: systemLogo, footerHtml } = useSystemConfig()
  const { status } = useStatus()

  const displayLogo = systemLogo || props.logo || '/logo.png'
  const displayName = systemName || props.name || 'New API'
  const currentYear = new Date().getFullYear()
  const hasLegalLinks = Boolean(
    status?.user_agreement_enabled || status?.privacy_policy_enabled
  )

  const fallbackColumns = useMemo<FooterColumnProps[]>(
    () => [
      {
        title: t('footer.columns.about.title'),
        links: [
          {
            text: t('footer.columns.about.links.aboutProject'),
            href: 'https://docs.newapi.pro/wiki/project-introduction/',
          },
          {
            text: t('footer.columns.about.links.contact'),
            href: 'https://docs.newapi.pro/support/community-interaction/',
          },
          {
            text: t('footer.columns.about.links.features'),
            href: 'https://docs.newapi.pro/wiki/features-introduction/',
          },
        ],
      },
      {
        title: t('footer.columns.docs.title'),
        links: [
          {
            text: t('footer.columns.docs.links.quickStart'),
            href: 'https://docs.newapi.pro/getting-started/',
          },
          {
            text: t('footer.columns.docs.links.installation'),
            href: 'https://docs.newapi.pro/installation/',
          },
          {
            text: t('footer.columns.docs.links.apiDocs'),
            href: 'https://docs.newapi.pro/api/',
          },
        ],
      },
      {
        title: t('footer.columns.related.title'),
        links: [
          {
            text: t('footer.columns.related.links.oneApi'),
            href: 'https://github.com/songquanpeng/one-api',
          },
          {
            text: t('footer.columns.related.links.midjourney'),
            href: 'https://github.com/novicezk/midjourney-proxy',
          },
          {
            text: t('footer.columns.related.links.newApiKeyTool'),
            href: 'https://github.com/Calcium-Ion/new-api-key-tool',
          },
        ],
      },
    ],
    [t]
  )

  const displayColumns = props.columns ?? fallbackColumns

  if (footerHtml) {
    return (
      <footer
        className={cn(
          'border-border/40 relative z-10 border-t',
          props.className
        )}
      >
        <div className='mx-auto w-full max-w-6xl px-6 py-5'>
          <div className='bg-muted/20 border-border/50 flex flex-col items-center justify-between gap-4 rounded-2xl border px-4 py-4 backdrop-blur-sm sm:flex-row sm:px-5'>
            <div
              className='custom-footer text-muted-foreground min-w-0 text-center text-sm sm:text-left'
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
            {hasLegalLinks && (
              <div className='border-border/60 text-muted-foreground/45 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t pt-4 text-xs sm:w-auto sm:justify-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5'>
                <LegalLinks />
              </div>
            )}
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className={cn(
        'border-border/40 relative z-10 border-t py-8 sm:py-10 lg:pt-16',
        props.className
      )}
    >
      <div className='mx-auto max-w-6xl space-y-10 px-6'>
        <div className='grid gap-12 md:grid-cols-5'>
          {/* Brand column */}
          <div className='col-span-5 space-y-6 md:col-span-2 md:space-y-8'>
            <Link
              to='/'
              className='flex size-10 items-center'
              aria-label={t('Home')}
            >
              <img
                src={displayLogo}
                alt={displayName}
                className='size-10 rounded-lg object-contain'
              />
            </Link>
            <p className='text-muted-foreground text-sm text-balance'>
              {t('Powerful API Management Platform')}
            </p>
          </div>

          {/* Links columns */}
          <div className='col-span-3 grid gap-6 sm:grid-cols-4'>
            {displayColumns.map((column) => (
              <div key={column.title} className='space-y-4 text-sm'>
                <span className='block font-medium'>{t(column.title)}</span>
                <div className='flex flex-wrap gap-4 sm:flex-col'>
                  {column.links.map((link) => (
                    <FooterLinkItem key={link.href} link={link} />
                  ))}
                </div>
              </div>
            ))}
            <LegalColumn />
          </div>
        </div>

        {/* Copyright + legal links */}
        <div className='border-border/40 text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-dashed pt-4 text-xs'>
          <span className='text-muted-foreground text-sm'>
            &copy; {currentYear} {displayName}.{' '}
            {props.copyright ?? t('footer.defaultCopyright')}
          </span>
          <LegalLinks />
        </div>
      </div>
    </footer>
  )
}
