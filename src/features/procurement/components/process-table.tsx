'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataTable } from '@/hooks/use-data-table';
import type { DataTableFeatures } from '@/lib/data-table-features';
import { getSortingStateParser } from '@/lib/data-table-parsers';
import { formatJalali } from '@/lib/jalali';
import { procQueries } from '../api/queries';
import { PROCESS_STATUS_OPTIONS, PURCHASE_TYPE_OPTIONS, ROUTES } from '../constants';
import type { Filters, ProcessListRow } from '../types';
import { StatusBadge } from './badges';
import { useLookups } from './lookups';

export function ProcessTable() {
  const { money } = useLookups();
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<DataTableFeatures, ProcessListRow>[]>(() => [
    {
      id: 'requestNumber', accessorKey: 'requestNumber', enableColumnFilter: true,
      header: ({ column }) => <DataTableColumnHeader column={column} label='شماره درخواست' />,
      cell: ({ row }) => <Link href={ROUTES.process(row.original.id)} className='font-medium underline-offset-4 hover:underline'>{row.original.requestNumber}</Link>,
      meta: { label: 'جستجو', placeholder: 'شماره درخواست، شرکت یا کالا…', variant: 'text', icon: Icons.search }
    },
    { id: 'companyName', accessorKey: 'companyName', header: ({ column }) => <DataTableColumnHeader column={column} label='شرکت متقاضی' /> },
    { id: 'itemName', accessorKey: 'itemName', header: ({ column }) => <DataTableColumnHeader column={column} label='کالا' />, cell: ({ row }) => <div><div>{row.original.itemName}</div><div className='text-muted-foreground text-xs'>{row.original.categoryName}</div></div> },
    { id: 'startDate', accessorKey: 'startDate', header: ({ column }) => <DataTableColumnHeader column={column} label='تاریخ شروع' />, cell: ({ row }) => <span className='tabular-nums'>{formatJalali(row.original.startDate)}</span> },
    {
      id: 'purchaseType', accessorKey: 'purchaseType', enableColumnFilter: true,
      header: ({ column }) => <DataTableColumnHeader column={column} label='نوع خرید' />,
      cell: ({ row }) => <StatusBadge kind='purchaseType' value={row.original.purchaseType} />,
      meta: { label: 'نوع خرید', variant: 'select', options: PURCHASE_TYPE_OPTIONS }
    },
    {
      id: 'status', accessorKey: 'status', enableColumnFilter: true,
      header: ({ column }) => <DataTableColumnHeader column={column} label='وضعیت' />,
      cell: ({ row }) => <StatusBadge kind='processStatus' value={row.original.status} />,
      meta: { label: 'وضعیت', variant: 'select', options: PROCESS_STATUS_OPTIONS }
    },
    { id: 'agentName', accessorKey: 'agentName', enableSorting: false, header: 'مأمور خرید', cell: ({ row }) => row.original.agentName ?? '—' },
    {
      id: 'purchase', enableSorting: false, header: 'قیمت خرید',
      cell: ({ row }) => <span className='tabular-nums'>{money(row.original.purchaseAmount, row.original.purchaseCurrencyId)}</span>
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant='ghost' size='icon-sm' aria-label='مشاهده و ویرایش' onClick={() => router.push(ROUTES.process(row.original.id))}>
          <Icons.eye />
        </Button>
      )
    }
  ], [money, router]);

  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    requestNumber: parseAsString,
    status: parseAsString,
    purchaseType: parseAsString,
    sort: getSortingStateParser().withDefault([])
  });

  const filters: Filters = {
    ...(params.requestNumber && { q: params.requestNumber }),
    ...(params.status && { status: params.status as Filters['status'] }),
    ...(params.purchaseType && { purchaseType: params.purchaseType as Filters['purchaseType'] })
  };
  const { data, isLoading } = useQuery({ ...procQueries.list(filters, params.page, params.perPage, JSON.stringify(params.sort)), placeholderData: (prev) => prev });
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / params.perPage));

  const { table } = useDataTable({
    data: data?.rows ?? [], columns, pageCount, shallow: true, debounceMs: 400,
    initialState: { columnPinning: { start: [], end: ['actions'] } }
  });

  if (isLoading) return <Skeleton className='h-96 w-full' />;
  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
