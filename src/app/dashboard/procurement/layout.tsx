import { LookupsProvider } from '@/features/procurement/components/lookups';

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  return <LookupsProvider>{children}</LookupsProvider>;
}
