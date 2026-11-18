'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { ApiRequestError, api } from '../api/client';
import { ROLE_LABEL } from '../constants';
import { FormField } from './form-parts';
import { useMe } from './use-me';

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [v, setV] = React.useState({ currentPassword: '', newPassword: '', repeat: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/api/auth/password', { method: 'POST', json: { currentPassword: v.currentPassword, newPassword: v.newPassword } }),
    onSuccess: () => { toast.success('رمز عبور تغییر کرد'); setV({ currentPassword: '', newPassword: '', repeat: '' }); onOpenChange(false); },
    onError: (e) => { if (e instanceof ApiRequestError) { setErrors(e.fieldErrors ?? {}); toast.error(e.message); } }
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (v.newPassword !== v.repeat) return setErrors({ repeat: 'تکرار رمز با رمز جدید یکسان نیست' });
    setErrors({});
    m.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader><DialogTitle>تغییر رمز عبور</DialogTitle><DialogDescription>رمز جدید حداقل ۸ نویسه باشد.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className='space-y-4' noValidate>
          <FormField label='رمز فعلی' error={errors.currentPassword}><Input type='password' dir='ltr' autoComplete='current-password' value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} /></FormField>
          <FormField label='رمز جدید' error={errors.password ?? errors.newPassword}><Input type='password' dir='ltr' autoComplete='new-password' value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} /></FormField>
          <FormField label='تکرار رمز جدید' error={errors.repeat}><Input type='password' dir='ltr' autoComplete='new-password' value={v.repeat} onChange={(e) => setV({ ...v, repeat: e.target.value })} /></FormField>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>انصراف</Button>
            <LoadingButton type='submit' loading={m.isPending}>ذخیره</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Sidebar footer: who is logged in, change password, sign out. */
export function UserMenu() {
  const { me } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [pw, setPw] = React.useState(false);
  const logout = useMutation({
    mutationFn: () => api('/api/auth/logout', { method: 'POST' }),
    onSettled: () => { qc.clear(); router.push('/login'); router.refresh(); }
  });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size='lg' tooltip={me?.fullName ?? 'حساب کاربری'} className='data-popup-open:bg-sidebar-accent' />}>
            <Icons.account />
            <span className='flex min-w-0 flex-col text-start leading-tight'>
              <span className='truncate'>{me?.fullName ?? '…'}</span>
              <span className='text-muted-foreground text-xs'>{me ? ROLE_LABEL[me.role] : ''}</span>
            </span>
            <Icons.chevronsUpDown className='ms-auto size-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent className='min-w-56 rounded-lg' side='top' align='end' sideOffset={4}>
            <DropdownMenuGroup><DropdownMenuLabel dir='ltr' className='text-end'>@{me?.username}</DropdownMenuLabel></DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setPw(true)}><Icons.lock /> تغییر رمز عبور</DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout.mutate()}><Icons.logout /> خروج از حساب</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChangePasswordDialog open={pw} onOpenChange={setPw} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
