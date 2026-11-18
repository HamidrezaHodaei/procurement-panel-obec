'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { procQueries } from '../api/queries';
import type { CurrencyDto, Lookups } from '../types';
import { formatMoney } from '@/lib/money';
import { Skeleton } from '@/components/ui/skeleton';

type Ctx = {
  lookups: Lookups;
  currency: (id: number | null | undefined) => CurrencyDto | undefined;
  name: (list: { id: number; name: string }[], id: number | null | undefined) => string;
  money: (amount: number | null | undefined, currencyId: number | null | undefined) => string;
};

const LookupsContext = React.createContext<Ctx | null>(null);

/** Loads all base-data lists once; children read them through useLookups(). */
export function LookupsProvider({ children }: { children: React.ReactNode }) {
  const { data, isError } = useQuery(procQueries.lookups());
  const value = React.useMemo<Ctx | null>(() => {
    if (!data) return null;
    const cur = new Map(data.currencies.map((c) => [c.id, c]));
    return {
      lookups: data,
      currency: (id) => (id ? cur.get(id) : undefined),
      name: (list, id) => list.find((x) => x.id === id)?.name ?? '—',
      money: (amount, id) => {
        const c = id ? cur.get(id) : undefined;
        return amount === null || amount === undefined || !c ? '—' : `${formatMoney(amount, c.decimals)} ${c.code}`;
      }
    };
  }, [data]);

  if (isError) return <div className='text-destructive p-4 text-sm'>بارگذاری اطلاعات پایه ناموفق بود.</div>;
  if (!value) {
    return (
      <div className='space-y-3 p-1'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }
  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>;
}

export function useLookups(): Ctx {
  const c = React.useContext(LookupsContext);
  if (!c) throw new Error('useLookups must be used inside <LookupsProvider>');
  return c;
}
