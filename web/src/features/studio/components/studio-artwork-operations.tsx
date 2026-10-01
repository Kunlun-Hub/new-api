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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'

import {
  isMjCustomZoom,
  mjButtonLabelKey,
  mjQuickButtons,
  mjUsableButtons,
  type StudioMjButton,
} from '../lib/mj-actions'

type StudioArtworkOperationsProps = {
  buttons: StudioMjButton[]
  onOperation: (button: StudioMjButton, options?: { zoom?: number }) => void
}

/** U/V and tooling actions of a finished Midjourney artwork. */
export function StudioArtworkOperations(props: StudioArtworkOperationsProps) {
  const { t } = useTranslation()
  const usable = mjUsableButtons(props.buttons)

  if (usable.length === 0) {
    return (
      <>
        <h3 className='mt-6 text-sm font-medium'>{t('Image operations')}</h3>
        <p className='text-muted-foreground mt-2 text-xs'>
          {t(
            'This artwork has no available operations. Generate it again to use U/V and related actions.'
          )}
        </p>
      </>
    )
  }

  const quick = mjQuickButtons(usable)
  const others = usable.filter((button) => !/^[UV][1-4]$/.test(button.label))

  return (
    <>
      <h3 className='mt-6 text-sm font-medium'>{t('Image operations')}</h3>
      {quick.length > 0 ? (
        <>
          <div className='mt-2.5 grid grid-cols-4 gap-1.5'>
            {quick.map((button) => (
              <Button
                className='border-border/60 h-8 font-mono text-xs'
                key={button.customId}
                onClick={() => props.onOperation(button)}
                size='sm'
                variant='outline'
              >
                {button.label}
              </Button>
            ))}
          </div>
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('U upscales an image · V creates a variation')}
          </p>
        </>
      ) : null}
      {others.length > 0 ? (
        <div className='mt-3 flex flex-wrap gap-1.5'>
          {others.map((button) =>
            isMjCustomZoom(button) ? (
              <CustomZoomOperation
                button={button}
                key={button.customId}
                onSubmit={(zoom) => props.onOperation(button, { zoom })}
              />
            ) : (
              <Button
                className='border-border/60 text-muted-foreground h-7 px-2.5 text-xs font-normal'
                key={button.customId}
                onClick={() => props.onOperation(button)}
                size='sm'
                variant='outline'
              >
                {t(mjButtonLabelKey(button))}
              </Button>
            )
          )}
        </div>
      ) : null}
    </>
  )
}

type CustomZoomOperationProps = {
  button: StudioMjButton
  onSubmit: (zoom: number) => void
}

function CustomZoomOperation(props: CustomZoomOperationProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1.5)

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className='border-border/60 text-muted-foreground h-7 px-2.5 text-xs font-normal'
            size='sm'
            variant='outline'
          />
        }
      >
        {t(mjButtonLabelKey(props.button))}
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64 p-4'>
        <p className='text-xs font-medium'>
          {t('Zoom factor')}:{' '}
          <span className='text-muted-foreground'>{zoom.toFixed(1)}x</span>
        </p>
        <Slider
          className='mt-3'
          max={2}
          min={1.1}
          onValueChange={(value) =>
            setZoom(Array.isArray(value) ? value[0] : value)
          }
          step={0.1}
          value={[zoom]}
        />
        <Button
          className='mt-4 w-full'
          onClick={() => {
            setOpen(false)
            props.onSubmit(Number(zoom.toFixed(1)))
          }}
          size='sm'
        >
          {t('Confirm zoom')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
