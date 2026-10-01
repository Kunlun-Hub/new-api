import { zodResolver } from '@hookform/resolvers/zod'
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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import { JsonCodeEditor } from '@/components/json-code-editor'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { formatJsonForEditor, normalizeJsonString } from './utils'

const PRICE_NOTICE_TYPES = ['price_up', 'price_cut', 'update'] as const

const priceNoticeSchema = z.object({
  enabled: z.boolean(),
  json: z.string().superRefine((value, ctx) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(normalizeJsonString(value, '[]'))
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON data',
      })
      return
    }
    if (!Array.isArray(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON data',
      })
      return
    }
    parsed.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item ${index + 1} must be an object`,
        })
        return
      }
      const record = item as Record<string, unknown>
      if (typeof record.content !== 'string' || record.content === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item ${index + 1} is missing content`,
        })
      }
      if (typeof record.publishDate !== 'string' || record.publishDate === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item ${index + 1} is missing publishDate`,
        })
      }
      if (
        record.type !== undefined &&
        !PRICE_NOTICE_TYPES.includes(
          record.type as (typeof PRICE_NOTICE_TYPES)[number]
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item ${index + 1} has an invalid type`,
        })
      }
    })
  }),
})

type PriceNoticeFormValues = z.infer<typeof priceNoticeSchema>

type PriceNoticeSectionProps = {
  enabled: boolean
  data: string
}

const PLACEHOLDER = `[
  {
    "content": "Model group ratio price cut\\n\\ncodex 0.35x -> 0.3x",
    "publishDate": "2026-01-01T00:00:00+08:00",
    "type": "price_cut"
  }
]`

export function PriceNoticeSection({ enabled, data }: PriceNoticeSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<PriceNoticeFormValues>({
    mode: 'onChange',
    resolver: zodResolver(priceNoticeSchema),
    defaultValues: {
      enabled,
      json: formatJsonForEditor(data, '[]'),
    },
  })

  useEffect(() => {
    form.reset({ enabled, json: formatJsonForEditor(data, '[]') })
  }, [enabled, data, form])

  const onSubmit = async (values: PriceNoticeFormValues) => {
    const updates: Array<{ key: string; value: string | boolean }> = []

    if (values.enabled !== enabled) {
      updates.push({
        key: 'console_setting.price_notice_enabled',
        value: values.enabled,
      })
    }

    const normalized = normalizeJsonString(values.json, '[]')
    if (normalized !== normalizeJsonString(data, '[]')) {
      updates.push({ key: 'console_setting.price_notice', value: normalized })
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  return (
    <SettingsSection title={t('Price Updates')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Module availability')}</FormLabel>
                  <FormDescription>
                    {t('Show price updates on the dashboard')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />
          <FormField
            control={form.control}
            name='json'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Price notice data')}</FormLabel>
                <FormControl>
                  <JsonCodeEditor
                    value={field.value}
                    onChange={field.onChange}
                    name={field.name}
                    onBlur={field.onBlur}
                    textareaRef={field.ref}
                    placeholder={PLACEHOLDER}
                    heightClassName='h-72 min-h-72 max-h-72'
                    aria-invalid={Boolean(form.formState.errors.json)}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'Each entry needs content, a publish date and a type of price_up, price_cut or update.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
