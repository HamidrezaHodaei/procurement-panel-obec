'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { procKeys, procMutations, procQueries } from '../api/queries';
import { ROUTES } from '../constants';
import { StatusBadge } from './badges';
import { AuditPanel } from './audit-panel';
import { PaymentsPanel } from './payments-panel';
import { ProcessForm } from './process-form';
import { useMe } from './use-me';

export function ProcessView({ id }: { id: number }) {
  const router = useRouter();
  const { canEdit } = useMe();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(procQueries.detail(id));
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('info'));
  const [confirm, setConfirm] = React.useState(false);
  const del = useMutation({
    ...procMutations.deleteProcess(),
    onSuccess: () => { toast.success('پرونده حذف شد'); qc.invalidateQueries({ queryKey: procKeys.all }); router.push(ROUTES.processes); },
    onError: () => toast.error('حذف پرونده ناموفق بود')
  });

  if (isLoading) return <div className='space-y-3'><Skeleton className='h-10 w-72' /><Skeleton className='h-96 w-full' /></div>;
  if (error || !data) {
    return (
      <div className='py-16 text-center'>
        <p className='text-muted-foreground mb-4'>پرونده‌ای با این مشخصات یافت نشد.</p>
        <Link href={ROUTES.processes} className={buttonVariants({ variant: 'outline' })}>بازگشت به فهرست</Link>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <Heading title={`پرونده خرید ${data.requestNumber}`} description='مشاهده و ویرایش اطلاعات، پرداخت‌ها، ضمانت‌ها و سوابق' />
          <StatusBadge kind='processStatus' value={data.status} />
          <StatusBadge kind='purchaseType' value={data.purchaseType} />
        </div>
        <div className='flex gap-2'>
          <Link href={ROUTES.processes} className={buttonVariants({ variant: 'outline' })}><Icons.arrowLeft className='rtl:rotate-0 ltr:rotate-180' /> فهرست</Link>
          {canEdit && <Button variant='destructive' onClick={() => setConfirm(true)}><Icons.trash /> حذف پرونده</Button>}
        </div>
      </div>

      {!canEdit && <p className='bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm'>دسترسی شما «مشاهده‌گر» است؛ امکان ثبت و ویرایش وجود ندارد.</p>}
      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value='info'><Icons.forms /> اطلاعات پرونده</TabsTrigger>
          <TabsTrigger value='payments'><Icons.cash /> پرداخت‌ها و ضمانت‌ها</TabsTrigger>
          <TabsTrigger value='history'><Icons.history /> سوابق تغییرات</TabsTrigger>
        </TabsList>
        <TabsContent value='info' className={cn('pt-4')}><fieldset disabled={!canEdit} className='contents'><ProcessForm initial={data} key={data.updatedAt} /></fieldset></TabsContent>
        <TabsContent value='payments' className='pt-4'><fieldset disabled={!canEdit} className='contents'><PaymentsPanel d={data} /></fieldset></TabsContent>
        <TabsContent value='history' className='pt-4'><AuditPanel d={data} /></TabsContent>
      </Tabs>

      <AlertModal
        isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={() => del.mutate(id)} loading={del.isPending}
        title='حذف پرونده خرید' description='با حذف پرونده، همهٔ چک‌ها، مراحل پرداخت و ضمانت‌های آن نیز حذف می‌شوند. این عمل قابل بازگشت نیست.' confirmLabel='حذف'
      />
    </div>
  );
}
