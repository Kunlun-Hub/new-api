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

import {
  NoticeEditorSection,
  type NoticeEditorTypeOption,
} from './notice-editor-section'

type PriceNoticeSectionProps = {
  enabled: boolean
  data: string
}

const PRICE_NOTICE_TYPE_OPTIONS: NoticeEditorTypeOption[] = [
  {
    value: 'price_cut',
    labelKey: 'Price Cut',
    color: 'bg-green-500',
    badgeVariant: 'success',
  },
  {
    value: 'price_up',
    labelKey: 'Price Up',
    color: 'bg-red-500',
    badgeVariant: 'danger',
  },
  {
    value: 'update',
    labelKey: 'Price Update',
    color: 'bg-blue-500',
    badgeVariant: 'info',
  },
]

export function PriceNoticeSection({ enabled, data }: PriceNoticeSectionProps) {
  const { t } = useTranslation()

  return (
    <NoticeEditorSection
      title={t('Price Updates')}
      enabled={enabled}
      data={data}
      enabledKey='console_setting.price_notice_enabled'
      dataKey='console_setting.price_notice'
      defaultType='update'
      typeOptions={PRICE_NOTICE_TYPE_OPTIONS}
      labels={{
        add: t('Add Price Update'),
        edit: t('Edit Price Update'),
        empty: t(
          'No price updates yet. Click "Add Price Update" to create one.'
        ),
        added: t('Price update added. Click "Save Settings" to apply.'),
        updated: t('Price update changed. Click "Save Settings" to apply.'),
        deleted: t('Price update deleted. Click "Save Settings" to apply.'),
        batchDeleted: (count) =>
          t(
            '{{count}} price updates deleted. Click "Save Settings" to apply.',
            {
              count,
            }
          ),
        deleteSingleDescription: t(
          'This price update will be removed from the list.'
        ),
        deleteBatchDescription: (count) =>
          t('{{count}} price updates will be removed from the list.', {
            count,
          }),
        saved: t('Price updates saved successfully'),
        saveFailed: t('Failed to save price updates'),
        dialogDescription: t(
          'Create or edit price updates shown on the dashboard'
        ),
        contentPlaceholder: t('Enter price update content (supports Markdown)'),
        publishDateDescription: t(
          'Date and time when this price update should be displayed'
        ),
        typePlaceholder: t('Select price update type'),
      }}
    />
  )
}
