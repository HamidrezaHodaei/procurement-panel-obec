import type { Filters } from '../types';

const NUM = ['companyId', 'categoryId', 'itemId', 'agentId', 'executorId', 'brandId', 'currencyId', 'paymentMethodId'] as const;
const STR = ['q', 'requestNumber', 'tenderWinner', 'agentRelation', 'purchaseType', 'status', 'dateFrom', 'dateTo', 'stageStatus', 'guaranteeStatus'] as const;

/** URLSearchParams → Filters (client side twin of the server's filtersFromSearchParams). */
export function filtersFromParams(sp: { get(k: string): string | null }): Filters {
  const f: Record<string, string | number> = {};
  for (const k of NUM) { const v = sp.get(k); if (v && Number.isFinite(Number(v))) f[k] = Number(v); }
  for (const k of STR) { const v = sp.get(k); if (v) f[k] = v; }
  return f as Filters;
}
