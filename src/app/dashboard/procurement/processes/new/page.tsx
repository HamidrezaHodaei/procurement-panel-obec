import PageContainer from '@/components/layout/page-container';
import { ProcessForm } from '@/features/procurement/components/process-form';

export const metadata = { title: 'پرونده خرید جدید' };

export default function Page() {
  return (
    <PageContainer pageTitle='ثبت پرونده خرید جدید' pageDescription='پس از ایجاد پرونده، چک‌ها، مراحل پرداخت و ضمانت‌ها را از تب «پرداخت‌ها و ضمانت‌ها» ثبت کنید.'>
      <ProcessForm />
    </PageContainer>
  );
}
