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
import { toast } from 'sonner'

import { handleServerError } from '@/lib/handle-server-error'

import { SettingsSwitchField } from '../components/settings-form-layout'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type FeatureKey = 'orders_enabled' | 'invoices_enabled' | 'tickets_enabled'

export interface FeatureSwitchesSectionProps {
  orders: boolean
  invoices: boolean
  tickets: boolean
}

export function FeatureSwitchesSection(props: FeatureSwitchesSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [orders, setOrders] = useState(props.orders)
  const [invoices, setInvoices] = useState(props.invoices)
  const [tickets, setTickets] = useState(props.tickets)

  const save = async (key: FeatureKey, value: boolean) => {
    try {
      await updateOption.mutateAsync({
        key: `console_setting.${key}`,
        value,
      })
      toast.success(t('Setting saved'))
    } catch (error) {
      handleServerError(error, t('Failed to update setting'))
    }
  }

  return (
    <SettingsSection title={t('Feature Switches')}>
      <div className='space-y-2'>
        <p className='text-muted-foreground pb-2 text-sm'>
          {t(
            'Turn console features on or off. Disabled features disappear from the navigation and their backend APIs are closed.'
          )}
        </p>
        <SettingsSwitchField
          controlId='feature-orders-enabled'
          checked={orders}
          onCheckedChange={(checked) => {
            setOrders(checked)
            void save('orders_enabled', checked)
          }}
          label={t('Orders / Invoices')}
          description={t(
            'Show the recharge order history page in the console.'
          )}
        />
        <SettingsSwitchField
          controlId='feature-invoices-enabled'
          checked={invoices}
          onCheckedChange={(checked) => {
            setInvoices(checked)
            void save('invoices_enabled', checked)
          }}
          label={t('Invoicing')}
          description={t(
            'Allow users to apply for invoices and admins to manage them.'
          )}
        />
        <SettingsSwitchField
          controlId='feature-tickets-enabled'
          checked={tickets}
          onCheckedChange={(checked) => {
            setTickets(checked)
            void save('tickets_enabled', checked)
          }}
          label={t('Support tickets')}
          description={t(
            'Open the support ticket system for users and staff.'
          )}
        />
      </div>
    </SettingsSection>
  )
}
