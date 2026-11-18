'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { formatJalaliDateTime } from '@/lib/jalali';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '../api/client';
import { procKeys, procMutations, procQueries } from '../api/queries';
import { ROLE_LABEL, ROLE_OPTIONS } from '../constants';
import type { Role, UserDto } from '../types';
import { FormField, OptionSelect } from './form-parts';
import { useMe } from './use-me';

type Form = { username: string; fullName: string; role: Role; password: string };

/** Admin-only: define users, assign roles, reset passwords, deactivate accounts. */
export function UsersManager() {
  const qc = useQueryClient();
  const { me } = useMe();
  const { data, isLoading } = useQuery(procQueries.users());
  const save = useMutation(procMutations.saveUser());
  const [edit, setEdit] = React.useState<{ id?: number; f: Form } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: procKeys.all });
  const onError = (e: unknown) => {
    if (e instanceof ApiRequestError) { setErrors(e.fieldErrors ?? {}); toast.error(e.message); } else toast.error('ذخیره ناموفق بود');
  };

  const open = (u?: UserDto) => { setErrors({}); setEdit(u ? { id: u.id, f: { username: u.username, fullName: u.fullName, role: u.role, password: '' } } : { f: { username: '', fullName: '', role: 'editor', password: '' } }); };
  const submit = () => {
    if (!edit) return;
    const { username, fullName, role, password } = edit.f;
    const values = edit.id ? { fullName, role, ...(password ? { password } : {}) } : { username, fullName, role, password };
    save.mutate({ id: edit.id, values }, { onSuccess: () => { toast.success('ذخیره شد'); setEdit(null); refresh(); }, onError });
  };
  const toggle = (u: UserDto) =>
    save.mutate({ id: u.id, values: { isActive: !u.isActive } }, { onSuccess: () => { toast.success(u.isActive ? 'کاربر غیرفعال شد' : 'کاربر فعال شد'); refresh(); }, onError: (e) => toast.error(e instanceof ApiRequestError ? e.message : 'خطا') });

  const f = edit?.f;
  const set = (k: keyof Form, v: string) => { setEdit((e) => e && { ...e, f: { ...e.f, [k]: v } as Form }); setErrors((x) => ({ ...x, [k]: '' })); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>کاربران و دسترسی‌ها</CardTitle>
        <CardDescription>مشاهده‌گر فقط می‌بیند؛ «کاربر» پرونده‌ها را ثبت و ویرایش می‌کند؛ مدیر علاوه بر آن اطلاعات پایه و کاربران را مدیریت می‌کند.</CardDescription>
        <CardAction><Button size='sm' onClick={() => open()}><Icons.add /> افزودن کاربر</Button></CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className='h-40 w-full' /> : (
          <div className='overflow-x-auto rounded-lg border'>
            <Table>
              <TableHeader><TableRow><TableHead>نام کاربری</TableHead><TableHead>نام نمایشی</TableHead><TableHead>نقش</TableHead><TableHead>آخرین ورود</TableHead><TableHead>وضعیت</TableHead><TableHead className='w-24' /></TableRow></TableHeader>
              <TableBody>
                {data?.map((u) => (
                  <TableRow key={u.id} className={cn(!u.isActive && 'text-muted-foreground')}>
                    <TableCell dir='ltr' className='text-end'>{u.username}</TableCell>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{ROLE_LABEL[u.role]}</Badge></TableCell>
                    <TableCell className='tabular-nums'>{u.lastLogin ? formatJalaliDateTime(u.lastLogin) : '—'}</TableCell>
                    <TableCell><Badge variant={u.isActive ? 'secondary' : 'outline'}>{u.isActive ? 'فعال' : 'غیرفعال'}</Badge></TableCell>
                    <TableCell>
                      <div className='flex items-center justify-end gap-2'>
                        <Switch checked={u.isActive} disabled={u.id === me?.id} onCheckedChange={() => toggle(u)} aria-label='فعال/غیرفعال' />
                        <Button variant='ghost' size='icon-sm' onClick={() => open(u)} aria-label='ویرایش'><Icons.edit /></Button>
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
          <DialogHeader><DialogTitle>{edit?.id ? 'ویرایش کاربر' : 'افزودن کاربر'}</DialogTitle><DialogDescription>{edit?.id ? 'برای تغییر رمز، رمز جدید را وارد کنید؛ در غیر این صورت خالی بگذارید.' : 'رمز عبور حداقل ۸ نویسه باشد.'}</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className='space-y-4' noValidate>
            {f && (<>
              <FormField label='نام کاربری (لاتین)' required error={errors.username}><Input dir='ltr' value={f.username} disabled={!!edit?.id} onChange={(e) => set('username', e.target.value)} /></FormField>
              <FormField label='نام نمایشی' required error={errors.fullName}><Input value={f.fullName} onChange={(e) => set('fullName', e.target.value)} /></FormField>
              <FormField label='نقش' required error={errors.role}><OptionSelect value={f.role} options={ROLE_OPTIONS} onChange={(v) => set('role', v ?? 'editor')} /></FormField>
              <FormField label={edit?.id ? 'رمز عبور جدید' : 'رمز عبور'} required={!edit?.id} error={errors.password}><Input dir='ltr' type='password' autoComplete='new-password' value={f.password} onChange={(e) => set('password', e.target.value)} /></FormField>
            </>)}
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
