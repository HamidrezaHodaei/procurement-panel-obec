'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ApiRequestError, api } from '../api/client';
import { ROUTES } from '../constants';
import type { CurrentUser } from '../types';
import { FormField } from './form-parts';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const login = useMutation({
    mutationFn: () => api<CurrentUser>('/api/auth/login', { method: 'POST', json: { username, password } }),
    onSuccess: () => {
      qc.clear();
      const next = params.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : ROUTES.dashboard);
      router.refresh();
    },
    onError: (e) => {
      const msg = e instanceof ApiRequestError ? e.message : 'ورود ناموفق بود';
      setError(msg);
      toast.error(msg);
    }
  });

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader className='text-center'>
        <div className='bg-primary text-primary-foreground mx-auto mb-2 flex size-12 items-center justify-center rounded-xl'><Icons.purchase className='size-6' /></div>
        <CardTitle className='text-xl'>مدیریت فرآیند خرید</CardTitle>
        <CardDescription>برای ورود، نام کاربری و رمز عبور خود را وارد کنید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); setError(''); login.mutate(); }} className='space-y-4' noValidate>
          <FormField label='نام کاربری'>
            <Input dir='ltr' autoComplete='username' autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </FormField>
          <FormField label='رمز عبور' error={error}>
            <Input dir='ltr' type='password' autoComplete='current-password' value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error || undefined} />
          </FormField>
          <LoadingButton type='submit' className='w-full' loading={login.isPending} disabled={!username || !password}>ورود</LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
