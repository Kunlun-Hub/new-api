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
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowUpRight,
  Brain,
  Calendar,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { StaticDataTable } from '@/components/data-table'
import { GroupBadge } from '@/components/group-badge'
import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PluginIcon } from '@/features/task-plugins/components/plugin-icon'
import { toIntlLocale } from '@/i18n/languages'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { useBillingTime } from '../hooks/use-billing-time'
import { usePricingData } from '../hooks/use-pricing-data'
import type { ParsedTaskTier } from '../lib/billing-expr'
import { formatBillingCondition } from '../lib/billing-expression/condition-display'
import {
  formatContextLength,
  getCapabilityBadges,
  getMetaTagBadges,
} from '../lib/capability-badges'
import {
  formatTaskUsageUnitPrice,
  getDynamicPriceEntries,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  getDynamicPricingTiers,
  getTaskUsageQuantityUnitLabelKey,
  hasTaskUsageSchema,
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
  type DynamicPriceEntry,
} from '../lib/dynamic-price'
import {
  getAvailableGroups,
  getConfiguredGroupRatio,
  isTokenBasedModel,
  replaceModelInPath,
} from '../lib/model-helpers'
import { withPluginPricing } from '../lib/plugin-pricing'
import { formatFixedPrice, formatGroupPrice, formatPrice } from '../lib/price'
import {
  evaluateTaskUsageExamples,
  getTaskEnumFields,
  getTaskNumberFields,
} from '../lib/task-expr'
import { getTaskPricingDisplayTiers } from '../lib/task-matrix-display'
import {
  hasSimpleTaskPricing,
  taskPriceLabel,
  taskUsageUnitLabel,
  taskTierConditions,
  pricingDisplayFallbackKey,
} from '../lib/task-price-display'
import type { PriceType, PricingModel, TokenUnit } from '../types'
import { DynamicPricingBreakdown } from './dynamic-pricing-breakdown'
import { ModelAvailabilitySection } from './model-details-availability'
import { ModelTryDrawer } from './model-try-drawer'

const MODEL_DETAILS_SKELETON_KEYS = ['first', 'second', 'third', 'fourth']

// ----------------------------------------------------------------------------
// Local UI helpers
// ----------------------------------------------------------------------------

function SectionTitle(props: { children: React.ReactNode }) {
  return (
    <h2 className='text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase'>
      {props.children}
    </h2>
  )
}

function DynamicPriceEntryLabel(props: { entry: DynamicPriceEntry }) {
  const { t, i18n } = useTranslation()
  if (props.entry.labelKind === 'schema') {
    return (
      <span className='break-words whitespace-normal'>
        {taskPriceLabel(
          props.entry.description,
          props.entry.shortLabel,
          i18n.language
        )}
      </span>
    )
  }
  return t(props.entry.shortLabel)
}

