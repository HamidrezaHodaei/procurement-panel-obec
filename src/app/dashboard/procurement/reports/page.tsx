import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { ReportsView } from '@/features/procurement/components/reports-view';

export const metadata = { title: 'گزارش‌گیری' };

export default function Page() {
  return (
    <PageContainer pageTitle='گزارش‌گیری و جستجو' pageDescription='فیلتر ترکیبی، مشاهده جزئیات، خروجی Excel و PDF. مبالغ هر ارز جداگانه جمع زده می‌شود.'>
      <Suspense><ReportsView /></Suspense>
    </PageContainer>
  );
}
