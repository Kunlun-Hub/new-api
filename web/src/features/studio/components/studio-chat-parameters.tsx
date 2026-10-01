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
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { InputGroupButton } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { PlaygroundConfig } from '@/features/playground/types'

type StudioChatParametersProps = {
  config: PlaygroundConfig
  disabled?: boolean
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
}

/** Sampling and prompt parameters shown behind the composer settings button. */
export function StudioChatParameters(props: StudioChatParametersProps) {
  const { t } = useTranslation()
  const { config, disabled } = props

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
                  disabled={disabled}
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
        className='w-80 space-y-4 p-4'
        collisionPadding={8}
        sideOffset={4}
      >
        <div className='space-y-2'>
          <Label className='text-xs'>
            {t('Temperature (randomness)')}:{' '}
            <span className='text-muted-foreground'>
              {config.temperature.toFixed(1)}
            </span>
          </Label>
          <Slider
            max={1}
            min={0}
            onValueChange={(value) =>
              props.onConfigChange(
                'temperature',
                Array.isArray(value) ? value[0] : value
              )
            }
            step={0.1}
            value={[config.temperature]}
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-xs'>
            {t('Maximum context turns')}:{' '}
            <span className='text-muted-foreground'>{config.max_context}</span>
          </Label>
          <Slider
            max={50}
            min={2}
            onValueChange={(value) =>
              props.onConfigChange(
                'max_context',
                Array.isArray(value) ? value[0] : value
              )
            }
            step={1}
            value={[config.max_context]}
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-xs'>
            {t('Maximum response tokens')}
            <span className='text-muted-foreground'>{config.max_tokens}</span>
          </Label>
          <Slider
            max={80000}
            min={100}
            onValueChange={(value) =>
              props.onConfigChange(
                'max_tokens',
                Array.isArray(value) ? value[0] : value
              )
            }
            step={100}
            value={[config.max_tokens]}
          />
          <span className='text-muted-foreground text-xs'>
            {t('Increase this value if the model returns an empty response.')}
          </span>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs'>{t('System prompt')}</Label>
          <Textarea
            className='thin-scrollbar max-h-40 min-h-20 resize-none text-sm'
            onChange={(event) =>
              props.onConfigChange('system', event.target.value)
            }
            placeholder={t(
              'Set an AI role or instruction. Leave blank to disable.'
            )}
            value={config.system}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
