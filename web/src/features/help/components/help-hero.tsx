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
import { CircleHelp, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'

export function HelpHero(props: {
  query: string
  onQueryChange: (value: string) => void
}) {
  const { t } = useTranslation()

  return (
    <section className='relative overflow-hidden rounded-3xl border px-6 py-12 text-center md:py-16'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)] bg-[size:18px_18px]' />
      <div className='relative mx-auto max-w-2xl'>
        <div className='bg-background mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border shadow-sm'>
          <CircleHelp className='size-6' aria-hidden='true' />
        </div>
        <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>
          {t('Help Center')}
        </h1>
        <p className='text-muted-foreground mt-3 text-sm md:text-base'>
          {t(
            'Have a question? Search for answers here, or browse the tutorials, docs and FAQs below.'
          )}
        </p>
        <div className='relative mx-auto mt-6 max-w-xl'>
          <Search
            className='text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2'
            aria-hidden='true'
          />
          <Input
            type='search'
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder={t('Search tutorials, docs and FAQs…')}
            aria-label={t('Search help content')}
            className='h-11 rounded-full pl-10'
          />
        </div>
      </div>
    </section>
  )
}
