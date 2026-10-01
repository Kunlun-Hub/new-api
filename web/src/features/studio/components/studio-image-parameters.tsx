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
import { BrushCleaning, Settings2, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
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
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import {
  MJ_FRAMINGS,
  MJ_LIGHTINGS,
  MJ_MODES,
  MJ_QUALITIES,
  MJ_STYLE_PRESETS,
  MJ_STYLIZATION_PRESETS,
  MJ_VIEWPOINTS,
  type StudioImageValues,
} from '../lib/image-params'
import { ParametersMarker } from './parameters-marker'

/** Sentinel used because the pickers cannot carry an empty option value. */
const NONE_OPTION = '__none__'

type StudioImageParametersProps = {
  values: StudioImageValues
  disabled?: boolean
  onChange: <K extends keyof StudioImageValues>(
    key: K,
    value: StudioImageValues[K]
  ) => void
  onReset: () => void
  onUploadReference?: (file: File) => Promise<string>
}

/** Midjourney parameter panel behind the composer settings button. */
export function StudioImageParameters(props: StudioImageParametersProps) {
  const { t } = useTranslation()
  const setValue = props.onChange

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
            className='text-muted-foreground'
            onClick={props.onReset}
            size='xs'
            variant='outline'
          >
            <BrushCleaning className='size-3.5' />
            {t('Restore defaults')}
          </Button>
        </div>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label className='text-xs'>
              <span>{t('Generation mode')}</span>
            </Label>
            <div className='flex flex-wrap gap-1.5'>
              {MJ_MODES.map((mode) => (
                <Button
                  className='border-border/60 h-7 flex-1 text-xs'
                  key={mode.value}
                  onClick={() =>
                    setValue('mode', mode.value as StudioImageValues['mode'])
                  }
                  size='sm'
                  variant={
                    props.values.mode === mode.value ? 'secondary' : 'outline'
                  }
                >
                  {t(mode.label)}
                </Button>
              ))}
            </div>
          </div>

          <ParametersSelect
            label='Quality --q'
            onChange={(value) => setValue('quality', value)}
            options={MJ_QUALITIES}
            value={props.values.quality}
          />

          <ParametersSlider
            label='Stylization --s'
            max={1000}
            onChange={(value) => setValue('stylize', value)}
            step={10}
            value={props.values.stylize}
          />

          <ParametersSlider
            label='Chaos --c'
            max={100}
            onChange={(value) => setValue('chaos', value)}
            value={props.values.chaos}
          />

          <ParametersSlider
            label='Weirdness --weird'
            max={3000}
            onChange={(value) => setValue('weird', value)}
            step={50}
            value={props.values.weird}
          />

          <ParametersMarker label={t('Prompt modifiers')} />

          <ParametersSelect
            label='Style'
            onChange={(value) => setValue('style', value)}
            options={MJ_STYLE_PRESETS}
            value={props.values.style}
          />

          <ParametersSelect
            label='Viewpoint'
            onChange={(value) => setValue('view', value)}
            options={MJ_VIEWPOINTS}
            value={props.values.view}
          />

          <ParametersSelect
            label='Portrait framing'
            onChange={(value) => setValue('shot', value)}
            options={MJ_FRAMINGS}
            value={props.values.shot}
          />

          <ParametersSelect
            label='Lighting'
            onChange={(value) => setValue('light', value)}
            options={MJ_LIGHTINGS}
            value={props.values.light}
          />

          <div className='space-y-2'>
            <ParametersSelect
              label='Artistic intensity'
              onChange={(value) => setValue('art', value)}
              options={MJ_STYLIZATION_PRESETS}
              value={props.values.art}
            />
            <p className='text-muted-foreground/70 text-xs'>
              {t(
                'A preset for --s stylization; when selected, it overrides the slider above'
              )}
            </p>
          </div>

          <ParametersMarker label={t('Reference image')} />

          <ReferenceField
            label='sref style reference'
            onChange={(value) => setValue('sref', value)}
            onUploadReference={props.onUploadReference}
            placeholder='Image URL used to match the style'
            value={props.values.sref}
          />

          <ReferenceField
            label='cref character reference'
            onChange={(value) => setValue('cref', value)}
            onUploadReference={props.onUploadReference}
            placeholder='Image URL used to match the character'
            value={props.values.cref}
          />

          <ReferenceField
            label='oref omni reference'
            onChange={(value) => setValue('oref', value)}
            onUploadReference={props.onUploadReference}
            placeholder='Image URL used as an omni reference'
            value={props.values.oref}
          />

          <ParametersSlider
            label='Character reference weight --cw'
            max={100}
            onChange={(value) => setValue('cw', value)}
            value={props.values.cw}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

type ParametersSelectProps = {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function ParametersSelect(props: ParametersSelectProps) {
  const { t } = useTranslation()
  const items = [
    { value: NONE_OPTION, label: t('None') },
    ...props.options.map((option) => ({
      value: option.value,
      label: t(option.label),
    })),
  ]

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-3'>
        <Label className='shrink-0 text-xs'>{t(props.label)}</Label>
        <Select
          items={items}
          onValueChange={(value) => {
            if (value === null) return
            const next = String(value)
            props.onChange(next === NONE_OPTION ? '' : next)
          }}
          value={props.value === '' ? NONE_OPTION : props.value}
        >
          <SelectTrigger className='w-50 text-xs' size='sm'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align='start' alignItemWithTrigger={false}>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

type ParametersSliderProps = {
  label: string
  value: number
  min?: number
  max: number
  step?: number
  onChange: (value: number) => void
}

function ParametersSlider(props: ParametersSliderProps) {
  const { t } = useTranslation()
  const [min, max] = [props.min ?? 0, props.max]

  return (
    <div className='space-y-2'>
      <Label className='text-xs'>
        {t(props.label)}:{' '}
        <span className='text-muted-foreground'>{props.value}</span>
      </Label>
      <Slider
        max={max}
        min={min}
        onValueChange={(value) =>
          props.onChange(Array.isArray(value) ? value[0] : value)
        }
        step={props.step ?? 1}
        value={[props.value]}
      />
    </div>
  )
}

type ReferenceFieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onUploadReference?: (file: File) => Promise<string>
}

function ReferenceField(props: ReferenceFieldProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !props.onUploadReference) return

    setUploading(true)
    try {
      props.onChange(await props.onUploadReference(file))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className='space-y-2'>
      <Label className='text-xs'>{t(props.label)}</Label>
      <InputGroup className='h-8 rounded-lg'>
        <InputGroupInput
          className='h-9 px-2.5 py-1'
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={t(props.placeholder)}
          value={props.value}
        />
        <InputGroupAddon align='inline-end'>
          <InputGroupButton
            aria-label={t('Upload reference image')}
            className={cn('text-muted-foreground', uploading && 'opacity-60')}
            disabled={!props.onUploadReference || uploading}
            onClick={() => fileRef.current?.click()}
            size='icon-xs'
          >
            {uploading ? (
              <Spinner className='size-3' />
            ) : (
              <Upload className='size-3' />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <input
        accept='image/*'
        className='hidden'
        onChange={handleFile}
        ref={fileRef}
        type='file'
      />
    </div>
  )
}
