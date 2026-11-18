import { z } from 'zod';

/** Shared (client + server) validation. Money travels as decimal strings, never floats. */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ معتبر نیست');
const optIso = isoDate.nullable().optional();
const id = z.number().int().positive();
const optId = id.nullable().optional();
const money = z.string().trim().min(1, 'مبلغ را وارد کنید');
const text = z.string().trim();

export const processSchema = z
  .object({
    requestNumber: text.min(1, 'شماره درخواست خرید الزامی است'),
    companyId: z.number({ error: 'شرکت متقاضی را انتخاب کنید' }).int().positive('شرکت متقاضی را انتخاب کنید'),
    itemId: z.number({ error: 'کالا را انتخاب کنید' }).int().positive('کالا را انتخاب کنید'),
    startDate: isoDate,
    status: z.enum(['active', 'completed', 'cancelled']),
    completedAt: optIso,
    agentId: optId,
    agentRelation: z.enum(['direct', 'indirect']).nullable().optional(),
    executorId: optId,
    purchaseType: z.enum(['domestic', 'foreign']),
    brandId: optId,
    actionsText: text.default(''),
    tenderWinner: text.default(''),
    purchaseAmount: z.string().trim().nullable().optional(),
    purchaseCurrencyId: optId,
    proformaDate: optIso,
    proformaAmount: z.string().trim().nullable().optional(),
    proformaCurrencyId: optId,
    paymentMethodIds: z.array(id).default([])
  })
  .superRefine((v, ctx) => {
    const pair = (a: unknown, c: unknown, path: string, msg: string) => {
      const hasA = a !== null && a !== undefined && a !== '';
      const hasC = c !== null && c !== undefined;
      if (hasA && !hasC) ctx.addIssue({ code: 'custom', path: [path], message: msg });
    };
    pair(v.purchaseAmount, v.purchaseCurrencyId, 'purchaseCurrencyId', 'واحد پولی را انتخاب کنید');
    pair(v.proformaAmount, v.proformaCurrencyId, 'proformaCurrencyId', 'واحد پولی را انتخاب کنید');
    if (v.completedAt && v.completedAt < v.startDate)
      ctx.addIssue({ code: 'custom', path: ['completedAt'], message: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد' });
  });
export type ProcessInput = z.input<typeof processSchema>;

export const chequeSchema = z.object({
  chequeNumber: text.min(1, 'شماره چک الزامی است'),
  chequeDate: isoDate,
  amount: money,
  currencyId: id,
  issuerName: text.min(1, 'شرکت صادرکننده الزامی است'),
  status: z.enum(['pending', 'cashed', 'bounced']).default('pending'),
  notes: text.default('')
});
export type ChequeInput = z.input<typeof chequeSchema>;

export const stageSchema = z
  .object({
    amountType: z.enum(['amount', 'percent']),
    amount: z.string().trim().nullable().optional(),
    currencyId: optId,
    percent: z.string().trim().nullable().optional(), // e.g. "30" or "12.5"
    conditionText: text.default(''),
    dueDate: optIso,
    status: z.enum(['paid', 'unpaid']).default('unpaid'),
    paidAt: optIso,
    notes: text.default('')
  })
  .superRefine((v, ctx) => {
    if (v.amountType === 'amount') {
      if (!v.amount) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'مبلغ را وارد کنید' });
      if (!v.currencyId) ctx.addIssue({ code: 'custom', path: ['currencyId'], message: 'واحد پولی را انتخاب کنید' });
    } else if (!v.percent) {
      ctx.addIssue({ code: 'custom', path: ['percent'], message: 'درصد را وارد کنید' });
    }
  });
export type StageInput = z.input<typeof stageSchema>;

const guaranteeBase = {
  guaranteeTypeId: id,
  referenceNo: text.min(1, 'شماره/شناسه الزامی است'),
  amount: money,
  currencyId: id,
  issueDate: isoDate,
  status: z.enum(['active', 'returned', 'collected', 'cancelled']).default('active'),
  notes: text.default('')
};

export const receivedGuaranteeSchema = z.object({ ...guaranteeBase, dueDate: optIso });
export type ReceivedGuaranteeInput = z.input<typeof receivedGuaranteeSchema>;

export const issuedGuaranteeSchema = z.object({
  ...guaranteeBase,
  validUntil: optIso,
  recipientName: text.min(1, 'نام دریافت‌کننده الزامی است'),
  relatedCompanyId: optId
});
export type IssuedGuaranteeInput = z.input<typeof issuedGuaranteeSchema>;
