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
import { DollarSign, Info, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { formatNumber, formatQuotaFixed } from '@/lib/format'
import { cn } from '@/lib/utils'

import { PAYMENT_BUTTON_COLORS } from '../constants'
import {
  calculatePresetPricing,
  formatDiscountInZhe,
  getMinTopupAmount,
  getPaymentIcon,
} from '../lib'
import type {
  CreemProduct,
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  UserWalletData,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'

const MONEY_FORMAT = { fixedFractionDigits: 2 } as const

interface RechargeFormCardProps {
  user: UserWalletData | null
  userLoading: boolean
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
}

function safeAssetUrl(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null

  // Root-relative paths point at assets hosted by this deployment.
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value
  }

  if (!/^https:\/\//i.test(value)) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export function RechargeFormCard({
  user,
  userLoading,
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  paymentLoading,
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
  topupLink,
  loading,
  priceRatio = 1,
  usdExchangeRate = 1,
  creemProducts,
  enableCreemTopup,
  onCreemProductSelect,
  enableWaffoTopup,
  waffoPayMethods,
  waffoMinTopup,
  onWaffoMethodSelect,
  enableWaffoPancakeTopup,
}: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(topupAmount.toString())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // Empty string must survive, otherwise the field can never be cleared
    setLocalAmount((prev) =>
      prev === '' && topupAmount === 0 ? prev : topupAmount.toString()
    )
  }, [topupAmount])

  const promoEndTime = (topupInfo?.promo_end_time ?? 0) * 1000
  const promoActive = promoEndTime > now
  const promoBanner = safeAssetUrl(topupInfo?.promo_banner_url)
  const promoLink = safeAssetUrl(topupInfo?.promo_link)
  const promoTitle = promoActive ? topupInfo?.promo_title?.trim() : ''
  const showPromo = promoActive && Boolean(promoTitle || promoBanner)

  useEffect(() => {
    if (!promoActive) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [promoActive])

  const handleAmountChange = (value: string) => {
    setLocalAmount(value)
    const numValue = Number.parseInt(value) || 0
    if (numValue >= 0) {
      onTopupAmountChange(numValue)
    }
  }

  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup
  const hasAnyTopup = Boolean(hasConfigurableTopup) || Boolean(enableCreemTopup)
  const hasStandardPaymentMethods =
    Array.isArray(topupInfo?.pay_methods) && topupInfo.pay_methods.length > 0
  const hasWaffoPaymentMethods =
    Array.isArray(waffoPayMethods) && waffoPayMethods.length > 0
  const minTopup = getMinTopupAmount(topupInfo)
  const paymentHint =
    topupInfo?.epay_tip?.trim() ||
    t('Minimum topup amount: {{amount}}', { amount: minTopup })
  const redemptionEnabled = topupInfo?.enable_redemption !== false

  const remainingMs = Math.max(promoEndTime - now, 0)
  const remainingSeconds = Math.floor(remainingMs / 1000)
  const countdownUnits = [
    {
      value: String(Math.floor(remainingSeconds / 86400)).padStart(2, '0'),
      label: t('Day'),
    },
    {
      value: String(Math.floor((remainingSeconds % 86400) / 3600)).padStart(
        2,
        '0'
      ),
      label: t('Hour'),
    },
    {
      value: String(Math.floor((remainingSeconds % 3600) / 60)).padStart(
        2,
        '0'
      ),
      label: t('Minute'),
    },
    {
      value: String(remainingSeconds % 60).padStart(2, '0'),
      label: t('Second'),
    },
    { value: String(remainingMs % 1000).padStart(3, '0'), label: '' },
  ]

  const promoImage = promoBanner ? (
    <img
      alt={promoTitle || t('Promotion')}
      className='mx-auto my-2 max-h-24 max-w-full rounded-md'
      src={promoBanner}
      loading='lazy'
      decoding='async'
      referrerPolicy='no-referrer'
    />
  ) : null

  if (loading) {
    return (
      <div className='border-border/50 space-y-8 rounded-xl border p-4 lg:p-6 xl:p-8'>
        <div className='pt-5 text-center'>
          <Skeleton className='mx-auto h-4 w-32' />
          <Skeleton className='mx-auto mt-3 h-10 w-40' />
        </div>
        <div className='grid gap-4 md:grid-cols-2 2xl:grid-cols-4'>
          {Array.from({ length: 8 }, (_, index) => `preset-${index}`).map(
            (key) => (
              <Skeleton key={key} className='h-[74px] rounded-lg' />
            )
          )}
        </div>
        <Skeleton className='h-10 w-full' />
        <div className='flex flex-wrap gap-2'>
          {['primary', 'secondary', 'tertiary'].map((key) => (
            <Skeleton key={key} className='h-9 w-28 rounded-lg' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='border-border/50 space-y-8 rounded-xl border p-4 lg:p-6 xl:p-8'>
      <div className='pt-5 text-center'>
        <div className='text-muted-foreground mb-1 text-sm'>
          {t('Account Balance')}
        </div>
        {userLoading ? (
          <Skeleton className='mx-auto h-10 w-40' />
        ) : (
          <div className='text-4xl font-bold tracking-tight'>
            {formatQuotaFixed(user?.quota ?? 0)}
          </div>
        )}
        {promoTitle ? (
          <h3 className='mt-3 text-xl font-medium'>{promoTitle}</h3>
        ) : null}
      </div>

      <section className='space-y-5'>
        {hasAnyTopup && showPromo ? (
          <>
            <div className='flex items-center gap-3'>
              <div className='bg-border/40 h-px flex-1' />
              <span className='text-muted-foreground text-sm font-medium'>
                <span className='flex items-center gap-x-1.5'>
                  <span>{t('Remaining')}</span>
                  {countdownUnits.map((unit) => (
                    <span key={unit.label || 'ms'} className='inline-block'>
                      <span className='inline-block rounded-sm bg-black/80 px-1.5 py-px font-mono text-[12px] font-semibold text-white'>
                        {unit.value}
                      </span>{' '}
                      <span>{unit.label}</span>
                    </span>
                  ))}
                </span>
              </span>
              <div className='bg-border/40 h-px flex-1' />
            </div>
            {promoBanner && promoLink ? (
              <a
                href={promoLink}
                target='_blank'
                rel='noopener noreferrer'
                className='block'
              >
                {promoImage}
              </a>
            ) : (
              promoImage
            )}
          </>
        ) : null}

        {hasConfigurableTopup ? (
          <>
            {presetAmounts.length > 0 && (
              <div>
                <div className='mb-3 flex items-baseline justify-between'>
                  <h3 className='font-medium'>{t('Credit Top-up')}</h3>
                  <span className='text-muted-foreground text-sm'>
                    {t('Select amount')}
                  </span>
                </div>
                <div className='grid gap-4 md:grid-cols-2 2xl:grid-cols-4'>
                  {presetAmounts.map((preset) => {
                    const discount =
                      preset.discount ||
                      topupInfo?.discount?.[preset.value] ||
                      1.0
                    const {
                      displayValue,
                      actualPrice,
                      savedAmount,
                      hasDiscount,
                    } = calculatePresetPricing(
                      preset.value,
                      priceRatio,
                      discount,
                      usdExchangeRate
                    )
                    const selected = selectedPreset === preset.value

                    return (
                      <button
                        key={preset.value}
                        type='button'
                        onClick={() => onSelectPreset(preset)}
                        className={cn(
                          'relative cursor-pointer rounded-lg border p-3 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border/40 hover:border-primary/50 dark:hover:border-cyan-800/30 dark:hover:bg-cyan-500/10'
                        )}
                      >
                        {hasDiscount && (
                          <span className='bg-foreground text-background absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold'>
                            {t('{{percent}}% off', {
                              percent: Math.round((1 - discount) * 100),
                              discount: formatDiscountInZhe(discount),
                            })}
                          </span>
                        )}
                        <span className='flex items-center gap-1'>
                          <span className='bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full'>
                            <DollarSign className='size-3' />
                          </span>
                          <span className='text-lg font-semibold'>
                            {formatNumber(displayValue)}
                          </span>
                          <span className='text-sm font-semibold'>
                            {t('Credits')}
                          </span>
                        </span>
                        <span className='text-muted-foreground mt-1 block text-xs'>
                          {hasDiscount && savedAmount > 0
                            ? t('Pay {{price}}, save {{saved}}', {
                                price: formatLocalCurrencyAmount(
                                  actualPrice,
                                  MONEY_FORMAT
                                ),
                                saved: formatLocalCurrencyAmount(
                                  savedAmount,
                                  MONEY_FORMAT
                                ),
                              })
                            : t('Pay {{price}}', {
                                price: formatLocalCurrencyAmount(
                                  actualPrice,
                                  MONEY_FORMAT
                                ),
                              })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <Input
                id='topup-amount'
                type='number'
                value={localAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                min={minTopup}
                placeholder={t('Custom Amount')}
                className='h-10 flex-1'
                aria-label={t('Custom Amount')}
              />
              <div className='bg-muted/30 flex h-10 items-center justify-between gap-2 rounded-lg border px-3 sm:min-w-52'>
                <span className='text-muted-foreground truncate text-xs'>
                  {t('Amount to pay:')}
                </span>
                {calculating ? (
                  <Skeleton className='h-5 w-16' />
                ) : (
                  <span className='text-sm font-semibold'>
                    {formatLocalCurrencyAmount(paymentAmount, MONEY_FORMAT)}
                  </span>
                )}
              </div>
            </div>

            <div className='max-lg:border-border/40 max-lg:bg-background/70 flex w-full flex-wrap items-center gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:mb-0 max-lg:justify-between max-lg:border-t max-lg:px-4 max-lg:py-3 max-lg:backdrop-blur-xl'>
              {topupInfo?.pay_methods?.map((method) => {
                const methodMinTopup = Math.max(
                  method.min_topup || 0,
                  getMinTopupAmount(topupInfo)
                )
                const disabled = methodMinTopup > topupAmount
                const disabledReason = disabled
                  ? t('Minimum topup amount: {{amount}}', {
                      amount: methodMinTopup,
                    })
                  : undefined

                const buttonColor =
                  method.color || PAYMENT_BUTTON_COLORS[method.type]

                const button = (
                  <Button
                    key={method.type}
                    onClick={() => onPaymentMethodSelect(method)}
                    disabled={disabled || !!paymentLoading}
                    title={disabledReason}
                    aria-label={
                      disabledReason
                        ? `${method.name}. ${disabledReason}`
                        : method.name
                    }
                    style={
                      buttonColor
                        ? { backgroundColor: buttonColor, color: '#fff' }
                        : undefined
                    }
                    className={cn(
                      'h-9 min-w-28 gap-1.5 px-2.5 max-lg:grow',
                      buttonColor
                        ? 'hover:brightness-95'
                        : 'bg-primary text-primary-foreground hover:bg-primary/85'
                    )}
                  >
                    {paymentLoading === method.type ? (
                      <Loader2 className='size-5 animate-spin' />
                    ) : (
                      getPaymentIcon(
                        method.type,
                        'size-5',
                        method.icon,
                        method.name,
                        buttonColor ? '#fff' : undefined
                      )
                    )}
                    {method.name}
                  </Button>
                )

                return disabled ? (
                  <TooltipProvider key={method.type}>
                    <Tooltip>
                      <TooltipTrigger render={button} />
                      <TooltipContent>{disabledReason}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  button
                )
              })}
            </div>

            {hasStandardPaymentMethods ? (
              <p className='text-muted-foreground flex items-center gap-1 text-sm'>
                <Info className='size-4' />
                {paymentHint}
              </p>
            ) : (
              !hasWaffoPaymentMethods && (
                <Alert>
                  <AlertDescription>
                    {t(
                      'No payment methods available. Please contact administrator.'
                    )}
                  </AlertDescription>
                </Alert>
              )
            )}

            {enableWaffoTopup &&
              hasWaffoPaymentMethods &&
              onWaffoMethodSelect && (
                <div className='space-y-2.5'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-border/40 h-px flex-1' />
                    <span className='text-muted-foreground text-sm font-medium'>
                      {t('Waffo Payment')}
                    </span>
                    <div className='bg-border/40 h-px flex-1' />
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {waffoPayMethods?.map((method, index) => {
                      const loadingKey = `waffo-${index}`
                      const methodKey = `${method.payMethodType ?? 'unknown'}-${method.payMethodName ?? method.name}`
                      const waffoMin = waffoMinTopup || 0
                      const belowMin = waffoMin > topupAmount
                      const disabledReason = belowMin
                        ? t('Minimum topup amount: {{amount}}', {
                            amount: waffoMin,
                          })
                        : undefined

                      let methodIcon = getPaymentIcon('waffo')
                      if (paymentLoading === loadingKey) {
                        methodIcon = <Loader2 className='size-5 animate-spin' />
                      } else if (method.icon) {
                        methodIcon = (
                          <img
                            src={method.icon}
                            alt={method.name}
                            className='size-5 object-contain'
                          />
                        )
                      }

                      const button = (
                        <Button
                          key={methodKey}
                          onClick={() => onWaffoMethodSelect(method, index)}
                          disabled={belowMin || !!paymentLoading}
                          title={disabledReason}
                          aria-label={
                            disabledReason
                              ? `${method.name}. ${disabledReason}`
                              : method.name
                          }
                          className='h-9 min-w-28 gap-1.5 px-2.5 max-lg:grow'
                        >
                          {methodIcon}
                          {method.name}
                        </Button>
                      )

                      return belowMin ? (
                        <TooltipProvider key={methodKey}>
                          <Tooltip>
                            <TooltipTrigger render={button} />
                            <TooltipContent>{disabledReason}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        button
                      )
                    })}
                  </div>
                </div>
              )}
          </>
        ) : (
          <Alert>
            <AlertDescription>
              {t(
                'Online topup is not enabled. Please use redemption code or contact administrator.'
              )}
            </AlertDescription>
          </Alert>
        )}

        {enableCreemTopup &&
          Array.isArray(creemProducts) &&
          creemProducts.length > 0 &&
          onCreemProductSelect && (
            <div className='space-y-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-border/40 h-px flex-1' />
                <span className='text-muted-foreground text-sm font-medium'>
                  {t('Creem Payment')}
                </span>
                <div className='bg-border/40 h-px flex-1' />
              </div>
              <CreemProductsSection
                products={creemProducts}
                onProductSelect={onCreemProductSelect}
              />
            </div>
          )}
      </section>

      {redemptionEnabled ? (
        <section className='space-y-5'>
          <div className='flex items-center gap-3'>
            <div className='bg-border/40 h-px flex-1' />
            <span className='text-muted-foreground text-sm font-medium'>
              {t('Redeem')}
            </span>
            <div className='bg-border/40 h-px flex-1' />
          </div>
          <form
            className='space-y-3'
            onSubmit={(event) => {
              event.preventDefault()
              onRedeem()
            }}
          >
            <div className='flex gap-2'>
              <Input
                id='redemption-code'
                value={redemptionCode}
                onChange={(e) => onRedemptionCodeChange(e.target.value)}
                placeholder={t('Enter your redemption code')}
                autoComplete='off'
                className='h-10 flex-1'
              />
              <Button
                type='submit'
                disabled={redeeming}
                className='h-10 gap-1.5 px-2.5'
              >
                {redeeming && <Loader2 className='size-4 animate-spin' />}
                {t('Redeem')}
              </Button>
            </div>
            {topupLink ? (
              <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                <span>{t("Can't pay online?")}</span>
                <a
                  href={topupLink}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary underline underline-offset-2'
                >
                  {t('Buy Code')}
                </a>
              </div>
            ) : null}
          </form>
        </section>
      ) : (
        <Alert>
          <AlertDescription>
            {t(
              'Redemption codes are disabled until the administrator confirms compliance terms.'
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
