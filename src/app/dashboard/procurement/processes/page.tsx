import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { ProcessTable } from '@/features/procurement/components/process-table';
import { NewProcessButton } from '@/features/procurement/components/new-process-button';

export const metadata = { title: 'فرآیندهای خرید' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='فرآیندهای خرید'
      pageDescription='فهرست پرونده‌های خرید؛ جستجو بر اساس شماره درخواست، شرکت و کالا.'
      pageHeaderAction={<NewProcessButton />}
    >
      <Suspense><ProcessTable /></Suspense>
    </PageContainer>
  );
}
