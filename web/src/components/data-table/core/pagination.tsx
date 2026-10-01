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
import type { Table } from '@tanstack/react-table'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, getPageNumbers } from '@/lib/utils'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  compact?: boolean
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100] as const
const PAGE_SIZE_SELECT_ITEMS = PAGE_SIZE_OPTIONS.map((pageSize) => ({
  value: `${pageSize}`,
  label: pageSize,
}))

export function DataTablePagination<TData>({
  table,
  compact = false,
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation()
  const pagination = table.getState().pagination
  const currentPage = pagination.pageIndex + 1
  const pageSize = pagination.pageSize
  const totalPages = table.getPageCount()
  const totalRows = table.getRowCount()
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const pageItems = pageNumbers.map((page, index) => ({
    page,
    key: page === '...' ? `gap-after-${pageNumbers[index - 1]}` : String(page),
  }))

  if (compact) {
    return (
      <nav
        aria-label={t('Page')}
        className='flex w-full min-w-0 flex-wrap items-center justify-between gap-2 text-sm'
      >
        <span className='text-muted-foreground min-w-0 [overflow-wrap:anywhere]'>
          {t('Total:')} {totalRows.toLocaleString()}
        </span>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            className='size-11'
            aria-label={t('Go to previous page')}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
          </Button>
          <span className='tabular-nums' aria-live='polite'>
            {currentPage} / {Math.max(1, totalPages)}
          </span>
          <Button
            variant='outline'
            size='icon'
            className='size-11'
            aria-label={t('Go to next page')}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </nav>
    )
  }

  const canPreviousPage = table.getCanPreviousPage()
  const canNextPage = table.getCanNextPage()

  return (
    <div className='flex min-w-0 flex-wrap items-center justify-between gap-3 px-1'>
      <div className='text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm'>
        <span className='whitespace-nowrap'>
          {t('{{count}} items in total', {
            count: totalRows.toLocaleString(),
          })}
        </span>
        <div className='flex shrink-0 items-center gap-2'>
          <span className='whitespace-nowrap'>{t('Per page')}</span>
          <Select
            items={PAGE_SIZE_SELECT_ITEMS}
            value={`${pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className='text-primary h-8 w-16'>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side='top' alignItemWithTrigger={false}>
              <SelectGroup>
                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Pagination className='mx-0 w-auto justify-end'>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href='#'
              text={t('Previous page')}
              aria-disabled={canPreviousPage ? undefined : true}
              className={cn(!canPreviousPage && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault()
                if (canPreviousPage) table.previousPage()
              }}
            />
          </PaginationItem>

          {pageItems.map(({ page: pageNumber, key }) =>
            pageNumber === '...' ? (
              <PaginationItem key={key}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={key}>
                <PaginationLink
                  href='#'
                  isActive={currentPage === pageNumber}
                  aria-label={t('Go to page {{page}}', { page: pageNumber })}
                  onClick={(event) => {
                    event.preventDefault()
                    table.setPageIndex((pageNumber as number) - 1)
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href='#'
              text={t('Next page')}
              aria-disabled={canNextPage ? undefined : true}
              className={cn(!canNextPage && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault()
                if (canNextPage) table.nextPage()
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
