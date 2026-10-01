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
'use client'

import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

type InputClearProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  'value' | 'onChange'
> & {
  value: string
  onValueChange: (value: string) => void
}

export function InputClear(props: InputClearProps) {
  const { t } = useTranslation()
  const { value, onValueChange, className, ...inputProps } = props

  return (
    <InputGroup className={cn('h-9', className)}>
      <InputGroupInput
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...inputProps}
      />
      {value !== '' && (
        <InputGroupAddon align='inline-end'>
          <InputGroupButton
            size='icon-sm'
            aria-label={t('Clear')}
            onClick={() => onValueChange('')}
          >
            <X className='size-4' aria-hidden='true' />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
