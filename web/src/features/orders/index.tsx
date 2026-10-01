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
import { useQuery } from '@tanstack/react-query'
import type {
  ColumnDef,
  PaginationState,
  RowSelectionState,
} from '@tanstack/react-table'
import {
  CircleAlert,
  Copy,
  DollarSign,
  Download,
  FileText,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { DataTablePage, useDataTable } from '@/components/data-table'
import { DatePicker } from '@/components/date-picker'
import { TableRowsIllustration } from '@/components/empty-illustrations'
import { ConsoleBreadcrumb, SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Popconfirm } from '@/components/ui/popconfirm'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIsAdmin } from '@/hooks/use-admin'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import {
  formatLocalCurrencyAmount,
  formatQuotaWithCurrency,
} from '@/lib/currency'
import { useConsoleFeatures } from '@/lib/console-features'
import { handleServerError } from '@/lib/handle-server-error'

import { useBillingHistory } from '../wallet/hooks/use-billing-history'
import { formatTimestamp, getPaymentMethodName } from '../wallet/lib/billing'
import type { TopupRecord } from '../wallet/types'
import {
  batchInvoicing,
  batchMarkTopUpInvoiced,
  clearInvalidTopUps,
  deleteInvoice,
  getAllInvoices,
  getInvoiceAmountStats,
  getUserInvoices,
  markTopUpInvoiced,
  updateInvoiceStatus,
} from './api'
import { InvoiceApplyDialog } from './components/invoice-apply-dialog'
import { InvoiceCreateDialog } from './components/invoice-create-dialog'
import { InvoiceDetailDialog } from './components/invoice-detail-dialog'
import { InvoiceEditDialog } from './components/invoice-edit-dialog'
import { InvoiceRejectDialog } from './components/invoice-reject-dialog'
import { formatInvoiceCopyText, invoiceStatusMeta } from './lib/invoice-display'
import type { InvoiceRecord, InvoiceStatus } from './types'

const MONEY_FORMAT = { fixedFractionDigits: 2 } as const
const PAGE_SIZE_OPTIONS = [10, 20, 50]

const formatMoney = (amount: number) =>
  formatLocalCurrencyAmount(amount, MONEY_FORMAT)

const ORDER_STATUS_META: Record<string, { dotClass: string; label: string }> = {
  success: { dotClass: 'bg-green-500', label: 'Paid' },
  test_success: { dotClass: 'bg-blue-500', label: 'Test success' },
  pending: { dotClass: 'bg-red-500', label: 'Unpaid' },
}

