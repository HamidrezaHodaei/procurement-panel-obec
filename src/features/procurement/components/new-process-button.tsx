'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROUTES } from '../constants';
import { useMe } from './use-me';

export function NewProcessButton() {
  const { canEdit } = useMe();
  if (!canEdit) return null;
  return (
    <Link href={ROUTES.newProcess} className={cn(buttonVariants(), 'text-xs md:text-sm')}>
      <Icons.add className='me-2 h-4 w-4' /> پرونده جدید
    </Link>
  );
}
