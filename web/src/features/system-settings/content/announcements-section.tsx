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

type AnnouncementsSectionProps = {
  enabled: boolean
  data: string
}

const ANNOUNCEMENT_TYPE_OPTIONS: NoticeEditorTypeOption[] = [
  {
    value: 'default',
    labelKey: 'Default',
    color: 'bg-gray-500',
    badgeVariant: 'neutral',
  },
  {
    value: 'ongoing',
    labelKey: 'Ongoing',
    color: 'bg-blue-500',
    badgeVariant: 'info',
  },
  {
    value: 'success',
    labelKey: 'Success',
    color: 'bg-green-500',
    badgeVariant: 'success',
  },
  {
    value: 'warning',
    labelKey: 'Warning',
    color: 'bg-orange-500',
    badgeVariant: 'warning',
  },
  {
    value: 'error',
    labelKey: 'Error',
    color: 'bg-red-500',
    badgeVariant: 'danger',
  },
]

export function AnnouncementsSection({
  enabled,
  data,
}: AnnouncementsSectionProps) {
  const { t } = useTranslation()

  return (
    <NoticeEditorSection
      title={t('Announcements')}
      enabled={enabled}
      data={data}
      enabledKey='console_setting.announcements_enabled'
      dataKey='console_setting.announcements'
      defaultType='default'
      typeOptions={ANNOUNCEMENT_TYPE_OPTIONS}
      showExtra
      labels={{
        add: t('Add Announcement'),
        edit: t('Edit Announcement'),
        empty: t(
          'No announcements yet. Click "Add Announcement" to create one.'
        ),
        added: t('Announcement added. Click "Save Settings" to apply.'),
        updated: t('Announcement updated. Click "Save Settings" to apply.'),
        deleted: t('Announcement deleted. Click "Save Settings" to apply.'),
        batchDeleted: (count) =>
          t(
            '{{count}} announcements deleted. Click "Save Settings" to apply.',
            {
              count,
            }
          ),
        deleteSingleDescription: t(
          'This announcement will be removed from the list.'
        ),
        deleteBatchDescription: (count) =>
          t('{{count}} announcements will be removed from the list.', {
            count,
          }),
        saved: t('Announcements saved successfully'),
        saveFailed: t('Failed to save announcements'),
        dialogDescription: t(
          'Create or update system announcements for the dashboard'
        ),
        contentPlaceholder: t(
          'Enter announcement content (supports Markdown/HTML)'
        ),
        publishDateDescription: t(
          'Date and time when this announcement should be displayed'
        ),
        typePlaceholder: t('Select announcement type'),
        extraLabel: t('Extra Notes (Optional)'),
        extraPlaceholder: t('Additional information'),
        extraDescription: t(
          'Optional supplementary information (max 100 characters)'
        ),
      }}
    />
  )
}
