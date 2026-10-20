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

import { ConsoleBreadcrumb, SectionPageLayout } from '@/components/layout'

import { RedPacketRecordsTable } from './components/red-packet-records-table'

export function RedPacketRecords() {
  const { t } = useTranslation()

  return (
    <SectionPageLayout>
      <SectionPageLayout.Breadcrumb>
        <ConsoleBreadcrumb
          items={[
            { label: t('Dashboard'), href: '/dashboard/overview' },
            { label: t('Red Packet Records') },
          ]}
        />
      </SectionPageLayout.Breadcrumb>
      <SectionPageLayout.Title>
        {t('Red Packet Records')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <RedPacketRecordsTable />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
