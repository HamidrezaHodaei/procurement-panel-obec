'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { Textarea } from '@/components/ui/textarea';
import { minorToInput } from '@/lib/money';
import { todayIso } from '@/lib/jalali';
import { ApiRequestError } from '../api/client';
import { procKeys, procMutations } from '../api/queries';
import {
  AGENT_RELATION_OPTIONS, PROCESS_STATUS_OPTIONS, PURCHASE_TYPE_OPTIONS, ROUTES
} from '../constants';
import { processSchema, type ProcessInput } from '../schemas';
import type { Lookups, ProcessDetail } from '../types';
import { FormField, MoneyInput, OptionSelect, type Opt } from './form-parts';
import { JalaliDatePicker } from './jalali-date-picker';
import { useLookups } from './lookups';

export type ProcessFormState = {
  requestNumber: string; companyId: string; categoryId: string; itemId: string; startDate: string | null;
  status: 'active' | 'completed' | 'cancelled'; completedAt: string | null;
  agentId: string; agentRelation: string; executorId: string; purchaseType: 'domestic' | 'foreign'; brandId: string;
  actionsText: string; tenderWinner: string;
  purchaseAmount: string; purchaseCurrencyId: string; proformaDate: string | null; proformaAmount: string; proformaCurrencyId: string;
  paymentMethodIds: number[];
};

const s = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const n = (v: string) => (v === '' ? null : Number(v));

export function detailToForm(d: ProcessDetail, lk: Lookups): ProcessFormState {
  const dec = (id: number | null) => lk.currencies.find((c) => c.id === id)?.decimals ?? 0;
  return {
    requestNumber: d.requestNumber, companyId: s(d.companyId), categoryId: s(d.categoryId), itemId: s(d.itemId), startDate: d.startDate,
    status: d.status, completedAt: d.completedAt, agentId: s(d.agentId), agentRelation: d.agentRelation ?? '', executorId: s(d.executorId),
    purchaseType: d.purchaseType, brandId: s(d.brandId), actionsText: d.actionsText, tenderWinner: d.tenderWinner,
    purchaseAmount: minorToInput(d.purchaseAmount, dec(d.purchaseCurrencyId)), purchaseCurrencyId: s(d.purchaseCurrencyId),
    proformaDate: d.proformaDate, proformaAmount: minorToInput(d.proformaAmount, dec(d.proformaCurrencyId)), proformaCurrencyId: s(d.proformaCurrencyId),
    paymentMethodIds: d.paymentMethodIds
  };
}

export function formToInput(f: ProcessFormState): ProcessInput {
  return {
    requestNumber: f.requestNumber, companyId: n(f.companyId) as number, itemId: n(f.itemId) as number, startDate: f.startDate as string,
    status: f.status, completedAt: f.status === 'completed' ? f.completedAt : null,
    agentId: n(f.agentId), agentRelation: (f.agentRelation || null) as 'direct' | 'indirect' | null, executorId: n(f.executorId),
    purchaseType: f.purchaseType, brandId: n(f.brandId), actionsText: f.actionsText, tenderWinner: f.tenderWinner,
    purchaseAmount: f.purchaseAmount || null, purchaseCurrencyId: f.purchaseAmount ? n(f.purchaseCurrencyId) : null,
    proformaDate: f.proformaDate, proformaAmount: f.proformaAmount || null, proformaCurrencyId: f.proformaAmount ? n(f.proformaCurrencyId) : null,
    paymentMethodIds: f.paymentMethodIds
  };
}

/** Options that are active, plus the currently selected one even if it was deactivated later. */
function opts<T extends { id: number; name: string; isActive: boolean }>(list: T[], selected: string, filter?: (x: T) => boolean): Opt[] {
  return list
    .filter((x) => (x.isActive || String(x.id) === selected) && (!filter || filter(x) || String(x.id) === selected))
    .map((x) => ({ value: x.id, label: x.isActive ? x.name : `${x.name} (غیرفعال)` }));
}

