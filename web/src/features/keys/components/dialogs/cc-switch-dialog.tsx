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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Info, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ComboboxInput } from '@/components/ui/combobox-input'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getUserModels } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { useApiAddresses } from '../../hooks/use-api-addresses'

const APP_CONFIGS = {
  claude: {
    label: 'Claude',
    defaultName: 'My Claude',
    modelFields: [
      { key: 'model', labelKey: 'Primary Model', required: true },
      {
        key: 'haikuModel',
        labelKey: 'Haiku Model (optional)',
        required: false,
      },
      {
        key: 'sonnetModel',
        labelKey: 'Sonnet Model (optional)',
        required: false,
      },
      { key: 'opusModel', labelKey: 'Opus Model (optional)', required: false },
    ],
  },
  codex: {
    label: 'Codex',
    defaultName: 'My Codex',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  gemini: {
    label: 'Gemini',
    defaultName: 'My Gemini',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
} as const

type AppType = keyof typeof APP_CONFIGS

function buildCCSwitchURL(
  app: string,
  name: string,
  models: Record<string, string>,
  apiKey: string,
  serverAddress: string
): string {
  const endpoint = app === 'codex' ? `${serverAddress}/v1` : serverAddress
  const params = new URLSearchParams()
  params.set('resource', 'provider')
  params.set('app', app)
  params.set('name', name)
  params.set('endpoint', endpoint)
  params.set('apiKey', apiKey)
  for (const [k, v] of Object.entries(models)) {
    if (v) params.set(k, v)
  }
  params.set('homepage', serverAddress)
  params.set('enabled', 'true')
  return `ccswitch://v1/import?${params.toString()}`
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenKey: string
  tokenName?: string
}

export function CCSwitchDialog(props: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { addresses } = useApiAddresses()
  const [app, setApp] = useState<AppType>('claude')
  const [name, setName] = useState<string>(APP_CONFIGS.claude.defaultName)
  const [baseUrl, setBaseUrl] = useState<string>('')
  const [models, setModels] = useState<Record<string, string>>({})

  const { data: modelsData, isFetching } = useQuery({
    queryKey: ['user-models-ccswitch'],
    queryFn: async () => requireServerSuccess(await getUserModels()),
    enabled: props.open,
    staleTime: 5 * 60 * 1000,
  })

  const modelOptions = useMemo(() => {
    const items = modelsData?.data ?? []
    return items.map((model) => ({ value: model, label: model }))
  }, [modelsData?.data])

  const wasOpen = useRef(false)
  const primaryAddress = addresses[0]?.url ?? ''

  useEffect(() => {
    if (!props.open) {
      wasOpen.current = false
      return
    }
    if (!wasOpen.current) {
      wasOpen.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModels({})

      setApp('claude')

      setName(props.tokenName || APP_CONFIGS.claude.defaultName)
    }
    if (!baseUrl && primaryAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseUrl(primaryAddress)
    }
  }, [props.open, props.tokenName, baseUrl, primaryAddress])

  const currentConfig = APP_CONFIGS[app]

  const handleAppChange = (values: string[]) => {
    const nextApp = (values[0] ?? 'claude') as AppType
    setApp(nextApp)
    setModels({})
  }

  const handleRefreshModels = () => {
    void queryClient.invalidateQueries({ queryKey: ['user-models-ccswitch'] })
  }

  const selectedAddress = addresses.find((address) => address.url === baseUrl)

  const handleSubmit = () => {
    if (!models.model) {
      toast.warning(t('Please select a primary model'))
      return
    }
    const serverAddress = baseUrl || addresses[0]?.url || ''
    const key = props.tokenKey.startsWith('sk-')
      ? props.tokenKey
      : `sk-${props.tokenKey}`
    const url = buildCCSwitchURL(app, name, models, key, serverAddress)
    window.open(url, '_blank')
    props.onOpenChange(false)
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('Configure CC Switch')}
      description={t(
        'Pick a line and models, then open the installed CC Switch'
      )}
      contentClassName='sm:max-w-lg'
      contentHeight='auto'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!models.model}>
            <ExternalLink aria-hidden='true' />
            {t('Fill into CC Switch')}
          </Button>
        </>
      }
    >
      <FieldGroup className='gap-5'>
        <Field>
          <FieldLabel>{t('Application')}</FieldLabel>
          <ToggleGroup
            variant='outline'
            value={[app]}
            onValueChange={handleAppChange}
            className='w-fit'
          >
            {Object.entries(APP_CONFIGS).map(([key, config]) => (
              <ToggleGroupItem key={key} value={key}>
                {config.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor='cc-switch-name'>{t('Name')}</FieldLabel>
          <Input
            id='cc-switch-name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={currentConfig.defaultName}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor='cc-switch-base-url'>{t('BaseURL')}</FieldLabel>
          <Select
            items={addresses.map((address) => ({
              value: address.url,
              label: `${address.route} · ${address.url}`,
            }))}
            value={baseUrl}
            onValueChange={(value) => setBaseUrl(value ?? '')}
          >
            <SelectTrigger id='cc-switch-base-url' className='w-full'>
              <SelectValue placeholder={t('Select an API address')} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {addresses.map((address) => (
                  <SelectItem key={address.url} value={address.url}>
                    {address.route} · {address.url}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {selectedAddress?.description ? (
            <FieldDescription>{selectedAddress.description}</FieldDescription>
          ) : null}
        </Field>

        <Alert>
          <Info aria-hidden='true' />
          <AlertDescription>
            {t(
              'Available models depend on the current token permissions and group. Edit the token to change its group.'
            )}
          </AlertDescription>
        </Alert>

        {currentConfig.modelFields.map((field) => (
          <Field key={field.key}>
            <div className='flex items-center justify-between'>
              <FieldLabel htmlFor={`cc-switch-${field.key}`}>
                {t(field.labelKey)}
              </FieldLabel>
              {field.required && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleRefreshModels}
                >
                  <RefreshCw
                    aria-hidden='true'
                    className={isFetching ? 'animate-spin' : undefined}
                  />
                  {t('Refresh')}
                </Button>
              )}
            </div>
            <ComboboxInput
              id={`cc-switch-${field.key}`}
              aria-label={t(field.labelKey)}
              options={modelOptions}
              value={models[field.key] || ''}
              onValueChange={(value) =>
                setModels((prev) => ({ ...prev, [field.key]: value }))
              }
              placeholder={t('Search and select a model')}
              emptyText={t('No models found')}
              allowCustomValue
            />
          </Field>
        ))}
      </FieldGroup>
    </Dialog>
  )
}
