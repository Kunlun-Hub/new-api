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

import { RedPacketsDialogs } from './components/red-packets-dialogs'
import { RedPacketsPrimaryButtons } from './components/red-packets-primary-buttons'
import { RedPacketsProvider } from './components/red-packets-provider'
import { RedPacketsTable } from './components/red-packets-table'

export function RedPackets() {
  const { t } = useTranslation()
  return (
    <RedPacketsProvider>
      <SectionPageLayout>
        <SectionPageLayout.Breadcrumb>
          <ConsoleBreadcrumb
            items={[
              { label: t('Dashboard'), href: '/dashboard/overview' },
              { label: t('Send Red Packets') },
            ]}
          />
        </SectionPageLayout.Breadcrumb>
        <SectionPageLayout.Title>
          {t('Send Red Packets')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <RedPacketsPrimaryButtons />
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <RedPacketsTable />
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <RedPacketsDialogs />
    </RedPacketsProvider>
  )
}
