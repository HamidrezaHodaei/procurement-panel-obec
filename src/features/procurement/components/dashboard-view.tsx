'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/money';
import { procQueries } from '../api/queries';
import { PURCHASE_TYPE } from '../constants';
import type { DashboardData } from '../types';
import { FilterBar, useFilters } from './filter-bar';

const fa = (v: number | string) => Number(v).toLocaleString('fa-IR');
const short = (s: string) => (s.length > 14 ? s.slice(0, 13) + '…' : s);
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function Kpi({ title, value, hint, icon: Icon, badge }: { title: string; value: React.ReactNode; hint?: string; icon: React.ComponentType<{ className?: string }>; badge?: React.ReactNode }) {
  return (
    <Card className='@container/card'>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{value}</CardTitle>
        <CardAction>{badge ?? <Badge variant='outline'><Icon /></Badge>}</CardAction>
      </CardHeader>
      {hint && <CardFooter className='text-muted-foreground text-sm'>{hint}</CardFooter>}
    </Card>
  );
}

function ChartCard({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
const Empty = () => <div className='text-muted-foreground flex h-[200px] items-center justify-center text-sm'>داده‌ای برای نمایش وجود ندارد</div>;

function SimpleBar({ data, label }: { data: { name: string; count: number }[]; label: string }) {
  if (!data.length) return <Empty />;
  const cfg = { count: { label, color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <ChartContainer config={cfg} className='h-[260px] w-full'>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray='3 3' />
        <XAxis dataKey='name' tickLine={false} axisLine={false} tickMargin={8} tickFormatter={short} interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tickFormatter={fa} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey='count' fill='var(--color-count)' radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

function PeopleBar({ data }: { data: DashboardData['agents'] }) {
  if (!data.length) return <Empty />;
  const cfg = { completed: { label: 'تکمیل‌شده', color: 'var(--chart-2)' }, active: { label: 'فعال', color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <ChartContainer config={cfg} className='h-[260px] w-full'>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray='3 3' />
        <XAxis dataKey='name' tickLine={false} axisLine={false} tickMargin={8} tickFormatter={short} interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tickFormatter={fa} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey='completed' stackId='a' fill='var(--color-completed)' radius={[0, 0, 4, 4]} />
        <Bar dataKey='active' stackId='a' fill='var(--color-active)' radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function Donut({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length || data.every((d) => d.count === 0)) return <Empty />;
  const rows = data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));
  const cfg = Object.fromEntries(rows.map((r, i) => [r.name, { label: r.name, color: COLORS[i % COLORS.length] }])) as ChartConfig;
  return (
    <ChartContainer config={cfg} className='mx-auto h-[260px] w-full'>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey='name' hideLabel />} />
        <Pie data={rows} dataKey='count' nameKey='name' innerRadius={50} paddingAngle={3} cornerRadius={6}>
          {rows.map((r) => <Cell key={r.name} fill={r.fill} />)}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey='name' />} />
      </PieChart>
    </ChartContainer>
  );
}

export function DashboardView() {
  const { filters } = useFilters();
  const { data, isLoading, isFetching } = useQuery({ ...procQueries.dashboard(filters), placeholderData: (p) => p });

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <FilterBar keys={['companyId', 'categoryId', 'purchaseType', 'dateFrom', 'dateTo', 'currencyId']} collapsible />
      {isLoading || !data ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className='h-32' />)}</div>
      ) : (
        <div className={isFetching ? 'flex flex-col gap-4 opacity-70 transition-opacity' : 'flex flex-col gap-4'}>
          <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
            <Kpi title='کل فرآیندهای خرید' value={fa(data.kpis.total)} icon={Icons.purchase} hint='مطابق فیلترهای انتخاب‌شده' />
            <Kpi title='فرآیندهای فعال' value={fa(data.kpis.active)} icon={Icons.clock} hint='در جریان و تکمیل‌نشده' />
            <Kpi title='خرید داخلی / خارجی' value={`${fa(data.kpis.domestic)} / ${fa(data.kpis.foreign)}`} icon={Icons.company} hint={`${PURCHASE_TYPE.domestic} / ${PURCHASE_TYPE.foreign}`} />
            <Kpi title='پیش‌فاکتورهای ثبت‌شده' value={fa(data.kpis.proformas)} icon={Icons.invoice} hint='پرونده‌های دارای پیش‌فاکتور' />
            <Kpi
              title='چک‌های در انتظار سررسید' value={fa(data.kpis.cheques.pending)} icon={Icons.receipt}
              hint={data.kpis.cheques.pendingOverdue ? `${fa(data.kpis.cheques.pendingOverdue)} چک سررسید گذشته و وصول‌نشده` : 'چک سررسید‌گذشته‌ای وجود ندارد'}
              badge={data.kpis.cheques.pendingOverdue ? <Badge variant='destructive'><Icons.alertCircle /> {fa(data.kpis.cheques.pendingOverdue)}</Badge> : undefined}
            />
            <Kpi title='ضمانت‌های فعال و مستردنشده' value={fa(data.kpis.guarantees.active)} icon={Icons.shield} hint={`${fa(data.kpis.guarantees.received)} دریافتی، ${fa(data.kpis.guarantees.issued)} صادرشده`} />
            <Kpi title='مراحل پرداخت سررسیدشده' value={fa(data.obligations.stage.overdue)} icon={Icons.alertCircle} hint='پرداخت‌نشده با سررسید گذشته'
              badge={data.obligations.stage.overdue ? <Badge variant='destructive'><Icons.alertCircle /></Badge> : undefined} />
            <Kpi title='مراحل پرداخت‌نشده' value={fa(data.obligations.stage.unpaid + data.obligations.stage.overdue)} icon={Icons.cash} hint={`${fa(data.obligations.stage.paid)} مرحله پرداخت‌شده`} />
          </div>

          <div>
            <h2 className='mb-2 text-sm font-semibold'>مبالغ به تفکیک ارز <span className='text-muted-foreground font-normal'>— هر ارز جداگانه محاسبه می‌شود؛ بدون تبدیل نرخ</span></h2>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {data.byCurrency.filter((c) => c.purchases || c.proformas || c.paid || c.unpaid || c.chequesPending).map((c) => (
                <Card key={c.currencyId} size='sm'>
                  <CardHeader><CardTitle>{c.code}</CardTitle></CardHeader>
                  <CardContent className='space-y-1.5 text-sm'>
                    {([['مجموع خرید', c.purchases], ['مجموع پیش‌فاکتورها', c.proformas], ['پرداخت‌های انجام‌شده', c.paid], ['تعهدات پرداخت‌نشده', c.unpaid], ['  که سررسید گذشته', c.overdue], ['چک در انتظار سررسید', c.chequesPending]] as [string, number][]).map(([l, v]) => (
                      <div key={l} className='flex justify-between gap-2'><span className='text-muted-foreground'>{l.trim()}</span><span className={`tabular-nums ${l.startsWith(' ') && v ? 'text-destructive' : ''}`}>{formatMoney(v, c.decimals)}</span></div>
                    ))}
                  </CardContent>
                </Card>
              ))}
              {!data.byCurrency.some((c) => c.purchases || c.proformas || c.paid || c.unpaid || c.chequesPending) && <p className='text-muted-foreground text-sm'>مبلغی ثبت نشده است.</p>}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <ChartCard title='روند فرآیندهای خرید' description='تعداد پرونده‌های شروع‌شده در هر ماه شمسی' className='lg:col-span-2'>
              {data.trend.length === 0 ? <Empty /> : (
                <ChartContainer config={{ count: { label: 'تعداد فرآیند', color: 'var(--chart-1)' } }} className='h-[260px] w-full'>
                  <AreaChart data={data.trend} accessibilityLayer>
                    <CartesianGrid vertical={false} strokeDasharray='3 3' />
                    <XAxis dataKey='label' tickLine={false} axisLine={false} tickMargin={8} reversed />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tickFormatter={fa} orientation='right' />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area dataKey='count' type='monotone' fill='var(--color-count)' fillOpacity={0.25} stroke='var(--color-count)' strokeWidth={1.5} />
                  </AreaChart>
                </ChartContainer>
              )}
            </ChartCard>
            <ChartCard title='خرید به تفکیک شرکت' description='۱۰ شرکت برتر بر اساس تعداد فرآیند'><SimpleBar data={data.byCompany} label='تعداد' /></ChartCard>
            <ChartCard title='خرید به تفکیک دسته‌بندی کالا'><SimpleBar data={data.byCategory} label='تعداد' /></ChartCard>
            <ChartCard title='مقایسه خرید داخلی و خارجی'><Donut data={data.purchaseType.map((p) => ({ name: PURCHASE_TYPE[p.type], count: p.count }))} /></ChartCard>
            <ChartCard title='روش‌های پرداخت' description='تعداد پرونده‌ها به تفکیک روش پرداخت'><Donut data={data.paymentMethods} /></ChartCard>
            <ChartCard title='عملکرد مأموران خرید'><PeopleBar data={data.agents} /></ChartCard>
            <ChartCard title='عملکرد مجریان خرید'><PeopleBar data={data.executors} /></ChartCard>
            <ChartCard title='وضعیت تعهدات پرداخت' description='تعداد مراحل پرداخت'>
              <SimpleBar data={[{ name: 'پرداخت‌شده', count: data.obligations.stage.paid }, { name: 'پرداخت‌نشده', count: data.obligations.stage.unpaid }, { name: 'سررسیدشده', count: data.obligations.stage.overdue }]} label='تعداد' />
            </ChartCard>
            <ChartCard title='وضعیت ضمانت‌ها' description='ضمانت‌های دریافتی و صادرشده'>
              <SimpleBar data={[{ name: 'فعال', count: data.obligations.guarantee.active }, { name: 'مستردشده', count: data.obligations.guarantee.returned }, { name: 'وصول‌شده', count: data.obligations.guarantee.collected }, { name: 'ابطال‌شده', count: data.obligations.guarantee.cancelled }]} label='تعداد' />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
