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
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import {
  sideDrawerContentClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { PlaygroundChat } from '@/features/playground/components/chat/playground-chat'
import { PlaygroundInput } from '@/features/playground/components/input/playground-input'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from '@/features/playground/hooks'
import { buildChatCompletionPayload } from '@/features/playground/lib'
import { isSidebarModuleEnabled } from '@/lib/nav-modules'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import { useBillingTime } from '../hooks/use-billing-time'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPricingSummary,
} from '../lib/dynamic-price'
import { replaceModelInPath } from '../lib/model-helpers'
import { formatPrice } from '../lib/price'
import type { PricingModel, TokenUnit } from '../types'

export interface ModelTryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: PricingModel | null
  endpointMap?: Record<string, { path?: string; method?: string }>
  groupRatio?: Record<string, number>
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
}

const VIEW_CHAT = 'chat'
const VIEW_CODE = 'code'

export function ModelTryDrawer(props: ModelTryDrawerProps) {
  const { t } = useTranslation()

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        className={sideDrawerContentClassName('sm:max-w-[680px]')}
        side='right'
      >
        <SheetTitle className='sr-only'>{t('Try')}</SheetTitle>
        <SheetDescription className='sr-only'>
          {t('Online trial')}
        </SheetDescription>
        {props.open && props.model ? (
          <ModelTryPanel
            endpointMap={props.endpointMap}
            groupRatio={props.groupRatio}
            model={props.model}
            priceRate={props.priceRate}
            selectedGroup={props.selectedGroup}
            showRechargePrice={props.showRechargePrice}
            tokenUnit={props.tokenUnit}
            usdExchangeRate={props.usdExchangeRate}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

type ModelTryPanelProps = Omit<
  ModelTryDrawerProps,
  'open' | 'onOpenChange' | 'model'
> & { model: PricingModel }

function ModelTryPanel(props: ModelTryPanelProps) {
  const { t } = useTranslation()
  const [view, setView] = useState(VIEW_CHAT)

  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
  } = usePlaygroundConversation({ messages, updateMessages, sendChat })

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: config.group,
    currentModel: config.model,
    setGroups,
    setModels,
    updateConfig,
  })

  const modelName = props.model.model_name
  const selectedGroup = props.selectedGroup

  useEffect(() => {
    if (modelName && modelName !== config.model) {
      updateConfig('model', modelName)
    }
  }, [modelName, config.model, updateConfig])

  useEffect(() => {
    if (!selectedGroup || selectedGroup === config.group) return
    if (!groups.some((group) => group.value === selectedGroup)) return
    updateConfig('group', selectedGroup)
  }, [selectedGroup, groups, config.group, updateConfig])

  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const tokenUnitLabel = tokenUnit === 'K' ? 'K' : 'M'
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const showRechargePrice = props.showRechargePrice ?? false
  const activeGroup = config.group
  const currency = useSystemConfigStore((state) => state.config.currency)
  const billingTime = useBillingTime(props.model.billing_expr)

  const dynamicPriceOptions = useMemo(
    () => ({
      now: billingTime === undefined ? undefined : new Date(billingTime),
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
      groupRatioMultiplier: getDynamicDisplayGroupRatio(
        props.model,
        activeGroup
      ),
    }),
    [
      props.model,
      activeGroup,
      billingTime,
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
    ]
  )

  const dynamicSummary = useMemo(
    () => getDynamicPricingSummary(props.model, dynamicPriceOptions),
    // Currency is read indirectly by the price formatter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.model, dynamicPriceOptions, currency]
  )

  const formatTokenPrice = (type: 'input' | 'output') => {
    const variableKey = type === 'input' ? 'p' : 'c'
    const entry = dynamicSummary?.primaryEntries.find(
      (item) =>
        item.unit === 'token' &&
        !item.formattedRange &&
        item.variable?.key === variableKey
    )
    if (entry) return entry.formatted
    return formatPrice(
      props.model,
      type,
      tokenUnit,
      showRechargePrice,
      priceRate,
      usdExchangeRate,
      activeGroup
    )
  }

  const groupRatio = useMemo(() => {
    const matched = groups.find((group) => group.value === activeGroup)
    const ratio = Number(matched?.ratio ?? props.groupRatio?.[activeGroup])
    if (!Number.isFinite(ratio)) return null
    return Number.isInteger(ratio)
      ? String(ratio)
      : String(Number(ratio.toFixed(2)))
  }, [groups, activeGroup, props.groupRatio])

  const endpointPath = useMemo(() => {
    const types = props.model.supported_endpoint_types ?? []
    for (const type of types) {
      const path = props.endpointMap?.[type]?.path
      if (!path) continue
      return path.includes('{model}')
        ? replaceModelInPath(path, modelName)
        : path
    }
    return ''
  }, [props.model.supported_endpoint_types, props.endpointMap, modelName])

  const requestBody = useMemo(() => {
    if (view !== VIEW_CODE) return ''
    return JSON.stringify(
      buildChatCompletionPayload(messages, config, parameterEnabled),
      null,
      2
    )
  }, [view, messages, config, parameterEnabled])

  const cannotOpenPlayground = !isSidebarModuleEnabled('chat', 'playground')

  let footerNote: ReactNode
  if (view === VIEW_CODE) {
    footerNote = endpointPath
      ? t('Current API endpoint {{path}}', { path: endpointPath })
      : t('Light trial mode only supports chat completions')
  } else {
    const fullExperience = t('Open chat for the full experience.')
    footerNote = (
      <>
        {t('Light trial mode.')}{' '}
        {cannotOpenPlayground ? (
          fullExperience
        ) : (
          <Link className='text-foreground hover:underline' to='/playground'>
            {fullExperience}
          </Link>
        )}
      </>
    )
  }

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  return (
    <>
      <header className={sideDrawerHeaderClassName('flex flex-row items-center')}>
        <h2 className='flex min-w-0 items-center gap-2 text-base font-medium'>
          {getLobeIcon(props.model.icon || props.model.vendor_icon, 20)}
          <span className='truncate font-mono text-sm'>{modelName}</span>
        </h2>
      </header>

      <div className='shrink-0 px-5 pt-5'>
        <div className='flex items-end gap-1'>
          {groups.map((group) => (
            <button
              className={cn(
                'cursor-pointer rounded-t-lg px-4 py-2 text-sm transition-colors',
                group.value === activeGroup
                  ? 'border-border/60 text-foreground -mb-px border border-b-transparent bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              key={group.value}
              onClick={() => updateConfig('group', group.value)}
              type='button'
            >
              {group.label}
            </button>
          ))}
          {groupRatio ? (
            <span className='text-foreground ml-auto pb-2 pr-1 text-xs'>
              {t('Ratio')} x{groupRatio}
            </span>
          ) : null}
        </div>
        <div className='border-border/60 bg-card rounded-xl rounded-tl-none border'>
          <div className='flex'>
            <div className='flex-1 px-3 py-4 text-center'>
              <div className='text-muted-foreground text-xs'>
                {t('Final input price')}
              </div>
              <div className='mt-1'>
                <span className='text-base font-semibold'>
                  {formatTokenPrice('input')}
                </span>
                <span className='text-xs'> / {tokenUnitLabel}</span>
              </div>
            </div>
            <div className='border-border/60 my-3 border-l border-dashed' />
            <div className='flex-1 px-3 py-4 text-center'>
              <div className='text-muted-foreground text-xs'>
                {t('Final output price')}
              </div>
              <div className='mt-1'>
                <span className='text-base font-semibold'>
                  {formatTokenPrice('output')}
                </span>
                <span className='text-xs'> / {tokenUnitLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='relative flex shrink-0 items-center justify-center py-1'>
        <div className='border-border/40 absolute inset-x-4 top-1/2 border-t' />
        <div className='border-border/60 bg-popover relative flex rounded-full border p-0.5'>
          <button
            className={cn(
              'cursor-pointer rounded-full px-3 py-1 text-xs transition-colors',
              view === VIEW_CHAT
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setView(VIEW_CHAT)}
            type='button'
          >
            {t('Chat view')}
          </button>
          <button
            className={cn(
              'cursor-pointer rounded-full px-3 py-1 text-xs transition-colors',
              view === VIEW_CODE
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setView(VIEW_CODE)}
            type='button'
          >
            {t('Code view')}
          </button>
        </div>
      </div>

      {view === VIEW_CHAT ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <PlaygroundChat
            editingKey={editingMessageKey}
            isLoadingMessages={isLoadingMessages}
            isGenerating={isGenerating}
            messages={messages}
            onCancelEdit={handleEditOpenChange}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onSaveEdit={(newContent) => applyEdit(newContent, false)}
            onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
            onSelectPrompt={handleSendMessage}
          />
          <div className='mx-auto w-full px-4 pb-1'>
            <PlaygroundInput
              config={config}
              disabled={isGenerating}
              groupValue={config.group}
              groups={groups}
              hasMessages={messages.length > 0}
              isGenerating={isGenerating}
              isModelLoading={isLoadingModels}
              modelValue={config.model}
              models={models}
              onClearMessages={handleClearMessages}
              onConfigChange={updateConfig}
              onGroupChange={(value) => updateConfig('group', value)}
              onModelChange={(value) => updateConfig('model', value)}
              onParameterEnabledChange={updateParameterEnabled}
              onStop={stopGeneration}
              onSubmit={handleSendMessage}
              parameterEnabled={parameterEnabled}
            />
          </div>
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <CodeBlock
            code={requestBody}
            language='json'
            showLineNumbers={false}
            showToolbar
            title='JSON'
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        </div>
      )}

      <p className='text-muted-foreground shrink-0 pb-4 text-center text-xs'>
        {footerNote}
      </p>
    </>
  )
}
