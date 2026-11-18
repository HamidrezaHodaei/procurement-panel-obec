'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { formatJalali, todayIso } from '@/lib/jalali';
import { procQueries } from '../api/queries';
import { filtersFromParams } from './filters-from-params';
import { renderCell } from './report-table';
import type { ReportId } from '../types';

/**
 * Print-friendly report. "Save as PDF" in the browser print dialog produces a PDF with correct
 * Persian shaping and RTL layout (server-side PDF libraries handle Persian poorly).
 */
export function PrintReport() {
  const sp = useSearchParams();
  const id = (sp.get('report') ?? 'processes') as ReportId;
  const { data, isLoading, error } = useQuery(procQueries.report(id, filtersFromParams(sp)));
  const printed = React.useRef(false);

  React.useEffect(() => {
    if (data && !printed.current) { printed.current = true; setTimeout(() => window.print(), 400); }
  }, [data]);

  if (isLoading) return <p className='p-8 text-center'>در حال آماده‌سازی گزارش…</p>;
  if (error || !data) return <p className='text-destructive p-8 text-center'>تهیه گزارش ناموفق بود.</p>;

  return (
    <div className='bg-background text-foreground min-h-screen p-6 print:p-0'>
      <style>{`@page { size: A4 landscape; margin: 10mm; } @media print { body { background: #fff !important; } }`}</style>
      <div className='mb-4 flex items-start justify-between gap-4 print:hidden'>
        <p className='text-muted-foreground text-sm'>برای ذخیره به‌صورت PDF، در پنجرهٔ چاپ مقصد را «Save as PDF» انتخاب کنید.</p>
        <Button onClick={() => window.print()}><Icons.print /> چاپ / ذخیره PDF</Button>
      </div>
      <h1 className='text-xl font-bold'>{data.title}</h1>
      <p className='text-muted-foreground mb-3 text-xs'>تاریخ گزارش: {formatJalali(todayIso())} — تعداد ردیف: {data.total.toLocaleString('fa-IR')}</p>
      <table className='w-full border-collapse text-[11px]'>
        <thead>
          <tr>{data.columns.map((c) => <th key={c.key} className='border bg-neutral-100 px-1.5 py-1 text-start font-semibold text-neutral-900'>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className='break-inside-avoid'>{data.columns.map((c) => <td key={c.key} className='border px-1.5 py-1'>{renderCell(c, r[c.key])}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {data.notes && <p className='text-muted-foreground mt-3 text-xs'>{data.notes}</p>}
    </div>
  );
}
