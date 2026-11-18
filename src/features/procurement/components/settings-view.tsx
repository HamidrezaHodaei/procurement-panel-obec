'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '../api/client';
import { procKeys, procMutations, procQueries } from '../api/queries';
import { MASTERS, MASTER_BY_KEY, type MasterDef, type MasterField, type MasterKey } from '../masters';
import { FormField, OptionSelect } from './form-parts';
import { useLookups } from './lookups';
import { UsersManager } from './users-manager';
import { useMe } from './use-me';

type Row = Record<string, unknown> & { id: number; isActive: boolean };

function useRefOptions(f: MasterField) {
  const { lookups } = useLookups();
  if (f.type !== 'ref') return [];
  const list = f.ref === 'itemCategories' ? lookups.categories : f.ref === 'companies' ? lookups.companies : [];
  return list.map((x) => ({ value: x.id, label: x.isActive ? x.name : `${x.name} (غیرفعال)` }));
}

function FieldControl({ f, value, onChange, error, editing }: { f: MasterField; value: unknown; onChange: (v: string) => void; error?: string; editing: boolean }) {
  const refOpts = useRefOptions(f);
  const v = value === null || value === undefined ? '' : String(value);
  const locked = editing && f.immutable;
  return (
    <FormField label={f.label} required={f.required} error={error} description={locked ? 'پس از ثبت قابل تغییر نیست' : undefined}>
      {f.type === 'select' ? <OptionSelect value={v} options={f.options ?? []} onChange={(x) => onChange(x ?? '')} invalid={!!error} disabled={locked} />
        : f.type === 'ref' ? <OptionSelect value={v} options={refOpts} onChange={(x) => onChange(x ?? '')} invalid={!!error} />
        : <Input value={v} dir={f.upper || f.type === 'number' ? 'ltr' : undefined} inputMode={f.type === 'number' ? 'numeric' : undefined} disabled={locked}
            onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} />}
    </FormField>
  );
}

