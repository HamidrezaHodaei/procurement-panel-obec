'use client';

import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { procQueries } from '../api/queries';
import { filtersToQuery } from '../api/client';
import type { ReportId } from '../types';
import { ALL_FILTER_KEYS, FilterBar, useFilters } from './filter-bar';
import { ReportTable } from './report-table';

export const REPORT_LIST: { id: ReportId; title: string }[] = [
  { id: 'processes', title: 'فهرست فرآیندهای خرید' },
  { id: 'byCompany', title: 'فرآیندها به تفکیک شرکت' },
  { id: 'byItem', title: 'خرید به تفکیک کالا' },
  { id: 'byCategory', title: 'خرید به تفکیک دسته‌بندی' },
  { id: 'agents', title: 'عملکرد مأموران خرید' },
  { id: 'executors', title: 'عملکرد مجریان خرید' },
  { id: 'purchaseType', title: 'مقایسه داخلی و خارجی' },
  { id: 'totalsByCurrency', title: 'مجموع مبالغ به تفکیک ارز' },
  { id: 'proformas', title: 'پیش‌فاکتورهای صادرشده' },
  { id: 'cheques', title: 'چک‌ها و سررسیدها' },
  { id: 'obligations', title: 'تعهدات پرداخت‌نشده و آتی' },
  { id: 'guarantees', title: 'ضمانت‌ها و وضعیت تسویه' },
  { id: 'durations', title: 'مدت‌زمان اجرای فرآیندها' }
];

export function ReportsView() {
  const { filters } = useFilters();
  const [rid, setRid] = useQueryState('report', parseAsString.withDefault('processes'));
  const id = (REPORT_LIST.some((r) => r.id === rid) ? rid : 'processes') as ReportId;
  const { data, isLoading, isFetching } = useQuery({ ...procQueries.report(id, filters), placeholderData: (p) => p });

  const exportXlsx = () => { window.location.href = `/api/procurement/reports/${id}/export${filtersToQuery(filters)}`; };
  const exportPdf = () => window.open(`/print/report${filtersToQuery(filters, { report: id })}`, '_blank');

  return (
    <div className='grid flex-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]'>
      <nav aria-label='فهرست گزارش‌ها' className='space-y-1 lg:sticky lg:top-0 lg:self-start'>
        {REPORT_LIST.map((r) => (
          <Button key={r.id} variant={r.id === id ? 'secondary' : 'ghost'} className='h-auto w-full justify-start py-2 text-start whitespace-normal' onClick={() => setRid(r.id)}>
            {r.title}
          </Button>
        ))}
      </nav>
      <div className='min-w-0 space-y-4'>
        <FilterBar keys={ALL_FILTER_KEYS} collapsible />
        <Card>
          <CardHeader>
            <CardTitle>{data?.title ?? REPORT_LIST.find((r) => r.id === id)?.title}</CardTitle>
            <CardDescription>{data?.description}</CardDescription>
            <CardAction className='flex flex-wrap gap-2'>
              <Button variant='outline' size='sm' onClick={exportXlsx}><Icons.fileTypeXls /> خروجی Excel</Button>
              <Button variant='outline' size='sm' onClick={exportPdf}><Icons.fileTypePdf /> خروجی PDF</Button>
            </CardAction>
          </CardHeader>
          <CardContent className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
            {isLoading || !data ? <Skeleton className='h-72 w-full' /> : (<>
              <ReportTable report={data} />
              {data.notes && <p className='text-muted-foreground mt-3 flex gap-1.5 text-xs'><Icons.info className='mt-0.5 size-3.5 shrink-0' />{data.notes}</p>}
            </>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
