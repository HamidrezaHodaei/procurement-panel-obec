/** DTOs returned by the API (money is always integer minor units + a currency id). */

export type CurrencyDto = { id: number; code: string; name: string; symbol: string; decimals: number; isActive: boolean };
export type Named = { id: number; name: string; isActive: boolean };

export type Lookups = {
  companies: Named[];
  categories: Named[];
  items: (Named & { categoryId: number })[];
  agents: Named[];
  executors: Named[];
  brands: (Named & { kind: 'domestic' | 'foreign' })[];
  currencies: CurrencyDto[];
  paymentMethods: (Named & { kind: 'cheque' | 'cash' | 'guarantee' | 'other' })[];
  guaranteeTypes: Named[];
};

export type AuditFields = { createdBy: string; createdAt: string; updatedBy: string; updatedAt: string };

export type ChequeDto = AuditFields & {
  id: number; processId: number; chequeNumber: string; chequeDate: string; amount: number; currencyId: number;
  issuerName: string; status: 'pending' | 'cashed' | 'bounced'; notes: string;
};

export type StageDto = AuditFields & {
  id: number; processId: number; seq: number; amountType: 'amount' | 'percent';
  amount: number | null; currencyId: number | null; percentBp: number | null;
  conditionText: string; dueDate: string | null; status: 'paid' | 'unpaid'; paidAt: string | null; notes: string;
  /** resolved amount (percent stages are computed from proforma/purchase amount) */
  effAmount: number | null; effCurrencyId: number | null; effStatus: 'paid' | 'unpaid' | 'overdue';
};

export type ReceivedGuaranteeDto = AuditFields & {
  id: number; processId: number; guaranteeTypeId: number; referenceNo: string; amount: number; currencyId: number;
  issueDate: string; dueDate: string | null; status: GuaranteeStatus; notes: string;
};
export type IssuedGuaranteeDto = AuditFields & {
  id: number; processId: number; guaranteeTypeId: number; referenceNo: string; amount: number; currencyId: number;
  issueDate: string; validUntil: string | null; recipientName: string; relatedCompanyId: number | null;
  status: GuaranteeStatus; notes: string;
};
export type GuaranteeStatus = 'active' | 'returned' | 'collected' | 'cancelled';

export type ProcessDto = AuditFields & {
  id: number; requestNumber: string; companyId: number; itemId: number; categoryId: number;
  startDate: string; status: 'active' | 'completed' | 'cancelled'; completedAt: string | null;
  agentId: number | null; agentRelation: 'direct' | 'indirect' | null; executorId: number | null;
  purchaseType: 'domestic' | 'foreign'; brandId: number | null;
  actionsText: string; tenderWinner: string;
  purchaseAmount: number | null; purchaseCurrencyId: number | null;
  proformaDate: string | null; proformaAmount: number | null; proformaCurrencyId: number | null;
  paymentMethodIds: number[];
};

export type ProcessDetail = ProcessDto & {
  cheques: ChequeDto[];
  stages: StageDto[];
  receivedGuarantees: ReceivedGuaranteeDto[];
  issuedGuarantees: IssuedGuaranteeDto[];
};

export type ProcessListRow = {
  id: number; requestNumber: string; companyName: string; itemName: string; categoryName: string;
  startDate: string; status: ProcessDto['status']; purchaseType: 'domestic' | 'foreign';
  agentName: string | null; executorName: string | null; brandName: string | null;
  purchaseAmount: number | null; purchaseCurrencyId: number | null;
  proformaAmount: number | null; proformaCurrencyId: number | null;
  updatedBy: string; updatedAt: string;
};
export type ProcessListResponse = { rows: ProcessListRow[]; total: number };

export type AuditEntry = {
  id: number; entity: string; entityId: number | null; action: 'create' | 'update' | 'delete';
  summary: string; changes: Record<string, [unknown, unknown]> | null; userName: string; at: string;
};

/** Filters shared by the dashboard, the process list and every report. */
export type Filters = {
  q?: string;
  requestNumber?: string;
  companyId?: number;
  categoryId?: number;
  itemId?: number;
  agentId?: number;
  executorId?: number;
  agentRelation?: 'direct' | 'indirect';
  purchaseType?: 'domestic' | 'foreign';
  brandId?: number;
  tenderWinner?: string;
  status?: 'active' | 'completed' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  currencyId?: number;
  paymentMethodId?: number;
  stageStatus?: 'paid' | 'unpaid' | 'overdue';
  guaranteeStatus?: GuaranteeStatus;
};

/** A money cell in a report row. */
export type MoneyCell = { v: number; c: string; d: number };
export type Cell = string | number | null | MoneyCell;
export type ReportColumn = {
  key: string; label: string;
  type: 'text' | 'int' | 'date' | 'money' | 'badge' | 'days';
  /** badge label map key (rendered via a status dictionary) */
  badge?: 'purchaseType' | 'processStatus' | 'stageStatus' | 'chequeStatus' | 'guaranteeStatus';
};
export type ReportRow = { _processId?: number; [key: string]: Cell | undefined };
export type ReportResult = {
  id: ReportId; title: string; description: string;
  columns: ReportColumn[]; rows: ReportRow[]; total: number;
  /** per-currency totals footer notes (never cross-currency) */
  notes?: string;
};
export type ReportId =
  | 'processes' | 'byCompany' | 'byItem' | 'byCategory' | 'agents' | 'executors' | 'purchaseType'
  | 'totalsByCurrency' | 'proformas' | 'cheques' | 'obligations' | 'guarantees' | 'durations';

export type DashboardData = {
  kpis: {
    total: number; active: number; domestic: number; foreign: number; proformas: number;
    cheques: { pending: number; pendingOverdue: number };
    guarantees: { active: number; received: number; issued: number };
  };
  byCurrency: { currencyId: number; code: string; decimals: number; purchases: number; proformas: number; paid: number; unpaid: number; overdue: number; chequesPending: number }[];
  byCompany: { name: string; count: number }[];
  byCategory: { name: string; count: number }[];
  purchaseType: { type: 'domestic' | 'foreign'; count: number }[];
  agents: { name: string; total: number; completed: number; active: number }[];
  executors: { name: string; total: number; completed: number; active: number }[];
  trend: { key: string; label: string; count: number }[];
  paymentMethods: { name: string; count: number }[];
  obligations: { stage: { paid: number; unpaid: number; overdue: number }; guarantee: Record<GuaranteeStatus, number> };
};

export type Role = 'admin' | 'editor' | 'viewer';
export type CurrentUser = { id: number; username: string; fullName: string; role: Role };
export type UserDto = { id: number; username: string; fullName: string; role: Role; isActive: boolean; createdAt: string; lastLogin: string | null };
