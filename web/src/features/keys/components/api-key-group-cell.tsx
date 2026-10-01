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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ApiKeyGroupCellProps = {
  crossGroupRetry: boolean
  group: string
  groupDescription?: string
  modelLimits?: string
  modelLimitsEnabled?: boolean
}

export function ApiKeyGroupCell(props: ApiKeyGroupCellProps) {
  const { t } = useTranslation()
  const group = props.group?.trim() || ''
  const groupLabel = group || t('Follow user group')
  const models =
    props.modelLimitsEnabled && props.modelLimits
      ? props.modelLimits
          .split(',')
          .map((model) => model.trim())
          .filter(Boolean)
      : []

  return (
    <div className='flex items-center'>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className='inline-flex items-center gap-1.5'
              tabIndex={0}
              data-api-key-group-cell=''
            />
          }
        >
          <span className='bg-primary size-2 rounded-full' aria-hidden='true' />
          <span className='max-w-30 truncate'>{groupLabel}</span>
        </TooltipTrigger>
        <TooltipContent>{props.groupDescription || groupLabel}</TooltipContent>
      </Tooltip>
      {props.crossGroupRetry && (
        <Badge className='ml-2 font-normal'>{t('Auto')}</Badge>
      )}
      {models.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant='outline'
                className='ml-2 cursor-help'
                render={<button type='button' />}
              />
            }
          >
            {t('Model restriction')}
          </TooltipTrigger>
          <TooltipContent>
            <div className='flex min-w-0 flex-col gap-1.5'>
              <p>{t('Authorized models')}</p>
              <ul className='flex max-h-60 flex-col gap-1 overflow-y-auto'>
                {models.map((model) => (
                  <li key={model} className='break-all'>
                    {model}
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
