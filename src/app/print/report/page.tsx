import { Suspense } from 'react';
import { PrintReport } from '@/features/procurement/components/print-report';

export const metadata = { title: 'چاپ گزارش' };

export default function Page() {
  return <Suspense><PrintReport /></Suspense>;
}
