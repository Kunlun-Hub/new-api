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
import { BrushCleaning, Info, Settings2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroupButton } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  optionsForModel,
  panelFields,
  type StudioVideoField,
  type StudioVideoSchema,
  type StudioVideoValues,
} from '../lib/video-params'
import { ParametersMarker } from './parameters-marker'

type StudioVideoParametersProps = {
  schema: StudioVideoSchema
  model: string
  values: StudioVideoValues
  canReset: boolean
  disabled?: boolean
  onChange: (name: string, value: string) => void
  onReset: () => void
}

/** Schema driven parameter panel of the studio video composer. */
export function StudioVideoParameters(props: StudioVideoParametersProps) {
  const { t } = useTranslation()
  const fields = panelFields(props.schema, props.values, props.model)
  let advancedRendered = false

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <InputGroupButton
                  aria-label={t('Parameters')}
                  className='text-muted-foreground'
                  disabled={props.disabled}
                  size='icon-sm'
                />
              }
            />
          }
        >
          <Settings2 className='size-4' />
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('Parameters')}</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align='start'
        className='thin-scrollbar max-h-[min(65vh,34rem)] w-88 overflow-y-auto p-5'
        collisionPadding={8}
        sideOffset={4}
      >
        <div className='mb-4 flex items-center justify-between gap-3'>
          <h3 className='text-sm font-medium'>{t('Parameters')}</h3>
          <Button
            aria-label={t('Restore default parameters')}
            className='text-muted-foreground'
            disabled={!props.canReset}
            onClick={props.onReset}
            size='xs'
            variant='outline'
          >
            <BrushCleaning className='size-3.5' />
            {t('Restore defaults')}
          </Button>
        </div>

        <div className='space-y-4'>
          {fields.map((field) => {
            const nodes: ReactNode[] = []
            if (field.section === 'advanced' && !advancedRendered) {
              advancedRendered = true
              nodes.push(
                <ParametersMarker key='advanced' label={t('Advanced')} />
              )
            }
            nodes.push(
              <StudioVideoFieldControl
                field={field}
                key={field.name}
                model={props.model}
                onChange={props.onChange}
                value={props.values[field.name] ?? field.default ?? ''}
              />
            )
            return nodes
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type StudioVideoFieldControlProps = {
  field: StudioVideoField
  model: string
  value: string
  onChange: (name: string, value: string) => void
}

function StudioVideoFieldControl(props: StudioVideoFieldControlProps) {
  const { t } = useTranslation()
  const { field } = props
  const label = (
    <Label className='flex items-center gap-2 text-xs'>
      <span>{t(field.label)}</span>
      {field.billable ? (
        <span className='text-muted-foreground font-normal'>
          {t('Billable item')}
        </span>
      ) : null}
    </Label>
  )

  if (field.type === 'alert') {
    const warning = field.alertVariant === 'warning'
    return (
      <Alert variant={warning ? 'warning' : 'info'}>
        {warning ? <TriangleAlert /> : <Info />}
        <AlertTitle>{t(field.label)}</AlertTitle>
        <AlertDescription className='text-xs'>
          {t(field.description ?? '')}
        </AlertDescription>
      </Alert>
    )
  }

  if (field.type === 'switch') {
    return (
      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-3'>
          {label}
          <Switch
            checked={props.value === 'on'}
            onCheckedChange={(checked) =>
              props.onChange(field.name, checked ? 'on' : 'off')
            }
          />
        </div>
        {field.description ? (
          <p className='text-muted-foreground/70 text-xs'>
            {t(field.description)}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.type === 'slider') {
    return (
      <div className='space-y-2'>
        <Label className='text-xs'>
          {t(field.label)}:{' '}
          <span className='text-muted-foreground'>{props.value}</span>
        </Label>
        <Slider
          max={field.max ?? 100}
          min={field.min ?? 0}
          onValueChange={(next) => {
            const resolved = Array.isArray(next) ? next[0] : next
            props.onChange(field.name, String(resolved))
          }}
          step={field.step ?? 1}
          value={[Number(props.value)]}
        />
        {field.description ? (
          <p className='text-muted-foreground/70 text-xs'>
            {t(field.description)}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className='space-y-2'>
        <Label className='text-xs'>
          {t(field.label)}
          {field.required ? null : (
            <span className='text-muted-foreground'>({t('Optional')})</span>
          )}
        </Label>
        <Input
          className='h-8 text-sm'
          inputMode='numeric'
          onChange={(event) =>
            props.onChange(
              field.name,
              event.target.value.replaceAll(/[^\d.-]/g, '')
            )
          }
          placeholder={field.placeholder ? t(field.placeholder) : undefined}
          value={props.value}
        />
        {field.description ? (
          <p className='text-muted-foreground/70 text-xs'>
            {t(field.description)}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className='space-y-2'>
        {label}
        <Textarea
          className='min-h-14 text-sm'
          onChange={(event) => props.onChange(field.name, event.target.value)}
          placeholder={field.placeholder ? t(field.placeholder) : undefined}
          rows={2}
          value={props.value}
        />
        {field.description ? (
          <p className='text-muted-foreground/70 text-xs'>
            {t(field.description)}
          </p>
        ) : null}
      </div>
    )
  }

  const options = optionsForModel(field.options, props.model)
  if (field.type === 'select') {
    return (
      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-3'>
          {label}
          <Select
            onValueChange={(next) => {
              if (next === null) return
              props.onChange(field.name, String(next))
            }}
            value={props.value}
          >
            <SelectTrigger className='w-50 shrink-0 text-xs' size='sm'>
              <SelectValue>
                {(() => {
                  const current = options.find(
                    (option) => option.value === props.value
                  )
                  if (!current) return props.value
                  return current.label ? t(current.label) : current.value
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align='start' alignItemWithTrigger={false}>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label ? t(option.label) : option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {field.description ? (
          <p className='text-muted-foreground/70 text-xs'>
            {t(field.description)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-3'>{label}</div>
      <div className='flex flex-wrap gap-1.5'>
        {options.map((option) => (
          <Button
            className='border-border/60 h-7 flex-1 text-xs'
            key={option.value}
            onClick={() => props.onChange(field.name, option.value)}
            size='sm'
            variant={props.value === option.value ? 'secondary' : 'outline'}
          >
            {option.label ? t(option.label) : option.value}
          </Button>
        ))}
      </div>
      {field.description ? (
        <p className='text-muted-foreground/70 text-xs'>
          {t(field.description)}
        </p>
      ) : null}
    </div>
  )
}
