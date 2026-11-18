import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { SettingsView } from '@/features/procurement/components/settings-view';

export const metadata = { title: 'تنظیمات و اطلاعات پایه' };

export default function Page() {
  return (
    <PageContainer pageTitle='تنظیمات و اطلاعات پایه' pageDescription='تعریف، ویرایش و غیرفعال‌سازی گزینه‌های فرم‌ها؛ بدون نیاز به تغییر کد.'>
      <Suspense><SettingsView /></Suspense>
    </PageContainer>
  );
}
