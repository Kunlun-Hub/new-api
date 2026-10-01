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
/**
 * Shared placeholders for empty console states that have no data yet.
 */

/** Two chat bubbles — used by messaging-style empty states. */
export function NoDataIllustration() {
  return (
    <svg
      width='180'
      height='120'
      viewBox='0 0 180 120'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <rect
        x='20'
        y='20'
        width='80'
        height='44'
        rx='12'
        className='fill-muted stroke-border dark:fill-muted/60'
        strokeWidth='1.5'
      />
      <path
        d='M36 64 L32 76 L48 64'
        className='fill-muted stroke-border dark:fill-muted/60'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <rect
        x='32'
        y='32'
        width='48'
        height='4'
        rx='2'
        className='fill-muted-foreground/20'
      />
      <rect
        x='32'
        y='42'
        width='36'
        height='4'
        rx='2'
        className='fill-muted-foreground/15'
      />
      <circle cx='32' cy='52' r='3' className='fill-muted-foreground/12' />
      <rect
        x='80'
        y='50'
        width='80'
        height='40'
        rx='12'
        className='fill-primary/10 stroke-primary/30 dark:fill-primary/15'
        strokeWidth='1.5'
      />
      <path
        d='M144 90 L148 100 L132 90'
        className='fill-primary/10 stroke-primary/30 dark:fill-primary/15'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <rect
        x='92'
        y='62'
        width='52'
        height='4'
        rx='2'
        className='fill-primary/20'
      />
      <rect
        x='92'
        y='72'
        width='32'
        height='4'
        rx='2'
        className='fill-primary/15'
      />
      <circle cx='14' cy='46' r='2' className='fill-muted-foreground/10' />
      <circle cx='168' cy='66' r='2' className='fill-primary/15' />
      <circle cx='110' cy='16' r='2.5' className='fill-muted-foreground/10' />
    </svg>
  )
}

/** Stacked record rows — used by log/record tables with no rows yet. */
export function TableRowsIllustration() {
  return (
    <div className='relative h-32 w-56' aria-hidden='true'>
      <div className='bg-muted/50 dark:bg-muted/25 border-border/40 absolute right-6 bottom-4 left-6 flex h-12 items-center gap-2.5 rounded-lg border px-3'>
        <div className='bg-muted-foreground/10 size-5 shrink-0 rounded' />
        <div className='flex flex-1 flex-col gap-1'>
          <div className='bg-muted-foreground/10 h-2 w-full rounded' />
          <div className='bg-muted-foreground/10 h-2 w-2/3 rounded' />
        </div>
      </div>
      <div className='bg-muted/70 dark:bg-muted/40 border-border/50 absolute right-3 bottom-8 left-3 flex h-12 items-center gap-2.5 rounded-lg border px-3'>
        <div className='bg-muted-foreground/15 size-5 shrink-0 rounded' />
        <div className='flex flex-1 flex-col gap-1'>
          <div className='bg-muted-foreground/15 h-2 w-full rounded' />
          <div className='bg-muted-foreground/10 h-2 w-3/4 rounded' />
        </div>
      </div>
      <div className='bg-background border-border absolute inset-x-0 bottom-12 flex h-14 items-center gap-3 rounded-lg border px-3.5 shadow-sm'>
        <div className='bg-muted size-7 shrink-0 rounded' />
        <div className='flex flex-1 flex-col gap-1.5'>
          <div className='bg-muted h-2.5 w-full rounded' />
          <div className='bg-muted/70 h-2 w-3/5 rounded' />
        </div>
      </div>
      <div className='from-background/0 to-background pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b' />
    </div>
  )
}
