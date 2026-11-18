import { Suspense } from 'react';
import { LoginForm } from '@/features/procurement/components/login-form';

export const metadata = { title: 'ورود' };

export default function Page() {
  return (
    <div className='bg-muted/40 flex min-h-svh items-center justify-center p-4'>
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