export function Orders() {
  const { t } = useTranslation()
  const isAdmin = useIsAdmin()
  const { copyToClipboard } = useCopyToClipboard()

  const consoleFeatures = useConsoleFeatures()
  const [tab, setTab] = useState('orders')

  useEffect(() => {
    if (!consoleFeatures.invoices && tab === 'invoices') {
      setTab('orders')
    }
  }, [consoleFeatures.invoices, tab])
  const [orderSelection, setOrderSelection] = useState<RowSelectionState>({})
  const [applyOpen, setApplyOpen] = useState(false)
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([])
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceRecord | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceRecord | null>(null)
  const [invoiceToReject, setInvoiceToReject] = useState<InvoiceRecord | null>(
    null
  )
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [userIdInput, setUserIdInput] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
    return end
  })
  const [amountStats, setAmountStats] = useState<{
    count: number
    total_amount: number
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [invoicePage, setInvoicePage] = useState(1)
  const [invoicePageSize, setInvoicePageSize] = useState(PAGE_SIZE_OPTIONS[0])

  const {
    records,
    total,
    page,
    pageSize,
    loading,
    handlePageChange,
    handlePageSizeChange,
    refresh,
  } = useBillingHistory({ initialPageSize: PAGE_SIZE_OPTIONS[0] })

  const invoicesQuery = useQuery({
    queryKey: ['invoices', isAdmin, invoicePage, invoicePageSize, userIdFilter],
    queryFn: () =>
      isAdmin
        ? getAllInvoices({
            page: invoicePage,
            pageSize: invoicePageSize,
            userId: userIdFilter,
          })
        : getUserInvoices(invoicePage, invoicePageSize),
    enabled: tab === 'invoices',
  })
  const invoices = invoicesQuery.data?.items ?? []
  const invoiceTotal = invoicesQuery.data?.total ?? 0

  const handleMarkInvoiced = useCallback(
    async (record: TopupRecord) => {
      try {
        await markTopUpInvoiced(record.id)
        toast.success(t('Marked as invoiced'))
        await refresh()
      } catch (error) {
        handleServerError(error, t('Failed to update invoice status'))
      }
    },
    [refresh, t]
  )

  const refetchInvoices = invoicesQuery.refetch

  const handleUpdateStatus = useCallback(
    async (invoice: InvoiceRecord, status: InvoiceStatus, reason?: string) => {
      try {
        await updateInvoiceStatus(invoice.id, status, reason)
        toast.success(t('Invoice status updated'))
        await refetchInvoices()
      } catch (error) {
        handleServerError(error, t('Failed to update invoice status'))
      }
    },
    [refetchInvoices, t]
  )

  const orderColumns = useMemo<ColumnDef<TopupRecord, unknown>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t('Select all')}
            className='translate-y-[2px]'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t('Select row')}
            className='translate-y-[2px]'
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'id',
        header: () => (isAdmin ? 'ID' : null),
        cell: ({ row }) => (isAdmin ? `#${row.original.id}` : null),
        enableSorting: false,
        enableHiding: false,
        size: 60,
      },
      {
        id: 'user_id',
        header: () => (isAdmin ? t('User ID') : null),
        cell: ({ row }) => (isAdmin ? `#${row.original.user_id}` : null),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'agent_user_id',
        header: () => (isAdmin ? t('Parent') : null),
        cell: () => (isAdmin ? '-' : null),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'trade_no',
        header: t('Merchant order number'),
        cell: ({ row }) =>
          row.original.trade_no ? (
            <CopyButton
              value={row.original.trade_no}
              position='right'
              className='bg-transparent! p-0'
            >
              <span className='font-mono text-xs whitespace-nowrap'>
                {row.original.trade_no}
              </span>
            </CopyButton>
          ) : (
            <span className='text-muted-foreground'>-</span>
          ),
      },
      {
        id: 'pay_type',
        header: t('Payment method'),
        cell: ({ row }) => {
          const record = row.original
          if (record.type === 2) return t('Redemption code')
          const name = getPaymentMethodName(record.payment_method, t)
          return name || t('Online top-up')
        },
      },
      {
        accessorKey: 'money',
        header: t('Payment amount'),
        cell: ({ row }) =>
          row.original.money === 0 ? (
            <span className='text-muted-foreground'>-</span>
          ) : (
            <span className='whitespace-nowrap tabular-nums'>
              {formatMoney(row.original.money)}
            </span>
          ),
      },
      {
        accessorKey: 'amount',
        header: t('Top-up quota'),
        cell: ({ row }) => (
          <span className='inline-flex items-center gap-0.5 whitespace-nowrap'>
            <span className='bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full'>
              <DollarSign className='size-3' />
            </span>
            <span className='tabular-nums'>
              {formatQuotaWithCurrency(row.original.amount, {
                digitsLarge: 2,
                digitsSmall: 4,
                abbreviate: true,
                showSymbol: false,
              })}
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'create_time',
        header: t('Created'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap tabular-nums'>
            {formatTimestamp(row.original.create_time)}
          </span>
        ),
      },
      {
        id: 'is_invoiced',
        header: t('Invoice status'),
        cell: ({ row }) => {
          const record = row.original
          if (record.type !== 1) {
            return <Badge variant='outline'>{t('Not supported')}</Badge>
          }
          if (record.status !== 'success') {
            return <span className='text-muted-foreground'>-</span>
          }
          if (record.is_invoiced) {
            return <Badge variant='outline'>{t('Invoiced')}</Badge>
          }
          const badge = (
            <Badge className='cursor-pointer border-green-500/20 bg-green-500/10 text-green-600'>
              {t('Not invoiced')}
            </Badge>
          )
          if (!isAdmin) return badge
          return (
            <Popconfirm
              title={t('Mark as invoiced?')}
              description={t('This action cannot be undone after marking.')}
              confirmText={t('Confirm marking')}
              destructive
              onConfirm={() => handleMarkInvoiced(record)}
            >
              {badge}
            </Popconfirm>
          )
        },
        size: 110,
      },
      {
        accessorKey: 'status',
        header: () => <div className='text-right'>{t('Status')}</div>,
        cell: ({ row }) => {
          const record = row.original
          const meta = ORDER_STATUS_META[record.status] ?? {
            dotClass: 'bg-red-500',
            label: 'Unpaid',
          }
          const label =
            record.status === 'success' && record.type === 2
              ? t('Redeemed')
              : t(meta.label)
          return (
            <div className='flex items-center justify-end gap-1.5 whitespace-nowrap'>
              <span className={`size-2 rounded-full ${meta.dotClass}`} />
              <span>{label}</span>
            </div>
          )
        },
        size: 74,
        meta: { pinned: 'right' as const },
      },
    ],
    [handleMarkInvoiced, isAdmin, t]
  )

  const invoiceColumns = useMemo<ColumnDef<InvoiceRecord, unknown>[]>(
    () => [
      ...(isAdmin
        ? ([
            {
              id: 'user',
              header: t('User'),
              cell: ({ row }) => (
                <span className='whitespace-nowrap'>
                  {row.original.username
                    ? `${row.original.username} #${row.original.user_id}`
                    : `#${row.original.user_id}`}
                </span>
              ),
              size: 140,
            },
          ] as ColumnDef<InvoiceRecord, unknown>[])
        : []),
      {
        accessorKey: 'type',
        header: t('Invoice type'),
        cell: ({ row }) =>
          row.original.type === 'special'
            ? t('VAT special invoice')
            : t('VAT ordinary invoice'),
      },
      {
        id: 'remark',
        header: '',
        enableHiding: false,
        cell: ({ row }) => {
          const content = row.original.content?.trim()
          if (!content) return null
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className='text-muted-foreground inline-flex cursor-help'>
                    <FileText className='size-3.5' aria-hidden='true' />
                  </span>
                }
              />
              <TooltipContent className='whitespace-pre-line'>
                {content}
              </TooltipContent>
            </Tooltip>
          )
        },
        size: 41,
        maxSize: 41,
      },
      {
        accessorKey: 'amount',
        header: t('Invoice amount'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap tabular-nums'>
            {formatMoney(row.original.amount)}
          </span>
        ),
      },
      {
        id: 'title_type',
        header: t('Title type'),
        cell: ({ row }) =>
          Number(row.original.tax_id) === 0
            ? t('Individual / Overseas enterprise')
            : t('Enterprise'),
      },
      {
        accessorKey: 'title',
        header: t('Invoice title'),
        cell: ({ row }) => (
          <span className='block max-w-36 truncate' title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('Application status'),
        cell: ({ row }) => {
          const meta = invoiceStatusMeta(row.original.status)
          return (
            <span className='inline-flex items-center gap-1'>
              <span className='inline-flex items-center gap-1.5 whitespace-nowrap'>
                <span className={`size-2 rounded-full ${meta.dotClass}`} />
                {t(meta.label)}
              </span>
              {row.original.reason && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className='inline-flex cursor-help text-red-500'>
                        <CircleAlert className='size-4' aria-hidden='true' />
                      </span>
                    }
                  />
                  <TooltipContent className='max-w-xs whitespace-pre-line'>
                    {row.original.reason}
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: t('Applied at'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap tabular-nums'>
            {formatTimestamp(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>{t('Actions')}</div>,
        cell: ({ row }) => {
          const invoice = row.original
          const status = invoice.status
          const isApproved = status === 'approved'
          const isPending = status === 'pending'
          const isInvoicing = status === 'invoicing'
          const isRejected = status === 'rejected'
          const isRedFlushing = status === 'red_flushing'
          const hasRedInvoice = !!invoice.red_invoice_no
          const deleteDisabled =
            isApproved || isInvoicing || isRedFlushing || hasRedInvoice
          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant='ghost' size='icon' className='size-8' />
                  }
                >
                  <span className='text-lg leading-none'>···</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-auto min-w-40'>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem
                        disabled={isRedFlushing}
                        onClick={() => handleUpdateStatus(invoice, 'approved')}
                      >
                        <span className='size-2 rounded-full bg-green-500' />
                        {isApproved ? t('Resend email') : t('Mark as invoiced')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isApproved || isInvoicing || isRedFlushing}
                        onClick={() => handleUpdateStatus(invoice, 'invoicing')}
                      >
                        <span className='size-2 rounded-full bg-blue-500' />
                        {t('Mark as invoicing')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isApproved || isPending || isRedFlushing}
                        onClick={() => handleUpdateStatus(invoice, 'pending')}
                      >
                        <span className='size-2 rounded-full bg-amber-500' />
                        {t('Mark as pending review')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={
                          isApproved ||
                          isRejected ||
                          isRedFlushing ||
                          hasRedInvoice
                        }
                        onClick={() => setInvoiceToReject(invoice)}
                      >
                        <span className='size-2 rounded-full bg-red-500' />
                        {t('Reject application')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {isPending && (
                        <DropdownMenuItem
                          onClick={() => setInvoiceToEdit(invoice)}
                        >
                          <Pencil className='size-3.5' />
                          {t('Edit information')}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {invoice.file_url && (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(invoice.file_url, '_blank', 'noopener')
                      }
                    >
                      <Download className='size-3.5' />
                      {t('Download invoice')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      void copyToClipboard(
                        formatInvoiceCopyText(invoice, t, formatMoney)
                      )
                    }}
                  >
                    <Copy className='size-3.5' />
                    {t('Copy information')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={deleteDisabled}
                    onClick={() => setInvoiceToDelete(invoice)}
                  >
                    <Trash2 className='size-3.5' />
                    {isAdmin ? t('Delete invoice') : t('Cancel application')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        size: 56,
        meta: { pinned: 'right' as const },
      },
    ],
    [copyToClipboard, handleUpdateStatus, isAdmin, t]
  )

  const ordersPagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize]
  )

  const { table: ordersTable } = useDataTable({
    data: records,
    columns: orderColumns,
    pagination: ordersPagination,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(ordersPagination) : updater
      if (next.pageSize !== ordersPagination.pageSize) {
        setOrderSelection({})
        handlePageSizeChange(next.pageSize)
        return
      }
      if (next.pageIndex !== ordersPagination.pageIndex) {
        setOrderSelection({})
        handlePageChange(next.pageIndex + 1)
      }
    },
    manualPagination: true,
    totalCount: total,
    getRowId: (row) => String(row.id),
    enableRowSelection: (row) =>
      row.original.type === 1 &&
      row.original.status === 'success' &&
      !row.original.is_invoiced,
    rowSelection: orderSelection,
    onRowSelectionChange: setOrderSelection,
  })

  const selectedOrders = ordersTable
    .getSelectedRowModel()
    .rows.map((row) => row.original)
  const selectedCount = selectedOrders.length
  const selectedMoney = selectedOrders.reduce(
    (sum, order) => sum + Number(order.money || 0),
    0
  )

  const invoicePagination = useMemo<PaginationState>(
    () => ({ pageIndex: invoicePage - 1, pageSize: invoicePageSize }),
    [invoicePage, invoicePageSize]
  )

  const { table: invoicesTable } = useDataTable({
    data: invoices,
    columns: invoiceColumns,
    pagination: invoicePagination,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(invoicePagination) : updater
      if (next.pageSize !== invoicePagination.pageSize) {
        setInvoicePageSize(next.pageSize)
        setInvoicePage(1)
        return
      }
      setInvoicePage(next.pageIndex + 1)
    },
    manualPagination: true,
    totalCount: invoiceTotal,
    enableRowSelection: false,
    getRowId: (row) => String(row.id),
  })

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === 'pending' && !invoice.red_invoice_no
  )

  const handleTabChange = useCallback((value: string) => {
    setTab(value)
  }, [])

  const handleApply = useCallback(() => {
    setPendingOrderIds(selectedOrders.map((order) => order.id))
    setApplyOpen(true)
  }, [selectedOrders])

  const handleBatchMarkInvoiced = useCallback(async () => {
    const ids = selectedOrders.map((order) => order.id)
    if (ids.length === 0) return
    try {
      const updated = await batchMarkTopUpInvoiced(ids)
      toast.success(
        t('Marked {{count}} orders as invoiced', { count: updated })
      )
      setOrderSelection({})
      await refresh()
    } catch (error) {
      handleServerError(error, t('Failed to update invoice status'))
    }
  }, [refresh, selectedOrders, t])

  const handleClearInvalid = useCallback(async () => {
    try {
      const deleted = await clearInvalidTopUps(48)
      toast.success(t('Cleared {{count}} invalid orders', { count: deleted }))
      await refresh()
    } catch (error) {
      handleServerError(error, t('Failed to clear invalid orders'))
    }
  }, [refresh, t])

  const handleBatchInvoicing = useCallback(async () => {
    const ids = pendingInvoices.map((invoice) => invoice.id)
    if (ids.length === 0) return
    try {
      const updated = await batchInvoicing(ids)
      toast.success(t('Submitted {{count}} applications', { count: updated }))
      await refetchInvoices()
    } catch (error) {
      handleServerError(error, t('Failed to update invoice status'))
    }
  }, [pendingInvoices, refetchInvoices, t])

  const handleCopyPending = useCallback(() => {
    if (pendingInvoices.length === 0) {
      toast.warning(t('No pending invoices to review'))
      return
    }
    void copyToClipboard(
      pendingInvoices
        .map((invoice) => formatInvoiceCopyText(invoice, t, formatMoney))
        .join('\n\n')
    )
  }, [copyToClipboard, pendingInvoices, t])

  const handleQueryAmount = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoadingStats(true)
    try {
      const stats = await getInvoiceAmountStats(
        Math.floor(startDate.getTime() / 1000),
        Math.floor(endDate.getTime() / 1000) + 86399
      )
      setAmountStats(stats)
    } catch (error) {
      handleServerError(error, t('Failed to load invoiceable amount'))
    } finally {
      setLoadingStats(false)
    }
  }, [endDate, startDate, t])

  const handleSearchUserId = useCallback(() => {
    setUserIdFilter(userIdInput.trim())
    setInvoicePage(1)
  }, [userIdInput])

  const handleDeleteInvoice = useCallback(async () => {
    if (!invoiceToDelete) return
    setDeleting(true)
    try {
      await deleteInvoice(invoiceToDelete.id)
      toast.success(t('Invoice deleted'))
      setInvoiceToDelete(null)
      await refetchInvoices()
    } catch (error) {
      handleServerError(error, t('Operation failed'))
    } finally {
      setDeleting(false)
    }
  }, [invoiceToDelete, refetchInvoices, t])

  const pillTriggerClassName =
    'text-muted-foreground data-active:bg-foreground data-active:text-background h-auto flex-none rounded-full px-3 py-1 shadow-none'

  const ordersToolbar = (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        {selectedCount > 0 ? (
          <span className='text-muted-foreground text-sm'>
            {t('Selected {{count}} orders, total', { count: selectedCount })}{' '}
            <b className='text-pink-500'>{formatMoney(selectedMoney)}</b>
          </span>
        ) : (
          !isAdmin && (
            <span className='text-muted-foreground flex items-center gap-1.5 text-sm'>
              <Info className='size-4 shrink-0' />
              {t('Tick specific orders to apply for an invoice!')}
            </span>
          )
        )}
      </div>
      <div className='flex items-center gap-2'>
        {isAdmin && selectedCount > 0 && (
          <>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setOrderSelection({})}
            >
              {t('Clear selection')}
            </Button>
            <Popconfirm
              title={t('Mark selected orders as invoiced?')}
              description={t(
                'Confirm marking the selected {{count}} orders as invoiced? This action cannot be undone!',
                { count: selectedCount }
              )}
              confirmText={t('Confirm marking')}
              destructive
              onConfirm={handleBatchMarkInvoiced}
            >
              <Button variant='outline' size='sm'>
                {t('Mark selected as invoiced')}
              </Button>
            </Popconfirm>
          </>
        )}
        {isAdmin && selectedCount === 0 && (
          <Popconfirm
            title={t('Clear invalid orders?')}
            description={t(
              'Unpaid orders older than 48 hours will be deleted. This action cannot be undone.'
            )}
            confirmText={t('Clear')}
            destructive
            onConfirm={handleClearInvalid}
          >
            <Button variant='ghost' size='sm'>
              {t('Clear invalid orders')}
            </Button>
          </Popconfirm>
        )}
        <Button
          variant='outline'
          size='icon'
          className='size-9'
          onClick={() => void refresh()}
        >
          {loading ? (
            <Spinner />
          ) : (
            <RefreshCw className='text-foreground/70 size-4' />
          )}
        </Button>
        {!isAdmin && (
          <Button onClick={handleApply}>
            <FileText className='size-4' />
            {selectedCount > 0 ? t('Apply for invoice') : t('Invoice all')}
          </Button>
        )}
      </div>
    </div>
  )

  const invoicesToolbar = (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      {isAdmin ? (
        <div className='flex flex-wrap items-center gap-2'>
          <Field className='w-full gap-0 lg:w-auto'>
            <InputGroup className='w-full lg:w-58'>
              <InputGroupAddon>{t('User ID')}</InputGroupAddon>
              <InputGroupInput
                value={userIdInput}
                inputMode='numeric'
                pattern='[0-9]*'
                placeholder={t('Leave empty to query all')}
                autoComplete='off'
                onChange={(event) => setUserIdInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearchUserId()
                  }
                }}
              />
              <InputGroupAddon align='inline-end'>
                <InputGroupButton
                  size='icon-sm'
                  disabled={invoicesQuery.isFetching}
                  aria-label={t('Query invoices by user ID')}
                  title={t('Query invoices by user ID')}
                  onClick={handleSearchUserId}
                >
                  <Search className='text-primary size-4' />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <DatePicker
            selected={startDate}
            onSelect={setStartDate}
            prefix={t('Start')}
            className='bg-background w-full lg:w-58'
          />
          <DatePicker
            selected={endDate}
            onSelect={setEndDate}
            prefix={t('End')}
            className='bg-background w-full lg:w-58'
          />
          <Button
            variant='outline'
            className='border-border/60'
            disabled={loadingStats}
            onClick={handleQueryAmount}
          >
            {loadingStats && <Spinner data-icon='inline-start' />}
            {t('Query total')}
          </Button>
          {amountStats && (
            <span className='text-sm whitespace-nowrap'>
              {t('Issued {{count}} invoices, total', {
                count: amountStats.count,
              })}{' '}
              <b>{formatMoney(amountStats.total_amount)}</b>
            </span>
          )}
        </div>
      ) : (
        <span className='text-muted-foreground flex items-center gap-1.5 text-sm max-md:pb-2'>
          <Info className='size-4 shrink-0' />
          {t(
            'Invoice files will be sent to your account email, or click the action menu to download'
          )}
        </span>
      )}
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='icon'
          className='border-border/60 size-9'
          onClick={() => void refetchInvoices()}
        >
          {invoicesQuery.isFetching ? (
            <Spinner />
          ) : (
            <RefreshCw className='text-foreground/70 size-4' />
          )}
        </Button>
        {isAdmin && (
          <>
            <Button
              variant='outline'
              className='border-border/60'
              onClick={handleCopyPending}
            >
              {t('Copy pending')}
            </Button>
            <Popconfirm
              title={t('Submit for review in batch?')}
              description={t(
                'Pending applications will be marked as invoicing. This action cannot be undone.'
              )}
              confirmText={t('Confirm')}
              disabled={pendingInvoices.length === 0}
              onConfirm={handleBatchInvoicing}
            >
              <Button variant='outline' className='border-border/60'>
                {t('Batch review')}
              </Button>
            </Popconfirm>
            <Button
              className='shadow-primary/20 px-4 shadow-lg'
              onClick={() => setCreateOpen(true)}
            >
              <Plus className='size-4' />
              {t('Create invoice')}
            </Button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Breadcrumb>
          <ConsoleBreadcrumb
            items={[
              { label: t('Dashboard'), href: '/dashboard/overview' },
              { label: t('Orders / Invoices') },
            ]}
          />
        </SectionPageLayout.Breadcrumb>
        <SectionPageLayout.Title>
          {t('Orders / Invoices')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <Tabs value={tab} onValueChange={handleTabChange} className='gap-0'>
            <div className='border-border/40 rounded-xl border p-3 lg:p-5'>
              <TabsList className='border-border/40 bg-muted/40 h-9 w-fit gap-1 rounded-full border p-1'>
                <TabsTrigger value='orders' className={pillTriggerClassName}>
                  {t('Order list')}
                </TabsTrigger>
                {consoleFeatures.invoices && (
                  <TabsTrigger
                    value='invoices'
                    className={pillTriggerClassName}
                  >
                    {t('Invoicing records')}
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value='orders' className='mt-4'>
                <DataTablePage
                  table={ordersTable}
                  columns={orderColumns}
                  toolbar={ordersToolbar}
                  fixedHeight={false}
                  paginationInFooter={false}
                  isLoading={loading}
                  emptyTitle=''
                  emptyDescription={t('No data')}
                  emptyIcon={<TableRowsIllustration />}
                  emptyCellClassName='h-[280px] p-0'
                  skeletonKeyPrefix='orders-skeleton'
                  onRowClick={(row) => {
                    if (isAdmin) void handleMarkInvoiced(row.original)
                  }}
                />
              </TabsContent>
              {consoleFeatures.invoices && (
              <TabsContent value='invoices' className='mt-4'>
                <DataTablePage
                  table={invoicesTable}
                  columns={invoiceColumns}
                  toolbar={invoicesToolbar}
                  fixedHeight={false}
                  paginationInFooter={false}
                  isLoading={invoicesQuery.isLoading}
                  isFetching={invoicesQuery.isFetching}
                  emptyTitle=''
                  emptyDescription={t('No data')}
                  emptyIcon={<TableRowsIllustration />}
                  emptyCellClassName='h-[280px] p-0'
                  skeletonKeyPrefix='invoices-skeleton'
                  onRowClick={(row) => setInvoiceDetail(row.original)}
                />
              </TabsContent>
              )}
            </div>
          </Tabs>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <InvoiceApplyDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        orderIds={pendingOrderIds}
        onApplied={() => {
          setOrderSelection({})
          void refresh()
        }}
      />
      <InvoiceDetailDialog
        invoice={invoiceDetail}
        onOpenChange={(open) => {
          if (!open) setInvoiceDetail(null)
        }}
        formatTime={formatTimestamp}
      />
      <InvoiceEditDialog
        invoice={invoiceToEdit}
        onOpenChange={(open) => {
          if (!open) setInvoiceToEdit(null)
        }}
        onSaved={() => void refetchInvoices()}
      />
      <InvoiceRejectDialog
        invoice={invoiceToReject}
        onOpenChange={(open) => {
          if (!open) setInvoiceToReject(null)
        }}
        onRejected={() => void refetchInvoices()}
      />
      <InvoiceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void refetchInvoices()}
      />
      <ConfirmDialog
        open={!!invoiceToDelete}
        onOpenChange={(open) => {
          if (!open) setInvoiceToDelete(null)
        }}
        title={isAdmin ? t('Delete invoice') : t('Cancel application')}
        desc={
          isAdmin
            ? t('This action cannot be undone.')
            : t('This action cannot be undone.')
        }
        confirmText={isAdmin ? t('Delete') : t('Confirm')}
        destructive
        isLoading={deleting}
        handleConfirm={() => void handleDeleteInvoice()}
      />
    </>
  )
}