function MasterManager({ def }: { def: MasterDef }) {
  const qc = useQueryClient();
  const { lookups } = useLookups();
  const { data, isLoading } = useQuery(procQueries.master(def.key));
  const save = useMutation(procMutations.saveMaster());
  const [edit, setEdit] = React.useState<{ id?: number; values: Record<string, unknown> } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [q, setQ] = React.useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: procKeys.all });

  const cell = (r: Row, f: MasterField): React.ReactNode => {
    const v = r[f.key];
    if (f.type === 'ref') return [...lookups.categories, ...lookups.companies].find((x) => x.id === v)?.name ?? '—';
    if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? String(v ?? '—');
    return v === null || v === '' ? '—' : String(v);
  };
  const open = (r?: Row) => {
    setErrors({});
    setEdit(r ? { id: r.id, values: Object.fromEntries(def.fields.map((f) => [f.key, r[f.key]])) } : { values: Object.fromEntries(def.fields.map((f) => [f.key, f.type === 'number' ? '0' : f.type === 'select' ? f.options?.[0].value : ''])) });
  };
  const submit = () => {
    if (!edit) return;
    save.mutate({ key: def.key, id: edit.id, values: edit.values }, {
      onSuccess: () => { toast.success('ذخیره شد'); setEdit(null); refresh(); },
      onError: (e) => { if (e instanceof ApiRequestError) { if (e.fieldErrors) setErrors(e.fieldErrors); toast.error(e.message); } else toast.error('ذخیره ناموفق بود'); }
    });
  };
  const toggle = (r: Row) =>
    save.mutate({ key: def.key, id: r.id, values: { isActive: !r.isActive } }, {
      onSuccess: () => { toast.success(r.isActive ? 'غیرفعال شد' : 'فعال شد'); refresh(); }, onError: () => toast.error('تغییر وضعیت ناموفق بود')
    });

  const rows = ((data ?? []) as Row[]).filter((r) => !q.trim() || def.fields.some((f) => String(cell(r, f)).includes(q.trim())));
  const cols = def.fields.filter((f) => f.showInTable);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{def.title}</CardTitle>
        <CardDescription>گزینه‌های غیرفعال در فرم‌های جدید نمایش داده نمی‌شوند، اما سوابق قبلی حفظ می‌شود.</CardDescription>
        <CardAction><Button size='sm' onClick={() => open()}><Icons.add /> افزودن {def.singular}</Button></CardAction>
      </CardHeader>
      <CardContent className='space-y-3'>
        <Input className='max-w-xs' placeholder='جستجو…' value={q} onChange={(e) => setQ(e.target.value)} />
        {isLoading ? <Skeleton className='h-48 w-full' /> : (
          <div className='overflow-x-auto rounded-lg border'>
            <Table>
              <TableHeader><TableRow>{cols.map((f) => <TableHead key={f.key}>{f.label.replace(/ \(.*\)/, '')}</TableHead>)}<TableHead>وضعیت</TableHead><TableHead className='w-24' /></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={cols.length + 2} className='text-muted-foreground h-20 text-center'>موردی ثبت نشده است.</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id} className={cn(!r.isActive && 'text-muted-foreground')}>
                    {cols.map((f) => <TableCell key={f.key}>{cell(r, f)}</TableCell>)}
                    <TableCell><Badge variant={r.isActive ? 'secondary' : 'outline'}>{r.isActive ? 'فعال' : 'غیرفعال'}</Badge></TableCell>
                    <TableCell>
                      <div className='flex items-center justify-end gap-2'>
                        <Switch checked={r.isActive} onCheckedChange={() => toggle(r)} aria-label='فعال/غیرفعال' />
                        <Button variant='ghost' size='icon-sm' onClick={() => open(r)} aria-label='ویرایش'><Icons.edit /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader><DialogTitle>{edit?.id ? 'ویرایش' : 'افزودن'} {def.singular}</DialogTitle><DialogDescription>اطلاعات را وارد کنید.</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className='space-y-4' noValidate>
            {edit && def.fields.map((f) => (
              <FieldControl key={f.key} f={f} editing={!!edit.id} value={edit.values[f.key]} error={errors[f.key]}
                onChange={(v) => { setEdit({ ...edit, values: { ...edit.values, [f.key]: v } }); setErrors((x) => ({ ...x, [f.key]: '' })); }} />
            ))}
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEdit(null)}>انصراف</Button>
              <LoadingButton type='submit' loading={save.isPending}>ذخیره</LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function SettingsView() {
  const { isAdmin, isLoading } = useMe();
  const [key, setKey] = useQueryState('m', parseAsString.withDefault('companies'));
  const isUsers = key === 'users';
  const def = MASTER_BY_KEY[key as MasterKey] ?? MASTERS[0];
  if (isLoading) return <Skeleton className='h-64 w-full' />;
  if (!isAdmin) {
    return <div className='text-muted-foreground flex flex-1 items-center justify-center py-16 text-sm'>مدیریت اطلاعات پایه و کاربران فقط برای «مدیر سیستم» در دسترس است.</div>;
  }
  return (
    <div className='grid flex-1 gap-4 md:grid-cols-[14rem_minmax(0,1fr)]'>
      <nav aria-label='اطلاعات پایه' className='space-y-1 md:sticky md:top-0 md:self-start'>
        {MASTERS.map((m) => (
          <Button key={m.key} variant={!isUsers && m.key === def.key ? 'secondary' : 'ghost'} className='w-full justify-start' onClick={() => setKey(m.key)}>{m.title}</Button>
        ))}
        <Button variant={isUsers ? 'secondary' : 'ghost'} className='w-full justify-start' onClick={() => setKey('users')}>کاربران و دسترسی‌ها</Button>
      </nav>
      <div className='min-w-0'>{isUsers ? <UsersManager /> : <MasterManager key={def.key} def={def} />}</div>
    </div>
  );
}
