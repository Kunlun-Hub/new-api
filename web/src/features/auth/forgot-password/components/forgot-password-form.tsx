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
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { sendPasswordResetEmail } from '@/features/auth/api'
import {
  forgotPasswordFormSchema,
  PASSWORD_RESET_COUNTDOWN,
} from '@/features/auth/constants'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import { useCountdown } from '@/hooks/use-countdown'
import { handleServerError } from '@/lib/handle-server-error'
import { AuthOperationError } from '@/lib/secure-verification'
import { createServerError } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const {
    secondsLeft,
    isActive,
    start: startCountdown,
  } = useCountdown({ initialSeconds: PASSWORD_RESET_COUNTDOWN })

  const form = useForm<z.infer<typeof forgotPasswordFormSchema>>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  })
  const turnstileReady = !isTurnstileEnabled || Boolean(turnstileToken)

  async function onSubmit(data: z.infer<typeof forgotPasswordFormSchema>) {
    if (!validateTurnstile()) return

    setIsLoading(true)
    try {
      const res = await sendPasswordResetEmail(data.email, turnstileToken)
      if (res?.success) {
        form.reset()
        startCountdown()
        toast.success(t('Reset email sent, please check your inbox'))
      } else {
        handleServerError(
          createServerError(res, t('Failed to send reset email'))
        )
      }
    } catch (_error) {
      handleServerError(
        AuthOperationError.from(_error, t('Failed to send reset email'))
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          'group bg-card/85 border-border/60 from-transparent via-transparent hover:from-foreground/4 relative w-full overflow-hidden rounded-3xl border bg-linear-to-br to-transparent p-6 backdrop-blur-xl transition duration-300 sm:p-10',
          className
        )}
        {...props}
      >
        <div className='mb-8 space-y-2 text-center'>
          <div className='border-border/60 text-muted-foreground mx-auto mb-2 inline-flex items-center rounded-full border bg-white/5 px-3 py-1 text-xs tracking-[0.28em] uppercase'>
            {t('Reset password')}
          </div>
          <h1 className='text-2xl font-semibold sm:text-3xl'>
            {t('Recover password')}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {t(
              'Reset your password using the email address bound to your account.'
            )}
          </p>
        </div>

        <div className='grid gap-5'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Email address')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('Please enter your bound email address')}
                    type='email'
                    autoComplete='email'
                    className='rounded-full px-4'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type='submit'
            className='bg-foreground text-background hover:bg-foreground/90 w-full rounded-full'
            disabled={isLoading || isActive || !turnstileReady}
          >
            {isActive
              ? t('Resend ({{seconds}}s)', { seconds: secondsLeft })
              : t('Send reset email')}
            {isLoading ? <Loader2 className='animate-spin' /> : null}
          </Button>

          {isTurnstileEnabled && (
            <Turnstile
              siteKey={turnstileSiteKey}
              onVerify={setTurnstileToken}
            />
          )}
        </div>

        <div className='mt-4 flex items-center justify-between text-sm'>
          <p className='text-muted-foreground'>
            {t('No account yet?')}{' '}
            <Link
              to='/sign-up'
              className='text-primary underline decoration-dotted underline-offset-3'
            >
              {t('Register account')}
            </Link>
          </p>
          <p className='text-muted-foreground'>
            {t('Remembered your password?')}{' '}
            <Link
              to='/sign-in'
              className='text-primary underline decoration-dotted underline-offset-3'
            >
              {t('Back to sign in')}
            </Link>
          </p>
        </div>
      </form>
    </Form>
  )
}
