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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CopyButton } from '@/components/copy-button'
import { DataTablePage, useDataTable } from '@/components/data-table'
import { TableRowsIllustration } from '@/components/empty-illustrations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrencyFromUSD } from '@/lib/currency'
import { formatTimestamp } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'

import {
  getAffiliateLogs,
  getWithdrawals,
  updateWithdrawalStatus,
} from '../api'
import type { AffiliateLogItem, WithdrawalRecord } from '../types'

const MONEY_FORMAT = { fixedFractionDigits: 2 } as const

const PAGE_SIZE = 10

const WITHDRAWAL_STATUS = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 2,
  REJECTED: 3,
} as const

function WithdrawalStatusBadge({ status }: { status: number }) {
  const { t } = useTranslation()
  switch (status) {
    case WITHDRAWAL_STATUS.PAID:
      return (
        <Badge className='border-green-500/15 bg-green-500/10 text-green-600'>
          {t('Withdrawn')}
        </Badge>
      )
    case WITHDRAWAL_STATUS.PENDING:
      return (
        <Badge className='border-yellow-500/15 bg-yellow-500/10 text-yellow-600'>
          {t('Pending review')}
        </Badge>
      )
    case WITHDRAWAL_STATUS.PROCESSING:
      return (
        <Badge className='border-blue-500/15 bg-blue-500/10 text-blue-600'>
          {t('Processing')}
        </Badge>
      )
    case WITHDRAWAL_STATUS.REJECTED:
      return (
        <Badge className='border-red-500/15 bg-red-500/10 text-red-600'>
          {t('Rejected')}
        </Badge>
      )
    default:
      return <Badge variant='outline'>{t('Unknown')}</Badge>
  }
}

function useRecordPagination(page: number) {
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize: PAGE_SIZE }),
    [page]
  )
  const onPaginationChange = useCallback(
    (updater: React.SetStateAction<PaginationState>) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      return next
    },
    [pagination]
  )
  return { pagination, onPaginationChange }
}

interface AffiliateRecordsProps {
  isAdmin: boolean
  withdrawalEnabled: boolean
  reloadToken: number
  onQuotaChanged: () => void
}

