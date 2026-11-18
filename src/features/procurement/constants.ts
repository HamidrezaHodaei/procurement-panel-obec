/** Enum values + Persian labels, shared by forms, tables, reports and exports. */

export type Option<T extends string = string> = { value: T; label: string };

const opts = <T extends string>(o: Record<T, string>): Option<T>[] =>
  (Object.keys(o) as T[]).map((value) => ({ value, label: o[value] }));

export const PURCHASE_TYPE = { domestic: 'داخلی', foreign: 'خارجی' } as const;
export const AGENT_RELATION = { direct: 'مستقیم', indirect: 'غیرمستقیم' } as const;
export const PROCESS_STATUS = { active: 'فعال', completed: 'تکمیل‌شده', cancelled: 'لغوشده' } as const;
export const AMOUNT_TYPE = { amount: 'مبلغ ثابت', percent: 'درصد' } as const;
export const STAGE_STATUS = { paid: 'پرداخت‌شده', unpaid: 'پرداخت‌نشده', overdue: 'سررسیدشده' } as const;
export const CHEQUE_STATUS = { pending: 'در انتظار سررسید', cashed: 'وصول‌شده', bounced: 'برگشتی' } as const;
export const GUARANTEE_STATUS = {
  active: 'فعال',
  returned: 'مستردشده',
  collected: 'وصول‌شده',
  cancelled: 'ابطال‌شده'
} as const;
export const BRAND_KIND = { domestic: 'برند داخلی', foreign: 'برند خارجی' } as const;
export const PAYMENT_KIND = { cash: 'نقدی/مرحله‌ای', cheque: 'چک', guarantee: 'ضمانت', other: 'سایر' } as const;

export const PURCHASE_TYPE_OPTIONS = opts(PURCHASE_TYPE);
export const AGENT_RELATION_OPTIONS = opts(AGENT_RELATION);
export const PROCESS_STATUS_OPTIONS = opts(PROCESS_STATUS);
export const AMOUNT_TYPE_OPTIONS = opts(AMOUNT_TYPE);
export const STAGE_STATUS_OPTIONS = opts(STAGE_STATUS);
export const CHEQUE_STATUS_OPTIONS = opts(CHEQUE_STATUS);
export const GUARANTEE_STATUS_OPTIONS = opts(GUARANTEE_STATUS);
export const PAYMENT_KIND_OPTIONS = opts(PAYMENT_KIND);

export const ROUTES = {
  dashboard: '/dashboard/procurement',
  processes: '/dashboard/procurement/processes',
  newProcess: '/dashboard/procurement/processes/new',
  process: (id: number | string) => `/dashboard/procurement/processes/${id}`,
  reports: '/dashboard/procurement/reports',
  settings: '/dashboard/procurement/settings'
} as const;

export const ROLE_LABEL = { admin: 'مدیر سیستم', editor: 'کاربر (ثبت و ویرایش)', viewer: 'مشاهده‌گر' } as const;
export const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((value) => ({ value, label: ROLE_LABEL[value] }));
