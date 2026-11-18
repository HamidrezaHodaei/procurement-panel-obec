'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatJalali } from '@/lib/jalali';
import { formatMoney, formatNumber } from '@/lib/money';
import { cn } from '@/lib/utils';
import { ROUTES } from '../constants';
import type { Cell, MoneyCell, ReportColumn, ReportResult, ReportRow } from '../types';
import { StatusBadge } from './badges';
import { OptionSelect } from './form-parts';

export function renderCell(c: ReportColumn, v: Cell | undefined): React.ReactNode {
  if (v === null || v === undefined || v === '') return <span className='text-muted-foreground'>—</span>;
  switch (c.type) {
    case 'money': { const m = v as MoneyCell; return <span className='tabular-nums'>{formatMoney(m.v, m.d)} {m.c}</span>; }
    case 'date': return <span className='tabular-nums'>{formatJalali(String(v))}</span>;
    case 'badge': return <StatusBadge kind={c.badge ?? ''} value={String(v)} />;
    case 'int': return <span className='tabular-nums'>{formatNumber(Number(v))}</span>;
    case 'days': {
      const n = Number(v);
      return <span className={cn('tabular-nums', n < 0 && 'text-destructive')} dir='ltr'>{formatNumber(n)}</span>;
    }
    default: return String(v);
  }
}

/** Sort key per cell (money sorts by amount; dates sort as ISO strings). */
const sortKey = (c: ReportColumn, r: ReportRow) => {
  const v = r[c.key];
  if (v === null || v === undefined) return null;
  return c.type === 'money' ? (v as MoneyCell).v : (v as string | number);
};
const searchText = (cols: ReportColumn[], r: ReportRow) =>
  cols.map((c) => { const v = r[c.key]; return typeof v === 'object' && v ? (v as MoneyCell).c : v === null || v === undefined ? '' : String(v); }).join(' ').toLowerCase();

/** Generic report grid: quick search, sorting, paging. Click a row to open its purchase file. */
export function ReportTable({ report }: { report: ReportResult }) {
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState<{ key: string; desc: boolean } | null>(null);
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState('25');

  React.useEffect(() => { setPage(1); setSort(null); setQ(''); }, [report.id]);
  React.useEffect(() => setPage(1), [q, per]);

  const rows = React.useMemo(() => {
    let r = report.rows;
    if (q.trim()) { const t = q.trim().toLowerCase(); r = r.filter((x) => searchText(report.columns, x).includes(t)); }
    if (sort) {
      const col = report.columns.find((c) => c.key === sort.key)!;
      r = [...r].sort((a, b) => {
        const x = sortKey(col, a), y = sortKey(col, b);
        if (x === y) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fa');
        return sort.desc ? -cmp : cmp;
      });
    }
    return r;
  }, [report, q, sort]);

  const perN = Number(per);
  const pages = Math.max(1, Math.ceil(rows.length / perN));
  const view = rows.slice((page - 1) * perN, page * perN);
  const clickable = report.rows.some((r) => r._processId);

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative w-full max-w-xs'>
          <Icons.search className='text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2' />
          <Input className='ps-8' placeholder='جستجوی سریع در نتایج…' value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Badge variant='outline'>{formatNumber(rows.length)} ردیف</Badge>
        {clickable && <span className='text-muted-foreground text-xs'>برای دیدن جزئیات، روی ردیف کلیک کنید.</span>}
      </div>

      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              {report.columns.map((c) => (
                <TableHead key={c.key} className='whitespace-nowrap'>
                  <button type='button' className='inline-flex items-center gap-1' onClick={() => setSort((s) => (s?.key === c.key ? (s.desc ? null : { key: c.key, desc: true }) : { key: c.key, desc: false }))}>
                    {c.label}
                    {sort?.key === c.key ? (sort.desc ? <Icons.chevronDown className='size-3.5' /> : <Icons.chevronUp className='size-3.5' />) : <Icons.chevronsUpDown className='text-muted-foreground size-3.5' />}
                  </button>
                </TableHead>
              ))}
              {clickable && <TableHead className='w-10' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.length === 0 && <TableRow><TableCell colSpan={report.columns.length + 1} className='text-muted-foreground h-24 text-center'>نتیجه‌ای یافت نشد.</TableCell></TableRow>}
            {view.map((r, i) => (
              <TableRow key={i} className={cn(r._processId && 'cursor-pointer')} onClick={() => r._processId && router.push(ROUTES.process(r._processId))}>
                {report.columns.map((c) => <TableCell key={c.key} className='whitespace-nowrap'>{renderCell(c, r[c.key])}</TableCell>)}
                {clickable && <TableCell>{r._processId && <Icons.eye className='text-muted-foreground size-4' />}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-muted-foreground'>تعداد در صفحه</span>
          <div className='w-20'><OptionSelect value={per} onChange={(v) => setPer(v ?? '25')} options={['10', '25', '50', '100'].map((x) => ({ value: x, label: formatNumber(Number(x)) }))} /></div>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <Button variant='outline' size='icon-sm' disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label='صفحه قبل'><Icons.chevronRight /></Button>
          <span>صفحه {formatNumber(page)} از {formatNumber(pages)}</span>
          <Button variant='outline' size='icon-sm' disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label='صفحه بعد'><Icons.chevronLeft /></Button>
        </div>
      </div>
    </div>
  );
}