function UnconfiguredTaskPricingNotice(props: { model: PricingModel }) {
  const { t, i18n } = useTranslation()
  const numberFields = getTaskNumberFields(props.model.billing_usage_schema)
  const enumFields = getTaskEnumFields(props.model.billing_usage_schema)

  return (
    <div className='bg-muted/20 flex flex-col gap-3 rounded-lg border p-3'>
      <p className='text-muted-foreground text-sm'>
        {t(
          'This model is billed by usage, but the administrator has not configured its pricing yet.'
        )}
      </p>
      {numberFields.length + enumFields.length > 0 ? (
        <dl className='grid gap-2 sm:grid-cols-2'>
          {numberFields.map(([field, definition]) => (
            <div
              key={field}
              className='flex items-baseline justify-between gap-3'
            >
              <dt className='text-sm'>
                {taskPriceLabel(definition.description, field, i18n.language)}
              </dt>
              <dd className='text-muted-foreground text-xs'>
                {taskUsageUnitLabel(
                  definition,
                  i18n.language,
                  t(getTaskUsageQuantityUnitLabelKey(definition.unit))
                )}
              </dd>
            </div>
          ))}
          {enumFields.map(([field, definition]) => (
            <div
              key={field}
              className='flex items-baseline justify-between gap-3'
            >
              <dt className='text-sm'>
                <code>{field}</code>
              </dt>
              <dd className='text-muted-foreground text-right text-xs'>
                {(definition.enum ?? []).join(', ')}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Model header (always visible above the detail sections)
// ----------------------------------------------------------------------------

function ModelHeader(props: {
  model: PricingModel
  onTry?: (modelName: string) => void
}) {
  const { t } = useTranslation()
  const model = props.model
  const modelIconKey = model.icon || model.vendor_icon
  const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 32) : null
  const capabilities = getCapabilityBadges(model)
  const metaTagBadges = getMetaTagBadges(model)

  return (
    <header className='mb-8 flex gap-4 max-md:flex-col md:items-start'>
      <div className='bg-card border-border flex size-15 shrink-0 items-center justify-center rounded-2xl border shadow-lg'>
        {modelIcon}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-3 max-md:justify-center'>
          <h1 className='text-foreground truncate text-2xl font-bold'>
            {model.model_name}
          </h1>
          <CopyButton
            value={model.model_name || ''}
            className='size-7'
            iconClassName='size-4'
            tooltip={t('Copy model name')}
            successTooltip={t('Copied!')}
            aria-label={t('Copy model name')}
          />
        </div>

        <div className='mt-2 flex flex-wrap items-center gap-2 md:mt-1'>
          {metaTagBadges.map((badge) => (
            <Badge
              key={badge.key}
              variant='outline'
              className='border-border/60 text-foreground max-md:text-muted-foreground h-5 rounded-4xl px-2 py-0.5 text-xs font-medium'
            >
              {t(badge.labelKey)}
            </Badge>
          ))}
          {capabilities.map((capability) => (
            <Badge
              key={capability.key}
              variant='outline'
              className='border-border/60 text-foreground max-md:text-muted-foreground h-5 rounded-4xl px-2 py-0.5 text-xs font-medium'
            >
              {t(capability.labelKey)}
            </Badge>
          ))}
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        {props.onTry && (
          <Button
            onClick={() => props.onTry?.(model.model_name)}
            className='border-border/60 h-9 gap-1.5 rounded-full px-4 max-md:grow'
            variant='outline'
          >
            <Sparkles className='size-4' />
            {t('Online trial')}
          </Button>
        )}
        <CopyButton
          className='border-border/60 h-9 gap-1.5 rounded-full px-4 text-[0.8rem] max-md:grow'
          iconClassName='size-4'
          tooltip={t('Copy Link')}
          successTooltip={t('Copied!')}
          value={
            typeof window === 'undefined'
              ? model.model_name
              : window.location.href
          }
          variant='outline'
        >
          {t('Copy Link')}
        </CopyButton>
      </div>
    </header>
  )
}

function formatCatalogDate(
  value: string | undefined,
  locale: string
): string | null {
  if (!value) return null
  const parts = value.split('-').map((part) => Number(part))
  const [year, month, day] = parts
  if (!Number.isFinite(year)) return value
  if (!Number.isFinite(month)) return String(year)
  const hasDay = Number.isFinite(day) && day > 0
  const date = new Date(Date.UTC(year, month - 1, hasDay ? day : 1))
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: 'numeric',
    month: 'long',
    ...(hasDay ? { day: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date)
}

function ModelStatsRow(props: { model: PricingModel }) {
  const { t, i18n } = useTranslation()
  const model = props.model
  const contextLabel = formatContextLength(model.context_length)
  const maxOutputLabel = formatContextLength(model.max_output_tokens)
  const releaseDate = formatCatalogDate(model.release_date, i18n.language)
  const knowledgeCutoff = formatCatalogDate(
    model.knowledge_cutoff,
    i18n.language
  )

  const stats: {
    key: string
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: React.ReactNode
    emphasize?: boolean
  }[] = []

  if (contextLabel) {
    stats.push({
      key: 'context',
      icon: Brain,
      label: t('Context length'),
      value: contextLabel,
      emphasize: true,
    })
  }
  if (maxOutputLabel) {
    stats.push({
      key: 'max-output',
      icon: ArrowUpRight,
      label: t('Max output'),
      value: maxOutputLabel,
      emphasize: true,
    })
  }
  if (releaseDate) {
    stats.push({
      key: 'release',
      icon: Calendar,
      label: t('Release date'),
      value: releaseDate,
    })
  }
  if (knowledgeCutoff) {
    stats.push({
      key: 'knowledge',
      icon: Calendar,
      label: t('Knowledge cutoff'),
      value: knowledgeCutoff,
    })
  }
  stats.push({
    key: 'ratio',
    icon: Layers,
    label: `${t('Model ratio')} / ${t('Completion ratio')}`,
    value: `${model.model_ratio ?? '-'} / ${(model.completion_ratio ?? 0).toFixed(2)}`,
    emphasize: true,
  })

  return (
    <div className='no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1 md:gap-4'>
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.key}
            className='border-border/50 bg-card/50 flex shrink-0 grow items-center gap-3 rounded-xl border p-4'
          >
            <Icon className='text-muted-foreground h-5 w-5 shrink-0' />
            <div className='min-w-0'>
              <p className='text-muted-foreground truncate text-xs'>
                {stat.label}
              </p>
              <p
                className={cn(
                  'font-semibold',
                  stat.emphasize ? 'text-lg' : 'text-sm'
                )}
              >
                {stat.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ModelDescriptionSection(props: { model: PricingModel }) {
  const { t } = useTranslation()
  const description =
    props.model.description || props.model.vendor_description || null
  if (!description) return null

  return (
    <section className='border-border/50 mb-6 rounded-xl border p-5 md:p-6'>
      <h2 className='text-foreground mb-2 text-sm font-medium'>
        {t('Model Description')}
      </h2>
      <p className='text-muted-foreground text-sm leading-relaxed'>
        {description}
      </p>
    </section>
  )
}

function ModelEndpointSection(props: {
  model: PricingModel
  endpointMap: Record<string, { path?: string; method?: string }>
}) {
  const { t } = useTranslation()

  const endpoints = useMemo(() => {
    const types = props.model.supported_endpoint_types ?? []
    return types
      .map((type) => {
        const info = props.endpointMap[type] ?? {}
        let path = info.path ?? ''
        if (path && path.includes('{model}')) {
          path = replaceModelInPath(path, props.model.model_name || '')
        }
        return { type, path, method: info.method || 'POST' }
      })
      .filter((endpoint) => Boolean(endpoint.path))
  }, [props.model, props.endpointMap])

  if (endpoints.length === 0) return null

  return (
    <section className='border-border/50 mb-6 overflow-hidden rounded-xl border'>
      <div className='border-border/40 border-b px-6 py-4'>
        <h2 className='text-foreground text-sm font-medium'>
          {t('Supported endpoints')}
        </h2>
      </div>
      <div className='divide-border/40 divide-y'>
        {endpoints.map((endpoint) => (
          <div
            key={`${endpoint.type}-${endpoint.path}`}
            className='group/ep flex items-center gap-2 px-6 py-3'
          >
            <Badge
              className='h-5 shrink-0 rounded-4xl px-2 py-0.5 text-xs font-medium'
              variant='secondary'
            >
              {endpoint.type}
            </Badge>
            <CopyButton
              aria-label={t('Copy')}
              className='h-8 min-w-0 gap-1 rounded-full px-2.5 font-mono text-[0.8rem]'
              iconClassName='size-3.5'
              size='sm'
              tooltip={t('Copy')}
              successTooltip={t('Copied!')}
              value={endpoint.path}
            >
              <span className='min-w-0 truncate'>{endpoint.path}</span>
            </CopyButton>
            <Badge
              className='ml-auto h-5 shrink-0 rounded-4xl px-2 py-0.5 text-[10px] font-medium'
              variant='secondary'
            >
              {endpoint.method}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  )
}

function PriceSection(props: {
  model: PricingModel
  priceRate: number
  usdExchangeRate: number
  tokenUnit: TokenUnit
  showRechargePrice: boolean
}) {
  const { t, i18n } = useTranslation()
  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'
  const baseGroupKey = '_base'
  const baseGroupRatioMap = { [baseGroupKey]: 1 }
  const currency = useSystemConfigStore((state) => state.config.currency)
  const billingTime = useBillingTime(props.model.billing_expr)
  const dynamicSummary = useMemo(
    () =>
      getDynamicPricingSummary(props.model, {
        now: billingTime === undefined ? undefined : new Date(billingTime),
        tokenUnit: props.tokenUnit,
        showRechargePrice: props.showRechargePrice,
        priceRate: props.priceRate,
        usdExchangeRate: props.usdExchangeRate,
        groupRatioMultiplier: 1,
      }),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.model,
      props.tokenUnit,
      props.showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      billingTime,
      currency,
    ]
  )

  const primaryPriceTypes: { label: string; type: PriceType }[] = [
    { label: t('Input'), type: 'input' },
    { label: t('Output'), type: 'output' },
  ]
  const secondaryPriceTypes: {
    label: string
    type: PriceType
    available: boolean
  }[] = [
    {
      label: t('Cached input'),
      type: 'cache',
      available: props.model.cache_ratio != null,
    },
    {
      label: t('Cache write'),
      type: 'create_cache',
      available: props.model.create_cache_ratio != null,
    },
    {
      label: t('Image input'),
      type: 'image',
      available: props.model.image_ratio != null,
    },
    {
      label: t('Audio input'),
      type: 'audio_input',
      available: props.model.audio_ratio != null,
    },
    {
      label: t('Audio output'),
      type: 'audio_output',
      available:
        props.model.audio_ratio != null &&
        props.model.audio_completion_ratio != null,
    },
  ]

  if (dynamicSummary) {
    if (dynamicSummary.isSpecialExpression) {
      return (
        <section>
          <SectionTitle>{t('Base Price')}</SectionTitle>
          <div className='rounded-lg border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10'>
            <div className='text-sm font-medium text-amber-800 dark:text-amber-200'>
              {t('Special billing expression')}
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t(
                pricingDisplayFallbackKey(
                  dynamicSummary.rawExpression,
                  props.model.billing_usage_schema
                )
              )}
            </p>
            <div className='mt-3'>
              <div className='text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase'>
                {t('Raw expression')}
              </div>
              <code className='text-muted-foreground bg-background/80 block max-h-28 overflow-auto rounded-md border px-2 py-1.5 font-mono text-xs break-all'>
                {dynamicSummary.rawExpression}
              </code>
            </div>
          </div>
        </section>
      )
    }

    return (
      <section>
        <SectionTitle>{t('Base Price')}</SectionTitle>
        {dynamicSummary.providerCount && (
          <p className='text-muted-foreground mb-2 text-xs'>
            {t('{{count}} providers', { count: dynamicSummary.providerCount })}
            {dynamicSummary.hasUnconfiguredProviders &&
              ` · ${t('Not configured for some providers')}`}
          </p>
        )}
        {dynamicSummary.isMixedBilling && (
          <p className='text-muted-foreground mb-2 text-xs'>
            {t('Token or per-call pricing')}
          </p>
        )}
        {dynamicSummary.primaryEntries.length > 0 ? (
          <div
            className={cn(
              'grid gap-2',
              dynamicSummary.primaryEntries.length > 1 && 'grid-cols-2'
            )}
          >
            {dynamicSummary.primaryEntries.map((entry) => {
              const unitLabelKey = getDynamicPriceUnitLabelKey(entry)
              const unitLabel = taskUsageUnitLabel(
                entry,
                i18n.language,
                unitLabelKey ? t(unitLabelKey) : tokenUnitLabel
              )
              return (
                <div
                  key={entry.key}
                  className='bg-muted/20 rounded-lg border p-3'
                >
                  <div className='text-muted-foreground text-xs'>
                    <DynamicPriceEntryLabel entry={entry} />
                  </div>
                  <div className='text-foreground mt-1 font-mono text-base font-semibold tabular-nums'>
                    {entry.formattedRange ?? entry.formatted}
                    <span className='text-muted-foreground/40 ml-1 text-xs font-normal'>
                      / {unitLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className='text-muted-foreground text-sm'>
            {dynamicSummary.hasUnconfiguredProviders
              ? t('Not configured')
              : t('Dynamic Pricing')}
          </p>
        )}
        {dynamicSummary.secondaryEntries.length > 0 && (
          <div className='bg-muted/20 mt-3 rounded-lg border px-3 py-2.5'>
            <div className='space-y-1.5'>
              {dynamicSummary.secondaryEntries.map((entry) => {
                const unitLabelKey = getDynamicPriceUnitLabelKey(entry)
                const unitLabel = taskUsageUnitLabel(
                  entry,
                  i18n.language,
                  unitLabelKey ? t(unitLabelKey) : tokenUnitLabel
                )
                return (
                  <div
                    key={entry.key}
                    className='flex items-baseline justify-between gap-4'
                  >
                    <span className='text-muted-foreground/70 text-sm'>
                      <DynamicPriceEntryLabel entry={entry} />
                    </span>
                    <span className='text-muted-foreground font-mono text-sm tabular-nums'>
                      {entry.formattedRange ?? entry.formatted}
                      <span className='text-muted-foreground/40 ml-1 text-xs font-normal'>
                        / {unitLabel}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    )
  }

  if (isUnconfiguredTaskUsageModel(props.model)) {
    return (
      <section>
        <SectionTitle>{t('Base Price')}</SectionTitle>
        <UnconfiguredTaskPricingNotice model={props.model} />
      </section>
    )
  }

  if (!isTokenBased) {
    return (
      <section>
        <SectionTitle>{t('Base Price')}</SectionTitle>
        <div className='flex items-baseline justify-between'>
          <span className='text-muted-foreground text-sm'>
            {t('Per request')}
          </span>
          <span className='text-foreground font-mono text-sm font-semibold tabular-nums'>
            {formatFixedPrice(
              props.model,
              baseGroupKey,
              props.showRechargePrice,
              props.priceRate,
              props.usdExchangeRate,
              baseGroupRatioMap
            )}
          </span>
        </div>
      </section>
    )
  }

  const secondaryItems = secondaryPriceTypes.filter((p) => p.available)
  const renderPrice = (type: PriceType) => (
    <>
      {formatGroupPrice(
        props.model,
        baseGroupKey,
        type,
        props.tokenUnit,
        props.showRechargePrice,
        props.priceRate,
        props.usdExchangeRate,
        baseGroupRatioMap
      )}
      <span className='text-muted-foreground/40 ml-1 text-xs font-normal'>
        / {tokenUnitLabel}
      </span>
    </>
  )

  return (
    <section>
      <SectionTitle>{t('Base Price')}</SectionTitle>
      <div className='grid grid-cols-2 gap-2'>
        {primaryPriceTypes.map((item) => (
          <div key={item.type} className='bg-muted/20 rounded-lg border p-3'>
            <div className='text-muted-foreground text-xs'>{item.label}</div>
            <div className='text-foreground mt-1 font-mono text-base font-semibold tabular-nums'>
              {renderPrice(item.type)}
            </div>
          </div>
        ))}
      </div>
      {secondaryItems.length > 0 && (
        <div className='bg-muted/20 mt-3 rounded-lg border px-3 py-2.5'>
          <div className='space-y-1.5'>
            {secondaryItems.map((item) => (
              <div
                key={item.type}
                className='flex items-baseline justify-between gap-4'
              >
                <span className='text-muted-foreground/70 text-sm'>
                  {item.label}
                </span>
                <span className='text-muted-foreground font-mono text-sm tabular-nums'>
                  {renderPrice(item.type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ----------------------------------------------------------------------------
// Auto group chain (used inside group pricing section)
// ----------------------------------------------------------------------------

function AutoGroupChain(props: { model: PricingModel; autoGroups: string[] }) {
  const { t } = useTranslation()
  const modelEnableGroups = Array.isArray(props.model.enable_groups)
    ? props.model.enable_groups
    : []
  const autoChain = props.autoGroups.filter((g) =>
    modelEnableGroups.includes(g)
  )

  if (autoChain.length === 0) return null

  return (
    <div className='text-muted-foreground mb-3 flex flex-wrap items-center gap-1 text-xs'>
      <span className='font-medium'>{t('Auto Group Chain')}</span>
      <span className='text-muted-foreground/40'>→</span>
      {autoChain.map((g, idx) => (
        <span key={g} className='flex items-center gap-1'>
          <GroupBadge group={g} size='sm' />
          {idx < autoChain.length - 1 && (
            <span className='text-muted-foreground/40'>→</span>
          )}
        </span>
      ))}
    </div>
  )
}

type DynamicPriceOptions = Parameters<typeof getDynamicPriceEntries>[1]
type DynamicPricingTier = ReturnType<typeof getDynamicPricingTiers>[number]
type DynamicFormattedPricesByTier = Map<DynamicPricingTier, Map<string, string>>

function getDynamicPriceFields(
  tiers: DynamicPricingTier[],
  options: DynamicPriceOptions
) {
  return [
    ...new Map(
      tiers
        .flatMap((tier) => getDynamicPriceEntries(tier, options))
        .map((entry) => [entry.field, entry])
    ).values(),
  ]
}

function getDynamicFormattedPricesByTier(
  tiers: DynamicPricingTier[],
  options: DynamicPriceOptions
): DynamicFormattedPricesByTier {
  return new Map(
    tiers.map((tier) => [
      tier,
      new Map(
        getDynamicPriceEntries(tier, options).map((entry) => [
          entry.field,
          entry.formatted,
        ])
      ),
    ])
  )
}

// ----------------------------------------------------------------------------
// Group pricing table
// ----------------------------------------------------------------------------

type GroupPricingSectionProps = {
  model: PricingModel
  groupRatio: Record<string, number>
  usableGroup: Record<string, { desc: string; ratio: number }>
  autoGroups: string[]
  priceRate: number
  usdExchangeRate: number
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
}

/** Price columns of the available-groups table; `create_cache_1h` has no
 * stored ratio on the model and only exists inside a tiered expression. */
type GroupPriceColumn =
  | 'input'
  | 'output'
  | 'cache'
  | 'create_cache'
  | 'create_cache_1h'

const DYNAMIC_PRICE_FIELDS: Record<GroupPriceColumn, string> = {
  input: 'inputPrice',
  output: 'outputPrice',
  cache: 'cacheReadPrice',
  create_cache: 'cacheCreatePrice',
  create_cache_1h: 'cacheCreate1hPrice',
}

function FlatGroupPricingTable(props: GroupPricingSectionProps) {
  const { t } = useTranslation()
  const showRechargePrice = props.showRechargePrice ?? false
  const tokenUnitLabel = props.tokenUnit === 'K' ? '/K' : '/M'
  const availableGroups = useMemo(
    () => getAvailableGroups(props.model, props.usableGroup || {}),
    [props.model, props.usableGroup]
  )

  if (availableGroups.length === 0) {
    return (
      <p className='text-muted-foreground px-6 py-4 text-sm'>
        {t(
          'This model is not available in any group, or no group pricing information is configured.'
        )}
      </p>
    )
  }

  const dynamicPriceOptions = (group: string) => ({
    tokenUnit: props.tokenUnit,
    showRechargePrice,
    priceRate: props.priceRate,
    usdExchangeRate: props.usdExchangeRate,
    groupRatioMultiplier: props.groupRatio[group] || 1,
    usageSchema: props.model.billing_usage_schema,
  })
  const dynamicTiers = isDynamicPricingModel(props.model)
    ? getDynamicPricingTiers(props.model)
    : []

  const firstTierEntries =
    dynamicTiers.length > 0
      ? getDynamicPriceEntries(dynamicTiers[0], dynamicPriceOptions('default'))
      : []
  const hasDynamicField = (type: GroupPriceColumn) => {
    const field = DYNAMIC_PRICE_FIELDS[type]
    return Boolean(
      field && firstTierEntries.some((entry) => entry.field === field)
    )
  }

  const priceFor = (group: string, type: GroupPriceColumn) => {
    if (dynamicTiers.length > 0) {
      const field = DYNAMIC_PRICE_FIELDS[type]
      const entry = field
        ? getDynamicPriceEntries(
            dynamicTiers[0],
            dynamicPriceOptions(group)
          ).find((item) => item.field === field)
        : undefined
      if (entry?.formatted) {
        return entry.unit === 'token'
          ? `${entry.formatted}${tokenUnitLabel}`
          : entry.formatted
      }
    }
    if (type === 'create_cache_1h') {
      return '-'
    }
    return `${formatPrice(
      props.model,
      type,
      props.tokenUnit,
      showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      group
    )}${tokenUnitLabel}`
  }

  const showCacheRead =
    props.model.cache_ratio != null || hasDynamicField('cache')
  const showCacheWrite =
    props.model.create_cache_ratio != null || hasDynamicField('create_cache')
  const showCacheWrite1h = hasDynamicField('create_cache_1h')

  return (
    <Table className='[&_tbody>tr]:h-auto! [&_th]:text-xs! [&_th_*]:text-xs!'>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead className='text-foreground px-6 py-3 font-medium'>
            {t('Token group')}
          </TableHead>
          <TableHead className='text-foreground px-6 py-3 font-medium'>
            {t('Description')}
          </TableHead>
          <TableHead className='text-foreground px-6 py-3 text-right font-medium'>
            {t('Group Ratio')}
          </TableHead>
          <TableHead className='text-foreground px-6 py-3 text-right font-medium'>
            {t('Input price')}
          </TableHead>
          <TableHead className='text-foreground px-6 py-3 text-right font-medium'>
            {t('Output price')}
          </TableHead>
          {showCacheRead && (
            <TableHead className='text-foreground px-6 py-3 text-right font-medium'>
              {t('Cache Read')}
            </TableHead>
          )}
          {showCacheWrite && (
            <TableHead className='text-foreground px-6 py-3 text-right font-medium'>
              {showCacheWrite1h ? t('Cache Write (5m)') : t('Cache write')}
            </TableHead>
          )}
          {showCacheWrite1h && (
            <TableHead className='text-foreground px-6 py-3 text-right font-medium'>
              {t('Cache Write (1h)')}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {availableGroups.map((group) => {
          const ratio = props.groupRatio[group] || 1
          return (
            <TableRow key={group} className='border-border/30'>
              <TableCell className='px-6 py-3 font-medium'>{group}</TableCell>
              <TableCell className='text-muted-foreground px-6 py-3 font-normal!'>
                {props.usableGroup?.[group]?.desc || '-'}
              </TableCell>
              <TableCell className='px-6 py-3 text-right font-mono font-normal!'>
                {ratio}x
              </TableCell>
              <TableCell className='px-6 py-3 text-right font-mono font-normal!'>
                {priceFor(group, 'input')}
              </TableCell>
              <TableCell className='px-6 py-3 text-right font-mono font-normal!'>
                {priceFor(group, 'output')}
              </TableCell>
              {showCacheRead && (
                <TableCell className='px-6 py-3 text-right font-mono font-normal!'>
                  {priceFor(group, 'cache')}
                </TableCell>
              )}
              {showCacheWrite && (
                <TableCell className='px-6 py-3 text-right font-mono font-normal!'>
                  {priceFor(group, 'create_cache')}
                </TableCell>
              )}
              {showCacheWrite1h && (
                <TableCell className='px-6 py-3 text-right font-mono font-normal!'>
                  {priceFor(group, 'create_cache_1h')}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function GroupPricingSection(props: GroupPricingSectionProps) {
  const { t } = useTranslation()
  const variants = props.model.billing_plugin_variants
  if (!variants?.length) {
    const useFlatTable =
      isTokenBasedModel(props.model) && !hasTaskUsageSchema(props.model)
    if (useFlatTable) {
      return <FlatGroupPricingTable {...props} />
    }
    return <ProviderGroupPricingSection {...props} hideTitle />
  }
  return (
    <section className='px-6 py-4'>
      <Tabs key={props.model.model_name} defaultValue={variants[0].plugin_key}>
        <TabsList
          aria-label={t('Provider')}
          className='max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto'
        >
          {variants.map((variant) => (
            <TabsTrigger
              key={variant.plugin_key}
              value={variant.plugin_key}
              className='max-w-full min-w-0'
            >
              <PluginIcon
                plugin={{
                  key: variant.plugin_key,
                  name: variant.plugin_name,
                  icon: variant.icon,
                }}
                size={16}
              />
              <span className='truncate' title={variant.plugin_name}>
                {variant.plugin_name}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {variants.map((variant) => (
          <TabsContent key={variant.plugin_key} value={variant.plugin_key}>
            {variant.billing_expr || variant.billing_mode === 'ratio' ? (
              <ProviderGroupPricingSection
                {...props}
                model={withPluginPricing(props.model, variant)}
                hideTitle
              />
            ) : (
              <UnconfiguredTaskPricingNotice
                model={withPluginPricing(props.model, variant)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}

function ProviderGroupPricingSection(
  props: GroupPricingSectionProps & { hideTitle?: boolean }
) {
  const { t, i18n } = useTranslation()
  const showRechargePrice = props.showRechargePrice ?? false

  const availableGroups = useMemo(
    () => getAvailableGroups(props.model, props.usableGroup || {}),
    [props.model, props.usableGroup]
  )

  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitLabel = props.tokenUnit === 'K' ? '1K' : '1M'

  const extraPriceTypes = useMemo(() => {
    const types: { label: string; type: PriceType }[] = []
    if (props.model.cache_ratio != null) {
      types.push({ label: t('Cache'), type: 'cache' })
    }
    if (props.model.create_cache_ratio != null) {
      types.push({ label: t('Cache Write'), type: 'create_cache' })
    }
    if (props.model.image_ratio != null) {
      types.push({ label: t('Image'), type: 'image' })
    }
    if (props.model.audio_ratio != null) {
      types.push({ label: t('Audio In'), type: 'audio_input' })
    }
    if (
      props.model.audio_ratio != null &&
      props.model.audio_completion_ratio != null
    ) {
      types.push({ label: t('Audio Out'), type: 'audio_output' })
    }
    return types
  }, [props.model, t])

  if (availableGroups.length === 0) {
    return (
      <section>
        {!props.hideTitle && (
          <SectionTitle>{t('Pricing by Group')}</SectionTitle>
        )}
        <AutoGroupChain model={props.model} autoGroups={props.autoGroups} />
        <p className='text-muted-foreground text-sm'>
          {t(
            'This model is not available in any group, or no group pricing information is configured.'
          )}
        </p>
      </section>
    )
  }

  const thClass = cn(
    'text-muted-foreground py-2 text-xs font-medium whitespace-normal break-words',
    !props.model.billing_usage_schema && 'tracking-wider uppercase'
  )

  if (isDynamicPricingModel(props.model)) {
    const dynamicTiers = props.model.billing_usage_schema
      ? getTaskPricingDisplayTiers(
          props.model.billing_expr,
          props.model.billing_usage_schema
        )
      : getDynamicPricingTiers(props.model)
    const hasRequestPrice = dynamicTiers.some(
      (tier) => !('unitPrices' in tier) && tier.billingUnit === 'request'
    )

    if (dynamicTiers.length === 0) {
      return (
        <section>
          {!props.hideTitle && (
            <SectionTitle>{t('Pricing by Group')}</SectionTitle>
          )}
          <AutoGroupChain model={props.model} autoGroups={props.autoGroups} />
          <div className='rounded-lg border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10'>
            <div className='text-sm font-medium text-amber-800 dark:text-amber-200'>
              {t('Special billing expression')}
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t(
                pricingDisplayFallbackKey(
                  props.model.billing_expr || '',
                  props.model.billing_usage_schema
                )
              )}
            </p>
            <div className='mt-3'>
              <div className='text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase'>
                {t('Raw expression')}
              </div>
              <code className='text-muted-foreground bg-background/80 block max-h-28 overflow-auto rounded-md border px-2 py-1.5 font-mono text-xs break-all'>
                {props.model.billing_expr}
              </code>
            </div>
          </div>
        </section>
      )
    }

    const usageExampleRows = evaluateTaskUsageExamples(
      props.model.billing_expr,
      props.model.billing_usage_schema,
      props.model.billing_usage_examples
    )
    const priceFields = getDynamicPriceFields(dynamicTiers, {
      tokenUnit: props.tokenUnit,
      showRechargePrice,
      priceRate: props.priceRate,
      usdExchangeRate: props.usdExchangeRate,
      groupRatioMultiplier: 1,
      usageSchema: props.model.billing_usage_schema,
    })
    const formattedPricesByGroup = new Map(
      availableGroups.map((group) => {
        const ratio = props.groupRatio[group] || 1
        return [
          group,
          getDynamicFormattedPricesByTier(dynamicTiers, {
            tokenUnit: props.tokenUnit,
            showRechargePrice,
            priceRate: props.priceRate,
            usdExchangeRate: props.usdExchangeRate,
            groupRatioMultiplier: ratio,
            usageSchema: props.model.billing_usage_schema,
          }),
        ] as const
      })
    )

    return (
      <section>
        {!props.hideTitle && (
          <SectionTitle>{t('Pricing by Group')}</SectionTitle>
        )}
        <AutoGroupChain model={props.model} autoGroups={props.autoGroups} />
        <div className='space-y-3'>
          {availableGroups.map((group) => {
            const ratio = props.groupRatio[group] || 1
            const formattedPricesByTier =
              formattedPricesByGroup.get(group) ??
              new Map<DynamicPricingTier, Map<string, string>>()

            return (
              <div key={group} className='overflow-hidden rounded-lg border'>
                <div className='bg-muted/20 flex items-center justify-between gap-3 border-b px-3 py-2'>
                  <GroupBadge group={group} size='sm' />
                  <span className='text-muted-foreground font-mono text-xs'>
                    {ratio}x
                  </span>
                </div>
                <StaticDataTable
                  className='rounded-none border-0'
                  tableClassName='text-sm'
                  headerRowClassName='hover:bg-transparent'
                  data={dynamicTiers}
                  getRowKey={(tier, tierIndex) =>
                    `${group}-${tier.label}-${tierIndex}`
                  }
                  columns={[
                    ...(hasSimpleTaskPricing(props.model)
                      ? []
                      : [
                          {
                            id: 'tier',
                            header: props.model.billing_usage_schema
                              ? t('Applicable conditions')
                              : t('Tier'),
                            className: thClass,
                            cellClassName:
                              'text-muted-foreground py-2.5 whitespace-normal break-words',
                            cell: (tier: DynamicPricingTier) => {
                              if ('unitPrices' in tier) {
                                return (
                                  taskTierConditions(
                                    tier as ParsedTaskTier,
                                    props.model.billing_usage_schema,
                                    i18n.language,
                                    t
                                  ) ||
                                  t(
                                    dynamicTiers.length > 1
                                      ? 'Other cases'
                                      : 'All requests'
                                  )
                                )
                              }
                              if (tier.conditionText) {
                                return `${tier.label}: ${formatBillingCondition(tier.conditionText, t, i18n.language) ?? tier.conditionText}`
                              }
                              return tier.label || t('Default')
                            },
                          },
                        ]),
                    ...priceFields.map((fieldEntry) => {
                      const unitLabelKey =
                        getDynamicPriceUnitLabelKey(fieldEntry)
                      let unitLabel = taskUsageUnitLabel(
                        fieldEntry,
                        i18n.language,
                        unitLabelKey ? t(unitLabelKey) : ''
                      )
                      if (!unitLabel && hasRequestPrice) {
                        unitLabel = t('{{unit}} tokens', {
                          unit: tokenUnitLabel,
                        })
                      }
                      const fieldLabel =
                        fieldEntry.labelKind === 'schema' ? (
                          <DynamicPriceEntryLabel entry={fieldEntry} />
                        ) : (
                          t(fieldEntry.shortLabel)
                        )
                      return {
                        id: fieldEntry.field,
                        header: unitLabel ? (
                          <>
                            {fieldLabel}
                            {` / ${unitLabel}`}
                          </>
                        ) : (
                          fieldLabel
                        ),
                        className: `${thClass} text-right`,
                        cellClassName: 'py-2.5 text-right font-mono',
                        cell: (tier: (typeof dynamicTiers)[number]) =>
                          formattedPricesByTier
                            .get(tier)
                            ?.get(fieldEntry.field) ?? '-',
                      }
                    }),
                  ]}
                />
                {usageExampleRows.length > 0 ? (
                  <div className='border-t'>
                    <div className='text-muted-foreground px-3 pt-2 text-[10px] font-medium tracking-wider uppercase'>
                      {t('Price examples')}
                    </div>
                    <StaticDataTable
                      className='rounded-none border-0'
                      tableClassName='text-sm'
                      headerRowClassName='hover:bg-transparent'
                      data={usageExampleRows}
                      getRowKey={(row) => `${group}-${row.label}`}
                      columns={[
                        {
                          id: 'spec',
                          header: t('Spec'),
                          className: thClass,
                          cellClassName: 'text-muted-foreground py-2.5',
                          cell: (row) => row.label,
                        },
                        {
                          id: 'price',
                          header: t('Example price'),
                          className: `${thClass} text-right`,
                          cellClassName: 'py-2.5 text-right font-mono',
                          cell: (row) =>
                            `≈ ${formatTaskUsageUnitPrice(row.total, {
                              tokenUnit: props.tokenUnit,
                              showRechargePrice,
                              priceRate: props.priceRate,
                              usdExchangeRate: props.usdExchangeRate,
                              groupRatioMultiplier: ratio,
                            })}`,
                        },
                      ]}
                    />
                    <p className='text-muted-foreground/40 px-3 pb-2 text-[10px]'>
                      {t('Approximate prices for common specs.')}
                    </p>
                  </div>
                ) : null}
              </div>
            )
          })}
          <p className='text-muted-foreground/40 mt-1.5 text-[10px]'>
            {dynamicTiers.some(
              (tier) => 'unitPrices' in tier || tier.billingUnit === 'request'
            )
              ? t('Prices shown per usage unit')
              : `${t('Prices shown per')} ${tokenUnitLabel} tokens`}
          </p>
        </div>
      </section>
    )
  }

  if (isUnconfiguredTaskUsageModel(props.model)) {
    return (
      <section>
        {!props.hideTitle && (
          <SectionTitle>{t('Pricing by Group')}</SectionTitle>
        )}
        <AutoGroupChain model={props.model} autoGroups={props.autoGroups} />
        <UnconfiguredTaskPricingNotice model={props.model} />
      </section>
    )
  }

  const renderGroupPrice = (group: string, type: PriceType) =>
    formatGroupPrice(
      props.model,
      group,
      type,
      props.tokenUnit,
      showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      props.groupRatio
    )
  const renderFixedGroupPrice = (group: string) =>
    formatFixedPrice(
      props.model,
      group,
      showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      props.groupRatio
    )

  return (
    <section>
      {!props.hideTitle && <SectionTitle>{t('Pricing by Group')}</SectionTitle>}
      <AutoGroupChain model={props.model} autoGroups={props.autoGroups} />
      <StaticDataTable
        className='-mx-4 rounded-none border-0 sm:mx-0'
        tableClassName='text-sm'
        headerRowClassName='hover:bg-transparent'
        data={availableGroups}
        getRowKey={(group) => group}
        columns={[
          {
            id: 'group',
            header: t('Group'),
            className: thClass,
            cellClassName: 'py-2.5',
            cell: (group) => <GroupBadge group={group} size='sm' />,
          },
          {
            id: 'ratio',
            header: t('Ratio'),
            className: thClass,
            cellClassName: 'text-muted-foreground py-2.5 font-mono',
            cell: (group) => `${props.groupRatio[group] || 1}x`,
          },
          ...(isTokenBased
            ? [
                {
                  id: 'input',
                  header: t('Input'),
                  className: `${thClass} text-right`,
                  cellClassName: 'py-2.5 text-right font-mono',
                  cell: (group: string) => renderGroupPrice(group, 'input'),
                },
                {
                  id: 'output',
                  header: t('Output'),
                  className: `${thClass} text-right`,
                  cellClassName: 'py-2.5 text-right font-mono',
                  cell: (group: string) => renderGroupPrice(group, 'output'),
                },
                ...extraPriceTypes.map((ep) => ({
                  id: ep.type,
                  header: ep.label,
                  className: `${thClass} text-right`,
                  cellClassName: 'py-2.5 text-right font-mono',
                  cell: (group: string) => renderGroupPrice(group, ep.type),
                })),
              ]
            : [
                {
                  id: 'price',
                  header: t('Price'),
                  className: `${thClass} text-right`,
                  cellClassName: 'py-2.5 text-right font-mono',
                  cell: renderFixedGroupPrice,
                },
              ]),
        ]}
      />
      <div className='-mx-4 sm:mx-0'>
        {isTokenBased && (
          <p className='text-muted-foreground/40 mt-1.5 px-4 text-[10px] sm:px-0'>
            {t('Prices shown per')} {tokenUnitLabel} tokens
          </p>
        )}
      </div>
    </section>
  )
}

export interface ModelDetailsContentProps {
  model: PricingModel
  groupRatio: Record<string, number>
  usableGroup: Record<string, { desc: string; ratio: number }>
  endpointMap: Record<string, { path?: string; method?: string }>
  autoGroups: string[]
  priceRate: number
  usdExchangeRate: number
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
  onTry?: (modelName: string) => void
}

export function ModelDetailsContent(props: ModelDetailsContentProps) {
  const { t } = useTranslation()
  const showRechargePrice = props.showRechargePrice ?? false

  const isDynamic =
    props.model.billing_mode === 'tiered_expr' &&
    Boolean(props.model.billing_expr)

  const simpleTaskPricing = hasSimpleTaskPricing(props.model)
  const taskTiers = getTaskPricingDisplayTiers(
    props.model.billing_expr,
    props.model.billing_usage_schema
  )
  const showBasePrices =
    !props.model.billing_usage_schema ||
    simpleTaskPricing ||
    taskTiers.length === 0

  const tierGroupOptions = useMemo(
    () =>
      isDynamic && !simpleTaskPricing
        ? getAvailableGroups(props.model, props.usableGroup || {})
        : [],
    [isDynamic, simpleTaskPricing, props.model, props.usableGroup]
  )
  const [tierGroup, setTierGroup] = useState<string | null>(null)
  const selectedTierGroup =
    tierGroup && tierGroupOptions.includes(tierGroup)
      ? tierGroup
      : (tierGroupOptions[0] ?? '')

  return (
    <div className='@container/details'>
      <ModelHeader model={props.model} onTry={props.onTry} />

      <ModelStatsRow model={props.model} />

      <ModelDescriptionSection model={props.model} />

      <section className='border-border/50 mb-6 overflow-hidden rounded-xl border'>
        <div className='border-border/40 border-b px-6 py-4'>
          <h2 className='text-foreground text-sm font-medium'>
            {t('Available groups')}
          </h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {t(
              'Different token groups have different prices, unit: million tokens (M)'
            )}
          </p>
        </div>
        <GroupPricingSection
          model={props.model}
          groupRatio={props.groupRatio}
          usableGroup={props.usableGroup}
          autoGroups={props.autoGroups}
          priceRate={props.priceRate}
          usdExchangeRate={props.usdExchangeRate}
          tokenUnit={props.tokenUnit}
          showRechargePrice={showRechargePrice}
        />
      </section>

      {isDynamic && !simpleTaskPricing && (
        <section className='border-border/50 mb-6 overflow-hidden rounded-xl border'>
          <div className='border-border/40 flex flex-wrap items-center gap-3 border-b px-6 py-4'>
            <div className='min-w-0 flex-1'>
              <h2 className='text-foreground text-sm font-medium'>
                {t('Tiered pricing')}
              </h2>
              <p className='text-muted-foreground mt-0.5 text-xs'>
                {t(
                  'Requests are billed at the matching tier price when the following token conditions are met'
                )}
              </p>
            </div>
            {tierGroupOptions.length > 1 && (
              <Select
                items={tierGroupOptions.map((group) => ({
                  value: group,
                  label: group,
                }))}
                value={selectedTierGroup}
                onValueChange={(next) => setTierGroup(next)}
              >
                <SelectTrigger className='w-40' aria-label={t('Token group')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tierGroupOptions.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DynamicPricingBreakdown
            billingExpr={props.model.billing_expr}
            compact
            detailTierTable={!props.model.billing_usage_schema}
            groupRatioMultiplier={getConfiguredGroupRatio(
              props.groupRatio,
              selectedTierGroup
            )}
            usageSchema={props.model.billing_usage_schema}
            taskPriceOptions={{
              showRechargePrice,
              priceRate: props.priceRate,
              usdExchangeRate: props.usdExchangeRate,
            }}
          />
        </section>
      )}

      {showBasePrices && props.model.billing_usage_schema && (
        <section className='border-border/50 mb-6 rounded-xl border px-6 py-4'>
          <PriceSection
            model={props.model}
            priceRate={props.priceRate}
            usdExchangeRate={props.usdExchangeRate}
            tokenUnit={props.tokenUnit}
            showRechargePrice={showRechargePrice}
          />
        </section>
      )}

      <ModelEndpointSection
        model={props.model}
        endpointMap={props.endpointMap}
      />

      <ModelAvailabilitySection model={props.model} />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Drawer & page wrappers
// ----------------------------------------------------------------------------

export function ModelDetails() {
  const { t } = useTranslation()
  const { modelId } = useParams({ from: '/pricing/$modelId/' })
  const search = useSearch({ from: '/pricing/$modelId/' })
  const navigate = useNavigate()

  const {
    models,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const tokenUnit: TokenUnit =
    search.tokenUnit === 'K' ? 'K' : DEFAULT_TOKEN_UNIT

  const [tryModelName, setTryModelName] = useState<string | null>(null)

  const tryModel = useMemo(
    () => models.find((item) => item.model_name === tryModelName) ?? null,
    [models, tryModelName]
  )

  const handleTry = useCallback(
    (modelName: string) => {
      if (!useAuthStore.getState().auth.user) {
        void navigate({
          to: '/sign-in',
          search: { redirect: window.location.href },
        })
        return
      }
      setTryModelName(modelName)
    },
    [navigate]
  )

  const model = useMemo(() => {
    if (!models || !modelId) return null
    return models.find((m) => m.model_name === modelId) || null
  }, [models, modelId])

  const handleBack = () => {
    navigate({ to: '/pricing', search })
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-10'>
          <Skeleton className='mb-4 h-5 w-16' />
          <div className='space-y-2'>
            <Skeleton className='h-7 w-64' />
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-4 w-full max-w-md' />
          </div>
          <div className='mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {MODEL_DETAILS_SKELETON_KEYS.map((key) => (
              <Skeleton key={`metric-${key}`} className='h-16 w-full' />
            ))}
          </div>
          <div className='mt-6 space-y-3'>
            {MODEL_DETAILS_SKELETON_KEYS.map((key) => (
              <Skeleton key={`section-${key}`} className='h-24 w-full' />
            ))}
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (!model) {
    return (
      <PublicLayout>
        <div className='mx-auto max-w-2xl px-4 text-center sm:px-6'>
          <h2 className='mb-1 text-base font-semibold'>
            {t('Model not found')}
          </h2>
          <p className='text-muted-foreground mb-4 text-sm'>
            {t("The model you're looking for doesn't exist.")}
          </p>
          <Button onClick={handleBack} variant='outline' size='sm'>
            {t('Back to Models')}
          </Button>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-10'>
        <nav className='text-muted-foreground mb-10 flex min-w-0 flex-wrap items-center gap-1.5 text-sm'>
          <button
            className='hover:text-foreground inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm transition-colors'
            onClick={handleBack}
            type='button'
          >
            <ArrowLeft className='size-4' />
            {t('Back')}
          </button>
          {model.vendor_name && (
            <>
              <ChevronRight className='text-muted-foreground/60 size-3.5 shrink-0' />
              <span className='truncate'>{model.vendor_name}</span>
            </>
          )}
          <ChevronRight className='text-muted-foreground/60 size-3.5 shrink-0' />
          <span className='text-foreground truncate font-normal'>
            {model.model_name}
          </span>
        </nav>

        <ModelDetailsContent
          autoGroups={autoGroups || []}
          endpointMap={
            (endpointMap as Record<
              string,
              { path?: string; method?: string }
            >) || {}
          }
          groupRatio={groupRatio || {}}
          model={model}
          onTry={handleTry}
          priceRate={priceRate ?? 1}
          showRechargePrice={search.rechargePrice ?? false}
          tokenUnit={tokenUnit}
          usableGroup={usableGroup || {}}
          usdExchangeRate={usdExchangeRate ?? 1}
        />

        <ModelTryDrawer
          endpointMap={
            (endpointMap as Record<
              string,
              { path?: string; method?: string }
            >) || {}
          }
          groupRatio={groupRatio}
          model={tryModel}
          onOpenChange={(open: boolean) => {
            if (!open) setTryModelName(null)
          }}
          open={Boolean(tryModel)}
          priceRate={priceRate}
          selectedGroup={search.group}
          showRechargePrice={search.rechargePrice ?? false}
          tokenUnit={tokenUnit}
          usdExchangeRate={usdExchangeRate}
        />
      </div>
    </PublicLayout>
  )
}
