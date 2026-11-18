import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { ProcessView } from '@/features/procurement/components/process-view';

export const metadata = { title: 'پرونده خرید' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <Suspense><ProcessView id={Number(id)} /></Suspense>
    </PageContainer>
  );
}
