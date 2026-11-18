'use client';

import { useQuery } from '@tanstack/react-query';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatJalaliDateTime } from '@/lib/jalali';
import { procQueries } from '../api/queries';
import type { ProcessDetail } from '../types';

const ACTION = {
  create: { label: 'ایجاد', icon: Icons.plusCircle, variant: 'secondary' as const },
  update: { label: 'ویرایش', icon: Icons.edit, variant: 'outline' as const },
  delete: { label: 'حذف', icon: Icons.trash, variant: 'destructive' as const }
};

/** Complete change history of a process and everything attached to it. */
export function AuditPanel({ d }: { d: ProcessDetail }) {
  const { data, isLoading } = useQuery(procQueries.audit(d.id));
  return (
    <div className='space-y-4'>
      <Card size='sm'>
        <CardHeader><CardTitle>مشخصات ثبت</CardTitle></CardHeader>
        <CardContent className='grid gap-2 text-sm sm:grid-cols-2'>
          <div><span className='text-muted-foreground'>ثبت‌کننده: </span>{d.createdBy} — {formatJalaliDateTime(d.createdAt)}</div>
          <div><span className='text-muted-foreground'>آخرین ویرایش: </span>{d.updatedBy} — {formatJalaliDateTime(d.updatedAt)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>سوابق تغییرات</CardTitle>
          <CardDescription>همهٔ تغییرات پرونده، چک‌ها، مراحل پرداخت و ضمانت‌ها؛ جدیدترین در بالا</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {isLoading && <Skeleton className='h-24 w-full' />}
          {data?.map((e) => {
            const a = ACTION[e.action];
            const Icon = a.icon;
            return (
              <div key={e.id} className='border-s-2 ps-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant={a.variant}><Icon /> {a.label}</Badge>
                  <span className='text-sm font-medium'>{e.summary}</span>
                  <span className='text-muted-foreground ms-auto text-xs'>{e.userName} — {formatJalaliDateTime(e.at)}</span>
                </div>
                {e.changes && (
                  <ul className='text-muted-foreground mt-2 space-y-1 text-xs'>
                    {Object.entries(e.changes).map(([field, [from, to]]) => (
                      <li key={field}>
                        <span className='text-foreground'>{field}:</span>{' '}
                        {e.action !== 'create' && e.action !== 'delete' && <><span className='line-through'>{String(from)}</span> ← </>}
                        <span>{String(to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {data && data.length === 0 && <p className='text-muted-foreground text-sm'>سابقه‌ای ثبت نشده است.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
