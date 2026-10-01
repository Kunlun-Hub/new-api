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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HardDrive, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { handleServerError } from '@/lib/handle-server-error'

import { deleteUserStorage, getUserStorage, verifyUserStorage } from '../api'
import type { UserStorageRequest } from '../types'

// ============================================================================
// Personal S3 Bucket Card
// ============================================================================

type StorageForm = {
  endpoint: string
  bucket: string
  region: string
  accessKeyID: string
  secretKey: string
  publicBaseURL: string
}

const EMPTY_FORM: StorageForm = {
  endpoint: '',
  bucket: '',
  region: '',
  accessKeyID: '',
  secretKey: '',
  publicBaseURL: '',
}

export function StorageBucketCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const storageQuery = useQuery({
    queryKey: ['user-storage'],
    queryFn: async () => {
      const response = await getUserStorage()
      if (!response.success) {
        throw new Error(
          response.message || t('Failed to load storage settings')
        )
      }
      return response.data
    },
  })

  const [form, setForm] = useState<StorageForm>(EMPTY_FORM)
  const configured = Boolean(storageQuery.data?.configured)

  useEffect(() => {
    const data = storageQuery.data
    if (!data?.configured) return
    setForm({
      endpoint: data.endpoint ?? '',
      bucket: data.bucket ?? '',
      region: data.region ?? '',
      accessKeyID: data.access_key_id ?? '',
      secretKey: '',
      publicBaseURL: data.public_base_url ?? '',
    })
  }, [storageQuery.data])

  const updateField = (field: keyof StorageForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const verifyAndSave = useMutation({
    mutationFn: async () => {
      const payload: UserStorageRequest = {
        endpoint: form.endpoint.trim(),
        bucket: form.bucket.trim(),
        region: form.region.trim(),
        access_key_id: form.accessKeyID.trim(),
        secret_key: form.secretKey,
        public_base_url: form.publicBaseURL.trim(),
      }
      const response = await verifyUserStorage(payload)
      if (!response.success) {
        throw new Error(response.message || t('Failed to verify bucket'))
      }
      return response
    },
    onSuccess: () => {
      toast.success(t('Personal bucket saved'))
      setForm((prev) => ({ ...prev, secretKey: '' }))
      void queryClient.invalidateQueries({ queryKey: ['user-storage'] })
    },
    onError: (error) => handleServerError(error, t('Failed to verify bucket')),
  })

  const removeBucket = useMutation({
    mutationFn: async () => {
      const response = await deleteUserStorage()
      if (!response.success) {
        throw new Error(response.message || t('Failed to remove bucket'))
      }
    },
    onSuccess: () => {
      toast.success(t('Personal bucket removed'))
      setForm(EMPTY_FORM)
      void queryClient.invalidateQueries({ queryKey: ['user-storage'] })
    },
    onError: (error) => handleServerError(error, t('Failed to remove bucket')),
  })

  if (storageQuery.isPending) {
    return (
      <div className='border-border/40 space-y-6 rounded-xl border p-5'>
        <Skeleton className='h-9 w-56' />
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-10 w-full' />
      </div>
    )
  }

  return (
    <div className='border-border/40 space-y-6 rounded-xl border p-5'>
      <div className='flex items-start gap-3'>
        <IconBadge tone='neutral' size='lg'>
          <HardDrive aria-hidden='true' />
        </IconBadge>
        <div className='min-w-0'>
          <div className='text-sm font-medium'>{t('Personal Bucket')}</div>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Saving writes a test file into the bucket to verify the credentials and permissions'
            )}
          </p>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor='storage-endpoint'>
          {t('Endpoint (S3 API address)')}
        </FieldLabel>
        <Input
          id='storage-endpoint'
          value={form.endpoint}
          onChange={(event) => updateField('endpoint', event.target.value)}
          placeholder='https://<accountid>.r2.cloudflarestorage.com'
          autoComplete='off'
        />
      </Field>

      <div className='grid gap-6 sm:grid-cols-2'>
        <Field>
          <FieldLabel htmlFor='storage-bucket'>
            {t('Bucket (bucket name)')}
          </FieldLabel>
          <Input
            id='storage-bucket'
            value={form.bucket}
            onChange={(event) => updateField('bucket', event.target.value)}
            placeholder='my-bucket'
            autoComplete='off'
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='storage-region'>
            {t('Region (optional)')}
          </FieldLabel>
          <Input
            id='storage-region'
            value={form.region}
            onChange={(event) => updateField('region', event.target.value)}
            placeholder={t('auto')}
            autoComplete='off'
          />
        </Field>
      </div>

      <div className='grid gap-6 sm:grid-cols-2'>
        <Field>
          <FieldLabel htmlFor='storage-access-key'>AccessKey ID</FieldLabel>
          <Input
            id='storage-access-key'
            value={form.accessKeyID}
            onChange={(event) => updateField('accessKeyID', event.target.value)}
            autoComplete='off'
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='storage-secret-key'>SecretKey</FieldLabel>
          <PasswordInput
            id='storage-secret-key'
            value={form.secretKey}
            onChange={(event) => updateField('secretKey', event.target.value)}
            placeholder={configured ? '••••••••••••' : ''}
            autoComplete='new-password'
          />
          {configured && (
            <FieldDescription>
              {t('Leave empty to keep the saved secret key')}
            </FieldDescription>
          )}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor='storage-public-url'>
          {t('Access Domain (optional)')}
        </FieldLabel>
        <Input
          id='storage-public-url'
          value={form.publicBaseURL}
          onChange={(event) => updateField('publicBaseURL', event.target.value)}
          placeholder={t(
            'https://cdn.example.com (public domain bound to the bucket)'
          )}
          autoComplete='off'
        />
      </Field>

      <div className='bg-muted/40 text-muted-foreground rounded-lg p-3 text-xs leading-relaxed'>
        <p className='text-foreground/80 font-medium'>
          {t('The bucket needs two preparations:')}
        </p>
        <p className='mt-1'>
          {t(
            '1. CORS: allow this site ({{origin}}) and other nodes to send GET, HEAD and PUT requests, with AllowedHeaders set to *',
            { origin: window.location.origin }
          )}
        </p>
        <p className='mt-1'>
          {t(
            '2. Public read: enable public access or bind a custom domain, otherwise images cannot be displayed on the page.'
          )}
        </p>
      </div>

      <div className='flex gap-2'>
        <Button
          type='button'
          className='flex-1'
          disabled={verifyAndSave.isPending}
          onClick={() => verifyAndSave.mutate()}
        >
          {verifyAndSave.isPending && (
            <Loader2 className='size-4 animate-spin' />
          )}
          {verifyAndSave.isPending ? t('Verifying...') : t('Verify and Save')}
        </Button>
      </div>

      {configured && (
        <div className='flex justify-center'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-muted-foreground'
            disabled={removeBucket.isPending}
            onClick={() => removeBucket.mutate()}
          >
            {removeBucket.isPending && (
              <Loader2 className='size-4 animate-spin' />
            )}
            {t('Remove bucket binding')}
          </Button>
        </div>
      )}
    </div>
  )
}
