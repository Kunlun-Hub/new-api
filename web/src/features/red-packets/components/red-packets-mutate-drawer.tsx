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
import { zodResolver } from '@hookform/resolvers/zod'
import { Gift } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  SideDrawerSection,
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import { getEditableQuotaStep } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'

import { createRedPacket } from '../api'
import {
  ERROR_MESSAGES,
  RED_PACKET_CLAIM_MODE_OPTIONS,
  RED_PACKET_DISTRIBUTION_OPTIONS,
  RED_PACKET_TYPE_OPTIONS,
  RED_PACKET_VALIDATION,
  SUCCESS_MESSAGES,
} from '../constants'
import {
  getRedPacketFormSchema,
  RED_PACKET_FORM_DEFAULT_VALUES,
  transformRedPacketFormToPayload,
  type RedPacketFormValues,
} from '../lib'
import { RED_PACKET_TYPE, type RedPacket } from '../types'
import { RedPacketShareDialog } from './red-packet-share-dialog'
import { useRedPackets } from './red-packets-provider'

type RedPacketsMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RedPacketsMutateDrawer({
  open,
  onOpenChange,
}: RedPacketsMutateDrawerProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useRedPackets()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdPacket, setCreatedPacket] = useState<RedPacket | null>(null)
  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'

  const form = useForm<RedPacketFormValues>({
    resolver: zodResolver(getRedPacketFormSchema(t)),
    defaultValues: RED_PACKET_FORM_DEFAULT_VALUES,
  })
  const packetType = form.watch('type')
  const isGiftPacket = packetType === RED_PACKET_TYPE.GIFT

  const onSubmit = async (values: RedPacketFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createRedPacket(
        transformRedPacketFormToPayload(values)
      )
      if (result.success) {
        toast.success(t(SUCCESS_MESSAGES.RED_PACKET_CREATED))
        setCreatedPacket(result.data ?? null)
        onOpenChange(false)
        form.reset(RED_PACKET_FORM_DEFAULT_VALUES)
        triggerRefresh()
      } else {
        handleServerError(result, t(ERROR_MESSAGES.CREATE_FAILED))
      }
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.CREATE_FAILED))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit)(event)
  }

  const amountLabel = t('Total Amount ({{currency}})', {
    currency: currencyLabel,
  })

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value)
        if (!value) {
          form.reset(RED_PACKET_FORM_DEFAULT_VALUES)
        }
      }}
    >
      <SheetContent className={sideDrawerContentClassName('sm:max-w-[600px]')}>
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('New Red Packet')}</SheetTitle>
          <SheetDescription>
            {t(
              'Issue a red packet users claim through its landing page. Gift credit packets can carry their own validity window.'
            )}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='red-packet-form'
            onSubmit={handleSubmit}
            className={sideDrawerFormClassName()}
            aria-busy={isSubmitting}
          >
            <fieldset disabled={isSubmitting} className='contents'>
              <SideDrawerSection>
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Type')}</FormLabel>
                      <Select
                        items={RED_PACKET_TYPE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: t(option.labelKey),
                        }))}
                        onValueChange={(value) =>
                          value !== null && field.onChange(value)
                        }
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Select a type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {RED_PACKET_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {t(option.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t(
                          'Gift credit can only be spent on models that allow it; balance behaves like a top-up.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='claim_mode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Claim mode')}</FormLabel>
                      <Select
                        items={RED_PACKET_CLAIM_MODE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: t(option.labelKey),
                        }))}
                        onValueChange={(value) =>
                          value !== null && field.onChange(value)
                        }
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('Select a claim mode')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {RED_PACKET_CLAIM_MODE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {t(option.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t(
                          'Direct claim opens a landing page with a claim button. Claim code requires the code generated after creation.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='distribution'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Distribution')}</FormLabel>
                      <Select
                        items={RED_PACKET_DISTRIBUTION_OPTIONS.map(
                          (option) => ({
                            value: option.value,
                            label: t(option.labelKey),
                          })
                        )}
                        onValueChange={(value) =>
                          value !== null && field.onChange(value)
                        }
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('Select a distribution')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {RED_PACKET_DISTRIBUTION_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {t(option.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t(
                          'Random split draws one of the pre-generated shares; equal split divides the total evenly.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='total_dollars'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{amountLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='number'
                          step={tokensOnly ? 1 : getEditableQuotaStep()}
                          placeholder={
                            tokensOnly
                              ? t('Enter amount in tokens')
                              : t('Enter amount in {{currency}}', {
                                  currency: currencyLabel,
                                })
                          }
                          onChange={(event) =>
                            field.onChange(
                              Number.parseFloat(event.target.value) || 0
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Split across every share and handed out as users claim.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='share_count'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Shares')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='number'
                          min={RED_PACKET_VALIDATION.SHARE_COUNT_MIN}
                          max={RED_PACKET_VALIDATION.SHARE_COUNT_MAX}
                          placeholder={t('Number of claimable shares')}
                          onChange={(event) =>
                            field.onChange(
                              Number.parseInt(event.target.value, 10) || 0
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('{{min}}-{{max}} shares, one claim per user', {
                          min: RED_PACKET_VALIDATION.SHARE_COUNT_MIN,
                          max: RED_PACKET_VALIDATION.SHARE_COUNT_MAX,
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='expire_days'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Validity (days)')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='number'
                          min={0}
                          max={RED_PACKET_VALIDATION.MAX_DAYS}
                          onChange={(event) =>
                            field.onChange(
                              Number.parseInt(event.target.value, 10) || 0
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Days the packet stays claimable. 0 means never expires.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isGiftPacket && (
                  <FormField
                    control={form.control}
                    name='gift_expire_days'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Gift credit validity (days)')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type='number'
                            min={0}
                            max={RED_PACKET_VALIDATION.MAX_DAYS}
                            onChange={(event) =>
                              field.onChange(
                                Number.parseInt(event.target.value, 10) || 0
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {t(
                            'Claimed gift credit expires this many days after the claim. 0 means never expires.'
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name='remark'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Remark')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          maxLength={RED_PACKET_VALIDATION.REMARK_MAX_LENGTH}
                          placeholder={t(
                            'For example: lucky draw for the team'
                          )}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Shown on the red packet landing page.')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SideDrawerSection>
            </fieldset>
          </form>
        </Form>
        <SheetFooter className={sideDrawerFooterClassName()}>
          <SheetClose render={<Button variant='outline' />}>
            {t('Cancel')}
          </SheetClose>
          <Button form='red-packet-form' type='submit' disabled={isSubmitting}>
            <Gift className='mr-1 size-4' />
            {isSubmitting ? t('Creating...') : t('Create')}
          </Button>
        </SheetFooter>
      </SheetContent>
      <RedPacketShareDialog
        packet={createdPacket}
        open={createdPacket !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedPacket(null)
          }
        }}
      />
    </Sheet>
  )
}
