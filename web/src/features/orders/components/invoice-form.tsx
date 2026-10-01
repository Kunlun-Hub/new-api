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

import { Field, FieldDescription, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import type { InvoiceFormValue } from '../lib/invoice'
import {
  INVOICE_PROJECT_TYPES,
  type InvoiceTitleType,
  type InvoiceType,
} from '../types'

type InvoiceFormProps = {
  value: InvoiceFormValue
  onChange: (patch: Partial<InvoiceFormValue>) => void
  /** 是否允许开具增值税专用发票 */
  allowSpecial?: boolean
  disabled?: boolean
}

export function InvoiceForm({
  value,
  onChange,
  allowSpecial = true,
  disabled = false,
}: InvoiceFormProps) {
  const { t } = useTranslation()
  const isSpecial = value.type === 'special'
  const isPersonal = value.buyerKind === 'personal'

  return (
    <div className='space-y-4'>
      <Field>
        <FieldTitle>{t('Invoice type')}</FieldTitle>
        <RadioGroup
          value={value.type}
          disabled={disabled}
          onValueChange={(next) => {
            const type = next as InvoiceType
            onChange(
              type === 'special' ? { type, buyerKind: 'company' } : { type }
            )
          }}
          className='flex gap-6'
        >
          <Label className='flex items-center gap-2 font-normal'>
            <RadioGroupItem value='normal' />
            {t('VAT ordinary invoice')}
          </Label>
          <Label className='flex items-center gap-2 font-normal'>
            <RadioGroupItem value='special' disabled={!allowSpecial} />
            {t('VAT special invoice')}
          </Label>
        </RadioGroup>
      </Field>

      <Field>
        <FieldTitle>{t('Title type')}</FieldTitle>
        <RadioGroup
          value={value.buyerKind}
          disabled={disabled}
          onValueChange={(next) =>
            onChange({ buyerKind: next as InvoiceTitleType })
          }
          className='flex gap-6'
        >
          <Label className='flex items-center gap-2 font-normal'>
            <RadioGroupItem value='company' />
            {t('Enterprise')}
          </Label>
          <Label className='flex items-center gap-2 font-normal'>
            <RadioGroupItem value='personal' disabled={isSpecial} />
            {t('Individual / Overseas enterprise')}
          </Label>
        </RadioGroup>
      </Field>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field>
          <FieldTitle>
            {t('Invoice title')}
            <span className='text-red-500'>*</span>
          </FieldTitle>
          <Input
            value={value.title}
            disabled={disabled}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t('Enter the invoice title')}
            autoComplete='off'
          />
        </Field>
        <Field>
          <FieldTitle>
            {t('Item name')}
            <span className='text-red-500'>*</span>
          </FieldTitle>
          <Select
            items={INVOICE_PROJECT_TYPES.map((item) => ({
              value: String(item.value),
              label: item.label,
            }))}
            value={String(value.projectType)}
            onValueChange={(next) =>
              onChange({ projectType: Number(next ?? 0) })
            }
          >
            <SelectTrigger className='w-full' disabled={disabled}>
              <SelectValue placeholder={t('Select an item name')} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {INVOICE_PROJECT_TYPES.map((item) => (
                <SelectItem key={item.value} value={String(item.value)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {!isPersonal && (
        <Field>
          <FieldTitle>
            {t('Tax ID')}
            <span className='text-red-500'>*</span>
          </FieldTitle>
          <Input
            value={value.taxId}
            disabled={disabled}
            onChange={(event) => onChange({ taxId: event.target.value })}
            placeholder={t('Enter the tax identification number')}
            autoComplete='off'
          />
        </Field>
      )}

      {isSpecial && (
        <>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field>
              <FieldTitle>{t('Bank and account number')}</FieldTitle>
              <Input
                value={value.buyerBankAccount}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ buyerBankAccount: event.target.value })
                }
                placeholder={t('Enter the bank and account number')}
                autoComplete='off'
              />
            </Field>
            <Field>
              <FieldTitle>{t('Phone')}</FieldTitle>
              <Input
                value={value.buyerTel}
                disabled={disabled}
                onChange={(event) => onChange({ buyerTel: event.target.value })}
                placeholder={t('Enter the phone number')}
                autoComplete='off'
              />
            </Field>
          </div>
          <Field>
            <FieldTitle>{t('Address')}</FieldTitle>
            <Input
              value={value.buyerAddr}
              disabled={disabled}
              onChange={(event) => onChange({ buyerAddr: event.target.value })}
              placeholder={t('Enter the address')}
              autoComplete='off'
            />
          </Field>
        </>
      )}

      <Field>
        <FieldTitle>{t('Remark')}</FieldTitle>
        <Textarea
          value={value.content}
          disabled={disabled}
          rows={3}
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder={t('Enter remarks')}
        />
        <FieldDescription>
          {t('Optional additional notes for the invoice')}
        </FieldDescription>
      </Field>
    </div>
  )
}