export function ProcessForm({ initial }: { initial?: ProcessDetail }) {
  const { lookups, currency } = useLookups();
  const router = useRouter();
  const qc = useQueryClient();
  const firstCur = lookups.currencies.find((c) => c.isActive);

  const [f, setF] = React.useState<ProcessFormState>(() =>
    initial
      ? detailToForm(initial, lookups)
      : {
          requestNumber: '', companyId: '', categoryId: '', itemId: '', startDate: todayIso(), status: 'active', completedAt: null,
          agentId: '', agentRelation: '', executorId: '', purchaseType: 'domestic', brandId: '', actionsText: '', tenderWinner: '',
          purchaseAmount: '', purchaseCurrencyId: s(firstCur?.id), proformaDate: null, proformaAmount: '', proformaCurrencyId: s(firstCur?.id),
          paymentMethodIds: []
        }
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = <K extends keyof ProcessFormState>(k: K, v: ProcessFormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));
  };

  const create = useMutation(procMutations.createProcess());
  const update = useMutation(procMutations.updateProcess());
  const saving = create.isPending || update.isPending;

  const onError = (e: unknown) => {
    if (e instanceof ApiRequestError) {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast.error(e.message);
    } else toast.error('ذخیره‌سازی ناموفق بود');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = formToInput(f);
    const parsed = processSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0] ?? '_')] ||= i.message;
      setErrors(errs);
      toast.error('لطفاً خطاهای فرم را برطرف کنید');
      return;
    }
    if (initial) {
      update.mutate({ id: initial.id, values: input }, {
        onSuccess: () => { toast.success('پرونده ذخیره شد'); qc.invalidateQueries({ queryKey: procKeys.all }); },
        onError
      });
    } else {
      create.mutate(input, {
        onSuccess: (d) => { toast.success('پرونده ایجاد شد'); qc.invalidateQueries({ queryKey: procKeys.all }); router.push(ROUTES.process(d.id)); },
        onError
      });
    }
  };

  const items = lookups.items.filter((i) => !f.categoryId || String(i.categoryId) === f.categoryId);
  const dec = (id: string) => currency(n(id))?.decimals ?? 0;

  return (
    <form onSubmit={submit} className='space-y-4' noValidate>
      <Card>
        <CardHeader>
          <CardTitle>۱. اطلاعات عمومی</CardTitle>
          <CardDescription>شرکت متقاضی، شماره درخواست و کالا</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <FormField label='شرکت متقاضی' required error={errors.companyId}>
            <OptionSelect value={f.companyId} onChange={(v) => set('companyId', v ?? '')} options={opts(lookups.companies, f.companyId)} invalid={!!errors.companyId} />
          </FormField>
          <FormField label='شماره درخواست خرید' required error={errors.requestNumber}>
            <Input dir='ltr' className='text-end' value={f.requestNumber} onChange={(e) => set('requestNumber', e.target.value)} aria-invalid={!!errors.requestNumber || undefined} />
          </FormField>
          <FormField label='تاریخ شروع فرآیند (شمسی)' required error={errors.startDate}>
            <JalaliDatePicker value={f.startDate} onChange={(v) => set('startDate', v)} invalid={!!errors.startDate} clearable={false} />
          </FormField>
          <FormField label='دسته‌بندی کالا' description='برای محدود کردن فهرست کالاها'>
            <OptionSelect
              value={f.categoryId} clearable placeholder='همه دسته‌ها'
              onChange={(v) => { set('categoryId', v ?? ''); if (v && f.itemId && lookups.items.find((i) => String(i.id) === f.itemId)?.categoryId !== Number(v)) set('itemId', ''); }}
              options={opts(lookups.categories, f.categoryId)}
            />
          </FormField>
          <FormField label='نام کالا' required error={errors.itemId}>
            <OptionSelect
              value={f.itemId} invalid={!!errors.itemId}
              onChange={(v) => { set('itemId', v ?? ''); const it = lookups.items.find((i) => String(i.id) === v); if (it) set('categoryId', String(it.categoryId)); }}
              options={opts(items, f.itemId)}
            />
          </FormField>
          <FormField label='وضعیت پرونده' required>
            <OptionSelect value={f.status} onChange={(v) => set('status', (v ?? 'active') as ProcessFormState['status'])} options={PROCESS_STATUS_OPTIONS} />
          </FormField>
          {f.status === 'completed' && (
            <FormField label='تاریخ پایان فرآیند' error={errors.completedAt} description='در صورت خالی بودن، امروز ثبت می‌شود'>
              <JalaliDatePicker value={f.completedAt} onChange={(v) => set('completedAt', v)} invalid={!!errors.completedAt} />
            </FormField>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>۲. مأمور و مجری خرید</CardTitle>
          <CardDescription>برندهای قابل انتخاب بر اساس نوع خرید نمایش داده می‌شوند</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <FormField label='مأمور خرید'>
            <OptionSelect value={f.agentId} clearable onChange={(v) => set('agentId', v ?? '')} options={opts(lookups.agents, f.agentId)} />
          </FormField>
          <FormField label='نوع ارتباط با مأمور'>
            <OptionSelect value={f.agentRelation} clearable onChange={(v) => set('agentRelation', v ?? '')} options={AGENT_RELATION_OPTIONS} />
          </FormField>
          <FormField label='مجری خرید'>
            <OptionSelect value={f.executorId} clearable onChange={(v) => set('executorId', v ?? '')} options={opts(lookups.executors, f.executorId)} />
          </FormField>
          <FormField label='نوع خرید' required>
            <OptionSelect
              value={f.purchaseType} options={PURCHASE_TYPE_OPTIONS}
              onChange={(v) => {
                const t = (v ?? 'domestic') as 'domestic' | 'foreign';
                set('purchaseType', t);
                if (f.brandId && lookups.brands.find((b) => String(b.id) === f.brandId)?.kind !== t) set('brandId', '');
              }}
            />
          </FormField>
          <FormField label={`برند کالا (${f.purchaseType === 'domestic' ? 'داخلی' : 'خارجی'})`} error={errors.brandId}>
            <OptionSelect value={f.brandId} clearable invalid={!!errors.brandId} onChange={(v) => set('brandId', v ?? '')} options={opts(lookups.brands, f.brandId, (b) => b.kind === f.purchaseType)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>۳. اقدامات و نتایج</CardTitle>
          <CardDescription>شرح اقدامات، مذاکرات، مکاتبات و پیگیری‌ها</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <FormField label='شرح اقدامات، مذاکرات، مکاتبات و پیگیری‌ها'>
            <Textarea rows={5} value={f.actionsText} onChange={(e) => set('actionsText', e.target.value)} />
          </FormField>
          <FormField label='شرکت یا مجموعه برنده مناقصه' className='md:max-w-md'>
            <Input value={f.tenderWinner} onChange={(e) => set('tenderWinner', e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>۴. اطلاعات مالی</CardTitle>
          <CardDescription>مبالغ بر اساس تعداد اعشار واحد پولی ذخیره می‌شوند</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <FormField label='قیمت خرید' error={errors.purchaseAmount}>
            <MoneyInput value={f.purchaseAmount} decimals={dec(f.purchaseCurrencyId)} onChange={(v) => set('purchaseAmount', v)} invalid={!!errors.purchaseAmount} />
          </FormField>
          <FormField label='واحد پولی قیمت خرید' error={errors.purchaseCurrencyId}>
            <OptionSelect value={f.purchaseCurrencyId} onChange={(v) => set('purchaseCurrencyId', v ?? '')} options={opts(lookups.currencies.map((c) => ({ id: c.id, name: `${c.name} (${c.code})`, isActive: c.isActive })), f.purchaseCurrencyId)} invalid={!!errors.purchaseCurrencyId} />
          </FormField>
          <div className='hidden lg:block' />
          <FormField label='تاریخ صدور پیش‌فاکتور (شمسی)' error={errors.proformaDate}>
            <JalaliDatePicker value={f.proformaDate} onChange={(v) => set('proformaDate', v)} />
          </FormField>
          <FormField label='مبلغ پیش‌فاکتور' error={errors.proformaAmount}>
            <MoneyInput value={f.proformaAmount} decimals={dec(f.proformaCurrencyId)} onChange={(v) => set('proformaAmount', v)} invalid={!!errors.proformaAmount} />
          </FormField>
          <FormField label='واحد پولی پیش‌فاکتور' error={errors.proformaCurrencyId}>
            <OptionSelect value={f.proformaCurrencyId} onChange={(v) => set('proformaCurrencyId', v ?? '')} options={opts(lookups.currencies.map((c) => ({ id: c.id, name: `${c.name} (${c.code})`, isActive: c.isActive })), f.proformaCurrencyId)} invalid={!!errors.proformaCurrencyId} />
          </FormField>
        </CardContent>
      </Card>

      <div className='flex flex-wrap items-center justify-end gap-2'>
        <Button type='button' variant='outline' onClick={() => router.push(ROUTES.processes)}>انصراف</Button>
        <LoadingButton type='submit' loading={saving}>{initial ? 'ذخیره تغییرات' : 'ایجاد پرونده'}</LoadingButton>
      </div>
    </form>
  );
}
