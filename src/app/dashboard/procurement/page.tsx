import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { DashboardView } from '@/features/procurement/components/dashboard-view';

export const metadata = { title: 'داشبورد مدیریت خرید' };

export default function Page() {
  return (
    <PageContainer pageTitle='داشبورد مدیریت فرآیند خرید' pageDescription='نمای کلی فرآیندها، تعهدات مالی، چک‌ها و ضمانت‌ها؛ با تغییر فیلترها به‌روز می‌شود.'>
      <Suspense><DashboardView /></Suspense>
    </PageContainer>
  );
}
