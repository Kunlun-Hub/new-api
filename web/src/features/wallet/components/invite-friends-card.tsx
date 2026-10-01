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
import { Link } from '@tanstack/react-router'
import { ChevronRight, Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function InviteFriendsCard() {
  const { t } = useTranslation()

  return (
    <Link
      to='/invitation'
      className='group border-border/50 hover:from-foreground/4 flex items-center gap-3 rounded-xl border p-4 transition hover:scale-[1.02] hover:bg-linear-to-br hover:via-transparent hover:to-transparent'
    >
      <div className='bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full'>
        <Gift className='size-5' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='font-medium'>{t('Invite friends, earn rewards')}</div>
        <div className='text-muted-foreground truncate text-xs'>
          {t('Earn commission when friends sign up and top up')}
        </div>
      </div>
      <ChevronRight className='text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5' />
    </Link>
  )
}
