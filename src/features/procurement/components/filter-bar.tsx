'use client';

import * as React from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AGENT_RELATION_OPTIONS, GUARANTEE_STATUS_OPTIONS, PROCESS_STATUS_OPTIONS, PURCHASE_TYPE_OPTIONS, STAGE_STATUS_OPTIONS
} from '../constants';
import type { Filters } from '../types';
import { FormField, OptionSelect, type Opt } from './form-parts';
import { JalaliDatePicker } from './jalali-date-picker';
import { useLookups } from './lookups';

const PARSERS = {
  requestNumber: parseAsString, companyId: parseAsInteger, categoryId: parseAsInteger, itemId: parseAsInteger,
  agentId: parseAsInteger, executorId: parseAsInteger, agentRelation: parseAsString, purchaseType: parseAsString,
  brandId: parseAsInteger, tenderWinner: parseAsString, status: parseAsString, dateFrom: parseAsString, dateTo: parseAsString,
  currencyId: parseAsInteger, paymentMethodId: parseAsInteger, stageStatus: parseAsString, guaranteeStatus: parseAsString
};
export type FilterKey = keyof typeof PARSERS;

export const ALL_FILTER_KEYS = Object.keys(PARSERS) as FilterKey[];

/** Filters live in the URL (shareable / bookmarkable) and feed dashboard + report queries. */
export function useFilters() {
  const [state, setState] = useQueryStates(PARSERS, { history: 'replace', shallow: true });
  const filters = React.useMemo(() => {
    const f: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(state)) if (v !== null && v !== undefined && v !== '') f[k === 'requestNumber' ? 'requestNumber' : k] = v as string | number;
    return f as Filters;
  }, [state]);
  const active = Object.keys(filters).length;
  const reset = () => setState(Object.fromEntries(ALL_FILTER_KEYS.map((k) => [k, null])) as never);
  return { filters, state, setState, active, reset };
}

function TextFilter({ value, onCommit, placeholder }: { value: string | null; onCommit: (v: string | null) => void; placeholder?: string }) {
  const [t, setT] = React.useState(value ?? '');
  React.useEffect(() => setT(value ?? ''), [value]);
  const commit = () => onCommit(t.trim() || null);
  return <Input value={t} placeholder={placeholder} onChange={(e) => setT(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />;
}

const FIELD_LABEL: Record<FilterKey, string> = {
  requestNumber: 'شماره درخواست خرید', companyId: 'شرکت متقاضی', categoryId: 'دسته‌بندی کالا', itemId: 'کالا', agentId: 'مأمور خرید',
  executorId: 'مجری خرید', agentRelation: 'نوع ارتباط', purchaseType: 'نوع خرید', brandId: 'برند', tenderWinner: 'برنده مناقصه',
  status: 'وضعیت پرونده', dateFrom: 'از تاریخ شروع (شمسی)', dateTo: 'تا تاریخ شروع (شمسی)', currencyId: 'واحد پولی',
  paymentMethodId: 'روش پرداخت', stageStatus: 'وضعیت پرداخت', guaranteeStatus: 'وضعیت ضمانت'
};

export function FilterBar({ keys, collapsible = false }: { keys: FilterKey[]; collapsible?: boolean }) {
  const { lookups } = useLookups();
  const { state, setState, active, reset } = useFilters();
  const [open, setOpen] = React.useState(!collapsible);
  const act = <T extends { id: number; name: string; isActive: boolean }>(l: T[]): Opt[] => l.map((x) => ({ value: x.id, label: x.isActive ? x.name : `${x.name} (غیرفعال)` }));
  const num = (v: string | null) => (v === null ? null : Number(v));

  const control = (k: FilterKey): React.ReactNode => {
    const sel = (options: Opt[]) => <OptionSelect clearable placeholder='همه' value={state[k] as string | number | null} options={options} onChange={(v) => setState({ [k]: v === null ? null : PARSERS[k] === parseAsString ? v : num(v) } as never)} />;
    switch (k) {
      case 'requestNumber': case 'tenderWinner': return <TextFilter value={state[k]} onCommit={(v) => setState({ [k]: v })} />;
      case 'dateFrom': case 'dateTo': return <JalaliDatePicker value={state[k]} onChange={(v) => setState({ [k]: v })} />;
      case 'companyId': return sel(act(lookups.companies));
      case 'categoryId': return sel(act(lookups.categories));
      case 'itemId': return sel(act(lookups.items.filter((i) => !state.categoryId || i.categoryId === state.categoryId)));
      case 'agentId': return sel(act(lookups.agents));
      case 'executorId': return sel(act(lookups.executors));
      case 'brandId': return sel(act(lookups.brands.filter((b) => !state.purchaseType || b.kind === state.purchaseType)));
      case 'currencyId': return sel(lookups.currencies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })));
      case 'paymentMethodId': return sel(act(lookups.paymentMethods));
      case 'agentRelation': return sel(AGENT_RELATION_OPTIONS);
      case 'purchaseType': return sel(PURCHASE_TYPE_OPTIONS);
      case 'status': return sel(PROCESS_STATUS_OPTIONS);
      case 'stageStatus': return sel(STAGE_STATUS_OPTIONS);
      case 'guaranteeStatus': return sel(GUARANTEE_STATUS_OPTIONS);
    }
  };

  return (
    <div className='bg-card rounded-xl border p-3'>
      <div className='flex items-center gap-2'>
        <Icons.filter className='text-muted-foreground size-4' />
        <span className='text-sm font-medium'>فیلترها</span>
        {active > 0 && <span className='bg-primary text-primary-foreground rounded-full px-2 text-xs'>{active.toLocaleString('fa-IR')}</span>}
        <div className='ms-auto flex gap-1'>
          {active > 0 && <Button variant='ghost' size='sm' onClick={reset}><Icons.close /> حذف فیلترها</Button>}
          {collapsible && <Button variant='ghost' size='sm' onClick={() => setOpen(!open)}>{open ? 'بستن' : 'نمایش'} <Icons.chevronDown className={open ? 'rotate-180' : ''} /></Button>}
        </div>
      </div>
      {open && (
        <div className='mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {keys.map((k) => <FormField key={k} label={FIELD_LABEL[k]}>{control(k)}</FormField>)}
        </div>
      )}
    </div>
  );
}