export function AffiliateRecords({
  isAdmin,
  withdrawalEnabled,
  reloadToken,
  onQuotaChanged,
}: AffiliateRecordsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('reward')
  const [rewardPage, setRewardPage] = useState(1)
  const [withdrawalPage, setWithdrawalPage] = useState(1)

  const rewardsQuery = useQuery({
    queryKey: ['affiliate-logs', isAdmin, rewardPage, reloadToken],
    queryFn: () => getAffiliateLogs(rewardPage, PAGE_SIZE, isAdmin),
  })
  const withdrawalsQuery = useQuery({
    queryKey: ['invite-withdrawals', isAdmin, withdrawalPage, reloadToken],
    queryFn: () => getWithdrawals(withdrawalPage, PAGE_SIZE, isAdmin),
    enabled: withdrawalEnabled,
  })

  const rewardColumns = useMemo<ColumnDef<AffiliateLogItem, unknown>[]>(
    () => [
      {
        accessorKey: 'create_time',
        header: t('Created'),
        cell: ({ row }) => (
          <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
            {formatTimestamp(row.original.create_time)}
          </span>
        ),
        size: 170,
      },
      ...(isAdmin
        ? ([
            {
              id: 'user_id',
              header: t('Inviter'),
              cell: ({ row }) => (
                <span className='whitespace-nowrap'>
                  {row.original.user_name ||
                    (row.original.user_id ? `#${row.original.user_id}` : '-')}
                </span>
              ),
              size: 150,
            },
            {
              id: 'invitee_id',
              header: t('Invitee'),
              cell: ({ row }) => (
                <span className='whitespace-nowrap'>
                  {row.original.invitee_name ||
                    (row.original.invitee_id
                      ? `#${row.original.invitee_id}`
                      : '-')}
                </span>
              ),
              size: 150,
            },
          ] as ColumnDef<AffiliateLogItem, unknown>[])
        : []),
      {
        accessorKey: 'invitee_quota',
        header: t('Invitee Top-up'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap tabular-nums'>
            {row.original.invitee_quota > 0
              ? formatCurrencyFromUSD(row.original.invitee_quota, MONEY_FORMAT)
              : '-'}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'reward_quota',
        header: t('Reward'),
        cell: ({ row }) =>
          row.original.reward_quota > 0 ? (
            <Badge variant='outline' className='whitespace-nowrap'>
              {formatCurrencyFromUSD(row.original.reward_quota, MONEY_FORMAT)}
            </Badge>
          ) : (
            <span>-</span>
          ),
        size: 140,
      },
      {
        id: 'status',
        header: t('Status'),
        cell: ({ row }) =>
          row.original.status === 1 ? (
            <Badge className='border-green-500/15 bg-green-500/10 text-green-600'>
              {t('Rewarded')}
            </Badge>
          ) : (
            <Badge variant='outline'>{t('No Reward')}</Badge>
          ),
        size: 130,
      },
      {
        id: 'content',
        header: t('Details'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>
            {row.original.content ||
              (row.original.source === 'topup'
                ? t('Invite top-up reward')
                : t('Invite registration reward'))}
          </span>
        ),
        size: 180,
      },
    ],
    [isAdmin, t]
  )

  const handleUpdateStatus = useCallback(
    async (record: WithdrawalRecord, status: number) => {
      try {
        await updateWithdrawalStatus(record.id, status)
        toast.success(t('Withdrawal status updated'))
        if (status === WITHDRAWAL_STATUS.REJECTED) {
          onQuotaChanged()
        }
        await queryClient.invalidateQueries({
          queryKey: ['invite-withdrawals'],
        })
      } catch (error) {
        handleServerError(error, t('Operation failed'))
      }
    },
    [onQuotaChanged, queryClient, t]
  )

  const withdrawalColumns = useMemo<ColumnDef<WithdrawalRecord, unknown>[]>(
    () => [
      {
        accessorKey: 'create_time',
        header: t('Applied At'),
        cell: ({ row }) => (
          <span className='text-muted-foreground whitespace-nowrap tabular-nums'>
            {formatTimestamp(row.original.create_time)}
          </span>
        ),
        size: 170,
      },
      ...(isAdmin
        ? ([
            {
              id: 'user_id',
              header: t('User ID'),
              cell: ({ row }) => (
                <span className='whitespace-nowrap'>
                  {row.original.user_id ? `#${row.original.user_id}` : '-'}
                </span>
              ),
              size: 110,
            },
          ] as ColumnDef<WithdrawalRecord, unknown>[])
        : []),
      {
        accessorKey: 'amount',
        header: t('Amount'),
        cell: ({ row }) => (
          <span className='whitespace-nowrap tabular-nums'>
            {formatCurrencyFromUSD(row.original.amount, MONEY_FORMAT)}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: 'amount_cny',
        header: t('Payout'),
        cell: ({ row }) => (
          <Badge variant='outline' className='whitespace-nowrap'>
            ¥{(row.original.amount_cny ?? 0).toFixed(2)}
          </Badge>
        ),
        size: 130,
      },
      ...(isAdmin
        ? ([
            {
              id: 'real_name',
              header: t('Real Name'),
              cell: ({ row }) => (
                <span className='whitespace-nowrap'>
                  {row.original.real_name || '-'}
                </span>
              ),
              size: 130,
            },
            {
              id: 'account',
              header: t('Alipay Account'),
              cell: ({ row }) => (
                <CopyButton
                  value={row.original.account}
                  className='h-auto w-auto gap-1 p-0'
                  iconClassName='size-3'
                >
                  <span className='font-mono text-xs'>
                    {row.original.account}
                  </span>
                </CopyButton>
              ),
              size: 200,
            },
          ] as ColumnDef<WithdrawalRecord, unknown>[])
        : []),
      {
        id: 'status',
        header: t('Status'),
        cell: ({ row }) => (
          <WithdrawalStatusBadge status={row.original.status} />
        ),
        size: 130,
      },
      ...(isAdmin
        ? ([
            {
              id: 'actions',
              header: () => <div className='text-right'>{t('Actions')}</div>,
              cell: ({ row }) => (
                <div className='flex justify-end'>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button size='sm' variant='ghost'>
                          <MoreHorizontal className='size-4' />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align='end' className='w-48'>
                      <DropdownMenuLabel>
                        {t('Update Status')}
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(
                            row.original,
                            WITHDRAWAL_STATUS.PAID
                          )
                        }
                      >
                        <span className='mr-2 size-2 rounded-full bg-green-500' />
                        {t('Mark as paid')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(
                            row.original,
                            WITHDRAWAL_STATUS.PROCESSING
                          )
                        }
                      >
                        <span className='mr-2 size-2 rounded-full bg-blue-500' />
                        {t('Mark as processing')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(
                            row.original,
                            WITHDRAWAL_STATUS.PENDING
                          )
                        }
                      >
                        <span className='mr-2 size-2 rounded-full bg-yellow-500' />
                        {t('Mark as pending')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant='destructive'
                        onClick={() =>
                          handleUpdateStatus(
                            row.original,
                            WITHDRAWAL_STATUS.REJECTED
                          )
                        }
                      >
                        <span className='mr-2 size-2 rounded-full bg-red-500' />
                        {t('Reject (refund quota)')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            row.original.account
                          )
                        }
                      >
                        {t('Copy withdrawal account')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
              size: 90,
            },
          ] as ColumnDef<WithdrawalRecord, unknown>[])
        : []),
    ],
    [handleUpdateStatus, isAdmin, t]
  )

  const rewardPaginationState = useRecordPagination(rewardPage)
  const { table: rewardTable } = useDataTable({
    data: rewardsQuery.data?.items ?? [],
    columns: rewardColumns,
    pagination: rewardPaginationState.pagination,
    onPaginationChange: (updater) => {
      const next = rewardPaginationState.onPaginationChange(updater)
      setRewardPage(next.pageIndex + 1)
    },
    manualPagination: true,
    enableRowSelection: false,
    totalCount: rewardsQuery.data?.total ?? 0,
  })

  const withdrawalPaginationState = useRecordPagination(withdrawalPage)
  const { table: withdrawalTable } = useDataTable({
    data: withdrawalsQuery.data?.items ?? [],
    columns: withdrawalColumns,
    pagination: withdrawalPaginationState.pagination,
    onPaginationChange: (updater) => {
      const next = withdrawalPaginationState.onPaginationChange(updater)
      setWithdrawalPage(next.pageIndex + 1)
    },
    manualPagination: true,
    enableRowSelection: false,
    totalCount: withdrawalsQuery.data?.total ?? 0,
  })

  const pillTriggerClassName =
    'text-muted-foreground data-active:bg-foreground data-active:text-background h-auto flex-none rounded-full px-3 py-1 shadow-none'

  return (
    <div className={cn('rounded-xl border border-border/40 p-3 lg:p-5')}>
      <Tabs value={tab} onValueChange={setTab} className='w-full gap-0'>
        <TabsList className='border-border/40 bg-background/40 h-9 w-fit gap-1 rounded-full border p-1'>
          <TabsTrigger value='reward' className={pillTriggerClassName}>
            {t('Reward Records')}
          </TabsTrigger>
          {withdrawalEnabled && (
            <TabsTrigger value='withdrawal' className={pillTriggerClassName}>
              {t('Withdrawal Records')}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value='reward' className='mt-4'>
          <DataTablePage
            table={rewardTable}
            columns={rewardColumns}
            toolbar={null}
            paginationInFooter={false}
            isLoading={rewardsQuery.isLoading}
            isFetching={rewardsQuery.isFetching}
            emptyTitle=''
            emptyDescription={t('No data')}
            emptyIcon={<TableRowsIllustration />}
            hideMobile
            skeletonKeyPrefix='affiliate-reward-skeleton'
          />
        </TabsContent>
        {withdrawalEnabled && (
          <TabsContent value='withdrawal' className='mt-4'>
            <DataTablePage
              table={withdrawalTable}
              columns={withdrawalColumns}
              toolbar={null}
              paginationInFooter={false}
              isLoading={withdrawalsQuery.isLoading}
              isFetching={withdrawalsQuery.isFetching}
              emptyTitle=''
              emptyDescription={t('No data')}
              emptyIcon={<TableRowsIllustration />}
              hideMobile
              skeletonKeyPrefix='affiliate-withdrawal-skeleton'
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
