'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatJalali, todayIso } from '@/lib/jalali';
import { formatMoney, formatPercentBp, minorToInput } from '@/lib/money';
import { ApiRequestError } from '../api/client';
import { procKeys, procMutations } from '../api/queries';
import { AMOUNT_TYPE_OPTIONS, CHEQUE_STATUS_OPTIONS, GUARANTEE_STATUS_OPTIONS } from '../constants';
import type { ChequeDto, IssuedGuaranteeDto, ProcessDetail, ReceivedGuaranteeDto, StageDto } from '../types';
import { StatusBadge } from './badges';
import { FormField, MoneyInput, OptionSelect } from './form-parts';
import { JalaliDatePicker } from './jalali-date-picker';
import { useLookups } from './lookups';
import { useMe } from './use-me';
import { detailToForm, formToInput } from './process-form';

/* ───────────── shared helpers ───────────── */

function useChildActions(processId: number) {
  const qc = useQueryClient();
  const save = useMutation(procMutations.saveChild());
  const del = useMutation(procMutations.deleteChild());
  const done = () => qc.invalidateQueries({ queryKey: procKeys.all });
  return { save, del, done };
}

function errorHandler(setErrors: (e: Record<string, string>) => void) {
  return (e: unknown) => {
    if (e instanceof ApiRequestError) {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast.error(e.message);
    } else toast.error('ذخیره‌سازی ناموفق بود');
  };
}

function RecordDialog({
  open, onOpenChange, title, saving, onSubmit, children
}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; saving: boolean; onSubmit: () => void; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>اطلاعات را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>{children}</div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>انصراف</Button>
            <LoadingButton type='submit' loading={saving}>ذخیره</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({ title, description, onAdd, addLabel = 'افزودن', count, children }: {
  title: string; description?: string; onAdd: () => void; addLabel?: string; count: number; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} <Badge variant='outline'>{count.toLocaleString('fa-IR')}</Badge></CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Button size='sm' onClick={onAdd}><Icons.add /> {addLabel}</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {count === 0 ? <p className='text-muted-foreground py-6 text-center text-sm'>هنوز رکوردی ثبت نشده است.</p> : <div className='overflow-x-auto'>{children}</div>}
      </CardContent>
    </Card>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className='flex justify-end gap-1'>
      <Button variant='ghost' size='icon-sm' onClick={onEdit} aria-label='ویرایش'><Icons.edit /></Button>
      <Button variant='ghost' size='icon-sm' onClick={onDelete} aria-label='حذف' className='text-destructive'><Icons.trash /></Button>
    </div>
  );
}

function DeleteConfirm({ target, label, onClose, onConfirm, loading }: { target: unknown; label: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <AlertModal isOpen={!!target} onClose={onClose} onConfirm={onConfirm} loading={loading} title={`حذف ${label}`} description='این عمل قابل بازگشت نیست.' confirmLabel='حذف' />
  );
}

const cur = (lk: ReturnType<typeof useLookups>, id: number | string | null | undefined) => lk.currency(id ? Number(id) : null);
const asNum = (v: string) => (v === '' ? null : Number(v));

function CurrencySelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const { lookups } = useLookups();
  return (
    <FormField label='واحد پولی' required error={error}>
      <OptionSelect
        value={value} invalid={!!error} onChange={(v) => onChange(v ?? '')}
        options={lookups.currencies.filter((c) => c.isActive || String(c.id) === value).map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
      />
    </FormField>
  );
}

/* ───────────── cheques ───────────── */

type ChequeForm = { chequeNumber: string; chequeDate: string | null; amount: string; currencyId: string; issuerName: string; status: string; notes: string };

function ChequesSection({ d }: { d: ProcessDetail }) {
  const lk = useLookups();
  const { save, del, done } = useChildActions(d.id);
  const defCur = String(d.proformaCurrencyId ?? d.purchaseCurrencyId ?? lk.lookups.currencies.find((c) => c.isActive)?.id ?? '');
  const blank: ChequeForm = { chequeNumber: '', chequeDate: todayIso(), amount: '', currencyId: defCur, issuerName: lk.name(lk.lookups.companies, d.companyId) === '—' ? '' : lk.name(lk.lookups.companies, d.companyId), status: 'pending', notes: '' };
  const [edit, setEdit] = React.useState<{ id?: number; f: ChequeForm } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [target, setTarget] = React.useState<ChequeDto | null>(null);
  const f = edit?.f;
  const set = (k: keyof ChequeForm, v: string | null) => { setEdit((e) => e && { ...e, f: { ...e.f, [k]: v } as ChequeForm }); setErrors((x) => ({ ...x, [k]: '' })); };

  const open = (c?: ChequeDto) => {
    setErrors({});
    setEdit(c ? { id: c.id, f: { chequeNumber: c.chequeNumber, chequeDate: c.chequeDate, amount: minorToInput(c.amount, cur(lk, c.currencyId)?.decimals ?? 0), currencyId: String(c.currencyId), issuerName: c.issuerName, status: c.status, notes: c.notes } } : { f: blank });
  };
  const submit = () => {
    if (!edit || !f) return;
    const e: Record<string, string> = {};
    if (!f.chequeNumber.trim()) e.chequeNumber = 'شماره چک الزامی است';
    if (!f.chequeDate) e.chequeDate = 'تاریخ چک الزامی است';
    if (!f.amount) e.amount = 'مبلغ را وارد کنید';
    if (!f.currencyId) e.currencyId = 'واحد پولی را انتخاب کنید';
    if (!f.issuerName.trim()) e.issuerName = 'شرکت صادرکننده الزامی است';
    if (Object.keys(e).length) return setErrors(e);
    save.mutate({ processId: d.id, kind: 'cheques', id: edit.id, values: { ...f, currencyId: asNum(f.currencyId) } }, {
      onSuccess: () => { toast.success('چک ذخیره شد'); setEdit(null); done(); }, onError: errorHandler(setErrors)
    });
  };

  return (
    <>
      <SectionCard title='پرداخت از طریق چک' description='ثبت چندین چک برای این پرونده' count={d.cheques.length} onAdd={() => open()} addLabel='افزودن چک'>
        <Table>
          <TableHeader><TableRow><TableHead>شماره چک</TableHead><TableHead>تاریخ چک</TableHead><TableHead>مبلغ</TableHead><TableHead>شرکت صادرکننده</TableHead><TableHead>وضعیت</TableHead><TableHead>توضیحات</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {d.cheques.map((c) => (
              <TableRow key={c.id}>
                <TableCell className='tabular-nums'>{c.chequeNumber}</TableCell>
                <TableCell>{formatJalali(c.chequeDate)}</TableCell>
                <TableCell className='tabular-nums'>{lk.money(c.amount, c.currencyId)}</TableCell>
                <TableCell>{c.issuerName}</TableCell>
                <TableCell><StatusBadge kind='chequeStatus' value={c.status} /></TableCell>
                <TableCell className='text-muted-foreground max-w-48 truncate'>{c.notes}</TableCell>
                <TableCell><RowActions onEdit={() => open(c)} onDelete={() => setTarget(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.id ? 'ویرایش چک' : 'افزودن چک'} saving={save.isPending} onSubmit={submit}>
        {f && (<>
          <FormField label='شماره چک' required error={errors.chequeNumber}><Input dir='ltr' className='text-end' value={f.chequeNumber} onChange={(e) => set('chequeNumber', e.target.value)} /></FormField>
          <FormField label='تاریخ چک (شمسی)' required error={errors.chequeDate}><JalaliDatePicker value={f.chequeDate} onChange={(v) => set('chequeDate', v)} clearable={false} /></FormField>
          <FormField label='مبلغ' required error={errors.amount}><MoneyInput value={f.amount} decimals={cur(lk, f.currencyId)?.decimals ?? 0} onChange={(v) => set('amount', v)} invalid={!!errors.amount} /></FormField>
          <CurrencySelect value={f.currencyId} onChange={(v) => set('currencyId', v)} error={errors.currencyId} />
          <FormField label='شرکت صادرکننده' required error={errors.issuerName}><Input value={f.issuerName} onChange={(e) => set('issuerName', e.target.value)} /></FormField>
          <FormField label='وضعیت چک'><OptionSelect value={f.status} options={CHEQUE_STATUS_OPTIONS} onChange={(v) => set('status', v ?? 'pending')} /></FormField>
          <FormField label='توضیحات' className='sm:col-span-2'><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></FormField>
        </>)}
      </RecordDialog>
      <DeleteConfirm target={target} label='چک' loading={del.isPending} onClose={() => setTarget(null)}
        onConfirm={() => target && del.mutate({ processId: d.id, kind: 'cheques', id: target.id }, { onSuccess: () => { toast.success('حذف شد'); setTarget(null); done(); }, onError: () => toast.error('حذف ناموفق بود') })} />
    </>
  );
}

/* ───────────── payment stages ───────────── */

type StageForm = { amountType: string; amount: string; currencyId: string; percent: string; conditionText: string; dueDate: string | null; status: string; paidAt: string | null; notes: string };

function StagesSection({ d }: { d: ProcessDetail }) {
  const lk = useLookups();
  const { save, del, done } = useChildActions(d.id);
  const baseCur = d.proformaAmount !== null ? d.proformaCurrencyId : d.purchaseCurrencyId;
  const baseAmt = d.proformaAmount ?? d.purchaseAmount;
  const defCur = String(baseCur ?? lk.lookups.currencies.find((c) => c.isActive)?.id ?? '');
  const blank: StageForm = { amountType: baseAmt !== null ? 'percent' : 'amount', amount: '', currencyId: defCur, percent: '', conditionText: '', dueDate: null, status: 'unpaid', paidAt: null, notes: '' };
  const [edit, setEdit] = React.useState<{ id?: number; f: StageForm } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [target, setTarget] = React.useState<StageDto | null>(null);
  const f = edit?.f;
  const set = (k: keyof StageForm, v: string | null) => { setEdit((e) => e && { ...e, f: { ...e.f, [k]: v } as StageForm }); setErrors((x) => ({ ...x, [k]: '' })); };

  const open = (s?: StageDto) => {
    setErrors({});
    setEdit(s ? { id: s.id, f: {
      amountType: s.amountType, amount: minorToInput(s.amount, cur(lk, s.currencyId)?.decimals ?? 0), currencyId: s.currencyId ? String(s.currencyId) : defCur,
      percent: minorToInput(s.percentBp, 2), conditionText: s.conditionText, dueDate: s.dueDate, status: s.status, paidAt: s.paidAt, notes: s.notes } } : { f: blank });
  };
  const submit = () => {
    if (!edit || !f) return;
    const e: Record<string, string> = {};
    if (f.amountType === 'amount') { if (!f.amount) e.amount = 'مبلغ را وارد کنید'; if (!f.currencyId) e.currencyId = 'واحد پولی را انتخاب کنید'; }
    else if (!f.percent) e.percent = 'درصد را وارد کنید';
    if (Object.keys(e).length) return setErrors(e);
    save.mutate({ processId: d.id, kind: 'stages', id: edit.id, values: { ...f, currencyId: f.amountType === 'amount' ? asNum(f.currencyId) : null } }, {
      onSuccess: () => { toast.success('مرحله پرداخت ذخیره شد'); setEdit(null); done(); }, onError: errorHandler(setErrors)
    });
  };

  const pctSum = d.stages.filter((s) => s.amountType === 'percent').reduce((a, s) => a + (s.percentBp ?? 0), 0);
  const noBase = d.stages.some((s) => s.amountType === 'percent') && baseAmt === null;

  return (
    <>
      <SectionCard title='پرداخت نقدی و مرحله‌ای' description='مراحل پرداخت با مبلغ ثابت یا درصدی از مبلغ پیش‌فاکتور (در نبود پیش‌فاکتور: قیمت خرید)' count={d.stages.length} onAdd={() => open()} addLabel='افزودن مرحله'>
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>زمان / شرط پرداخت</TableHead><TableHead>مبلغ</TableHead><TableHead>سررسید</TableHead><TableHead>وضعیت</TableHead><TableHead>توضیحات</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {d.stages.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell className='tabular-nums'>{(i + 1).toLocaleString('fa-IR')}</TableCell>
                <TableCell>{s.conditionText || '—'}</TableCell>
                <TableCell className='tabular-nums'>
                  {s.amountType === 'percent' ? <>{formatPercentBp(s.percentBp)} <span className='text-muted-foreground'>({lk.money(s.effAmount, s.effCurrencyId)})</span></> : lk.money(s.amount, s.currencyId)}
                </TableCell>
                <TableCell>{s.dueDate ? formatJalali(s.dueDate) : '—'}</TableCell>
                <TableCell><StatusBadge kind='stageStatus' value={s.effStatus} /></TableCell>
                <TableCell className='text-muted-foreground max-w-48 truncate'>{s.notes}</TableCell>
                <TableCell><RowActions onEdit={() => open(s)} onDelete={() => setTarget(s)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(pctSum > 10000 || noBase) && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {pctSum > 10000 && <Badge variant='destructive'><Icons.warning /> مجموع درصدها {formatPercentBp(pctSum)} و بیش از ۱۰۰٪ است</Badge>}
            {noBase && <Badge variant='destructive'><Icons.warning /> برای مراحل درصدی، مبلغ پیش‌فاکتور یا قیمت خرید ثبت نشده است</Badge>}
          </div>
        )}
      </SectionCard>
      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.id ? 'ویرایش مرحله پرداخت' : 'افزودن مرحله پرداخت'} saving={save.isPending} onSubmit={submit}>
        {f && (<>
          <FormField label='نوع مبلغ' required><OptionSelect value={f.amountType} options={AMOUNT_TYPE_OPTIONS} onChange={(v) => set('amountType', v ?? 'amount')} /></FormField>
          {f.amountType === 'percent' ? (
            <FormField label='درصد پرداخت' required error={errors.percent} description={baseAmt !== null ? `مبنا: ${lk.money(baseAmt, baseCur)}` : 'مبلغ پایه ثبت نشده است'}>
              <MoneyInput value={f.percent} decimals={2} onChange={(v) => set('percent', v)} invalid={!!errors.percent} placeholder='مثلاً ۳۰' />
            </FormField>
          ) : (<>
            <FormField label='مبلغ' required error={errors.amount}><MoneyInput value={f.amount} decimals={cur(lk, f.currencyId)?.decimals ?? 0} onChange={(v) => set('amount', v)} invalid={!!errors.amount} /></FormField>
            <CurrencySelect value={f.currencyId} onChange={(v) => set('currencyId', v)} error={errors.currencyId} />
          </>)}
          <FormField label='زمان یا شرط پرداخت' className={f.amountType === 'percent' ? '' : 'sm:col-span-2'}><Input value={f.conditionText} onChange={(e) => set('conditionText', e.target.value)} placeholder='مثلاً هنگام بارگیری' /></FormField>
          <FormField label='تاریخ سررسید (شمسی)'><JalaliDatePicker value={f.dueDate} onChange={(v) => set('dueDate', v)} /></FormField>
          <FormField label='وضعیت پرداخت' description='«سررسیدشده» به‌صورت خودکار از تاریخ سررسید محاسبه می‌شود'>
            <OptionSelect value={f.status} options={[{ value: 'unpaid', label: 'پرداخت‌نشده' }, { value: 'paid', label: 'پرداخت‌شده' }]} onChange={(v) => set('status', v ?? 'unpaid')} />
          </FormField>
          {f.status === 'paid' && <FormField label='تاریخ پرداخت (شمسی)' description='خالی = امروز'><JalaliDatePicker value={f.paidAt} onChange={(v) => set('paidAt', v)} /></FormField>}
          <FormField label='توضیحات' className='sm:col-span-2'><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></FormField>
        </>)}
      </RecordDialog>
      <DeleteConfirm target={target} label='مرحله پرداخت' loading={del.isPending} onClose={() => setTarget(null)}
        onConfirm={() => target && del.mutate({ processId: d.id, kind: 'stages', id: target.id }, { onSuccess: () => { toast.success('حذف شد'); setTarget(null); done(); }, onError: () => toast.error('حذف ناموفق بود') })} />
    </>
  );
}

/* ───────────── guarantees (received from customer / issued by company — independent) ───────────── */

type GForm = { guaranteeTypeId: string; referenceNo: string; amount: string; currencyId: string; issueDate: string | null; endDate: string | null; status: string; notes: string; recipientName: string; relatedCompanyId: string };

function GuaranteesSection({ d, kind }: { d: ProcessDetail; kind: 'received-guarantees' | 'issued-guarantees' }) {
  const issued = kind === 'issued-guarantees';
  const lk = useLookups();
  const { save, del, done } = useChildActions(d.id);
  const rows = (issued ? d.issuedGuarantees : d.receivedGuarantees) as (ReceivedGuaranteeDto | IssuedGuaranteeDto)[];
  const defCur = String(d.proformaCurrencyId ?? d.purchaseCurrencyId ?? lk.lookups.currencies.find((c) => c.isActive)?.id ?? '');
  const blank: GForm = { guaranteeTypeId: '', referenceNo: '', amount: '', currencyId: defCur, issueDate: todayIso(), endDate: null, status: 'active', notes: '', recipientName: '', relatedCompanyId: String(d.companyId) };
  const [edit, setEdit] = React.useState<{ id?: number; f: GForm } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [target, setTarget] = React.useState<{ id: number } | null>(null);
  const f = edit?.f;
  const set = (k: keyof GForm, v: string | null) => { setEdit((e) => e && { ...e, f: { ...e.f, [k]: v } as GForm }); setErrors((x) => ({ ...x, [k]: '' })); };
  const endOf = (g: ReceivedGuaranteeDto | IssuedGuaranteeDto) => ('validUntil' in g ? g.validUntil : g.dueDate);

  const open = (g?: ReceivedGuaranteeDto | IssuedGuaranteeDto) => {
    setErrors({});
    setEdit(g ? { id: g.id, f: {
      guaranteeTypeId: String(g.guaranteeTypeId), referenceNo: g.referenceNo, amount: minorToInput(g.amount, cur(lk, g.currencyId)?.decimals ?? 0), currencyId: String(g.currencyId),
      issueDate: g.issueDate, endDate: endOf(g) ?? null, status: g.status, notes: g.notes,
      recipientName: 'recipientName' in g ? g.recipientName : '', relatedCompanyId: 'relatedCompanyId' in g && g.relatedCompanyId ? String(g.relatedCompanyId) : '' } } : { f: blank });
  };
  const submit = () => {
    if (!edit || !f) return;
    const e: Record<string, string> = {};
    if (!f.guaranteeTypeId) e.guaranteeTypeId = 'نوع ضمانت را انتخاب کنید';
    if (!f.referenceNo.trim()) e.referenceNo = 'شماره/شناسه الزامی است';
    if (!f.amount) e.amount = 'مبلغ را وارد کنید';
    if (!f.issueDate) e.issueDate = 'تاریخ صدور الزامی است';
    if (issued && !f.recipientName.trim()) e.recipientName = 'نام دریافت‌کننده الزامی است';
    if (Object.keys(e).length) return setErrors(e);
    const base = { guaranteeTypeId: asNum(f.guaranteeTypeId), referenceNo: f.referenceNo, amount: f.amount, currencyId: asNum(f.currencyId), issueDate: f.issueDate, status: f.status, notes: f.notes };
    const values = issued ? { ...base, validUntil: f.endDate, recipientName: f.recipientName, relatedCompanyId: asNum(f.relatedCompanyId) } : { ...base, dueDate: f.endDate };
    save.mutate({ processId: d.id, kind, id: edit.id, values }, {
      onSuccess: () => { toast.success('ضمانت ذخیره شد'); setEdit(null); done(); }, onError: errorHandler(setErrors)
    });
  };

  const typeOpts = lk.lookups.guaranteeTypes.filter((t) => t.isActive || String(t.id) === f?.guaranteeTypeId).map((t) => ({ value: t.id, label: t.name }));
  const title = issued ? 'ضمانت‌های صادرشده توسط شرکت' : 'ضمانت‌های دریافتی از مشتری';

  return (
    <>
      <SectionCard title={title} description={issued ? 'ضمانت‌هایی که شرکت برای این خرید صادر کرده است (مستقل از ضمانت‌های دریافتی)' : 'ضمانت‌هایی که از مشتری دریافت شده است'} count={rows.length} onAdd={() => open()} addLabel='افزودن ضمانت'>
        <Table>
          <TableHeader><TableRow>
            <TableHead>نوع</TableHead><TableHead>{issued ? 'شماره چک / شناسه ضمانت‌نامه' : 'شماره / شناسه'}</TableHead><TableHead>مبلغ</TableHead><TableHead>تاریخ صدور</TableHead>
            <TableHead>{issued ? 'تاریخ اعتبار' : 'تاریخ سررسید'}</TableHead>{issued && <><TableHead>دریافت‌کننده</TableHead><TableHead>شرکت مرتبط</TableHead></>}
            <TableHead>وضعیت</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{lk.name(lk.lookups.guaranteeTypes, g.guaranteeTypeId)}</TableCell>
                <TableCell className='tabular-nums'>{g.referenceNo}</TableCell>
                <TableCell className='tabular-nums'>{lk.money(g.amount, g.currencyId)}</TableCell>
                <TableCell>{formatJalali(g.issueDate)}</TableCell>
                <TableCell>{endOf(g) ? formatJalali(endOf(g)) : '—'}</TableCell>
                {issued && <><TableCell>{'recipientName' in g ? g.recipientName : ''}</TableCell><TableCell>{'relatedCompanyId' in g ? lk.name(lk.lookups.companies, g.relatedCompanyId) : ''}</TableCell></>}
                <TableCell><StatusBadge kind='guaranteeStatus' value={g.status} /></TableCell>
                <TableCell><RowActions onEdit={() => open(g)} onDelete={() => setTarget(g)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={`${edit?.id ? 'ویرایش' : 'افزودن'} ${issued ? 'ضمانت صادرشده' : 'ضمانت دریافتی'}`} saving={save.isPending} onSubmit={submit}>
        {f && (<>
          <FormField label='نوع ضمانت' required error={errors.guaranteeTypeId}><OptionSelect value={f.guaranteeTypeId} options={typeOpts} onChange={(v) => set('guaranteeTypeId', v ?? '')} invalid={!!errors.guaranteeTypeId} /></FormField>
          <FormField label={issued ? 'شماره چک یا شناسه ضمانت‌نامه' : 'شماره یا شناسه ضمانت'} required error={errors.referenceNo}><Input dir='ltr' className='text-end' value={f.referenceNo} onChange={(e) => set('referenceNo', e.target.value)} /></FormField>
          <FormField label='مبلغ ضمانت' required error={errors.amount}><MoneyInput value={f.amount} decimals={cur(lk, f.currencyId)?.decimals ?? 0} onChange={(v) => set('amount', v)} invalid={!!errors.amount} /></FormField>
          <CurrencySelect value={f.currencyId} onChange={(v) => set('currencyId', v)} error={errors.currencyId} />
          <FormField label='تاریخ صدور (شمسی)' required error={errors.issueDate}><JalaliDatePicker value={f.issueDate} onChange={(v) => set('issueDate', v)} clearable={false} /></FormField>
          <FormField label={issued ? 'تاریخ اعتبار (شمسی)' : 'تاریخ سررسید (شمسی)'}><JalaliDatePicker value={f.endDate} onChange={(v) => set('endDate', v)} /></FormField>
          {issued && (<>
            <FormField label='نام دریافت‌کننده' required error={errors.recipientName}><Input value={f.recipientName} onChange={(e) => set('recipientName', e.target.value)} /></FormField>
            <FormField label='شرکت مرتبط'><OptionSelect value={f.relatedCompanyId} clearable onChange={(v) => set('relatedCompanyId', v ?? '')} options={lk.lookups.companies.filter((c) => c.isActive || String(c.id) === f.relatedCompanyId).map((c) => ({ value: c.id, label: c.name }))} /></FormField>
          </>)}
          <FormField label='وضعیت ضمانت'><OptionSelect value={f.status} options={GUARANTEE_STATUS_OPTIONS} onChange={(v) => set('status', v ?? 'active')} /></FormField>
          <FormField label='توضیحات' className='sm:col-span-2'><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></FormField>
        </>)}
      </RecordDialog>
      <DeleteConfirm target={target} label='ضمانت' loading={del.isPending} onClose={() => setTarget(null)}
        onConfirm={() => target && del.mutate({ processId: d.id, kind, id: target.id }, { onSuccess: () => { toast.success('حذف شد'); setTarget(null); done(); }, onError: () => toast.error('حذف ناموفق بود') })} />
    </>
  );
}

/* ───────────── per-currency summary ───────────── */

function Summary({ d }: { d: ProcessDetail }) {
  const lk = useLookups();
  const rows = React.useMemo(() => {
    const m = new Map<number, { paid: number; unpaid: number; cheques: number }>();
    const get = (id: number) => { if (!m.has(id)) m.set(id, { paid: 0, unpaid: 0, cheques: 0 }); return m.get(id)!; };
    for (const s of d.stages) if (s.effCurrencyId && s.effAmount) get(s.effCurrencyId)[s.effStatus === 'paid' ? 'paid' : 'unpaid'] += s.effAmount;
    for (const c of d.cheques) { if (c.status === 'cashed') get(c.currencyId).paid += c.amount; else if (c.status === 'pending') get(c.currencyId).cheques += c.amount; }
    return [...m.entries()];
  }, [d]);
  if (!rows.length) return null;
  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {rows.map(([id, v]) => {
        const c = lk.currency(id)!;
        return (
          <Card key={id} size='sm'>
            <CardHeader><CardDescription>خلاصه پرداخت‌ها ({c.code})</CardDescription></CardHeader>
            <CardContent className='space-y-1 text-sm'>
              <div className='flex justify-between'><span className='text-muted-foreground'>پرداخت‌شده (مراحل + چک وصول‌شده)</span><span className='tabular-nums'>{formatMoney(v.paid, c.decimals)}</span></div>
              <div className='flex justify-between'><span className='text-muted-foreground'>تعهد پرداخت‌نشده</span><span className='tabular-nums'>{formatMoney(v.unpaid, c.decimals)}</span></div>
              <div className='flex justify-between'><span className='text-muted-foreground'>چک در انتظار سررسید</span><span className='tabular-nums'>{formatMoney(v.cheques, c.decimals)}</span></div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ───────────── panel ───────────── */

export function PaymentsPanel({ d }: { d: ProcessDetail }) {
  const lk = useLookups();
  const { canEdit } = useMe();
  const qc = useQueryClient();
  const update = useMutation(procMutations.updateProcess());
  const methods = lk.lookups.paymentMethods.filter((m) => m.isActive || d.paymentMethodIds.includes(m.id));
  const selectedKinds = new Set(methods.filter((m) => d.paymentMethodIds.includes(m.id)).map((m) => m.kind));

  const toggle = (id: number, checked: boolean) => {
    const ids = checked ? [...d.paymentMethodIds, id] : d.paymentMethodIds.filter((x) => x !== id);
    update.mutate({ id: d.id, values: { ...formToInput(detailToForm(d, lk.lookups)), paymentMethodIds: ids } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: procKeys.all }),
      onError: (e) => toast.error(e instanceof ApiRequestError ? e.message : 'ذخیره ناموفق بود')
    });
  };

  const show = {
    cheque: selectedKinds.has('cheque') || d.cheques.length > 0,
    cash: selectedKinds.has('cash') || d.stages.length > 0,
    guarantee: selectedKinds.has('guarantee') || d.receivedGuarantees.length + d.issuedGuarantees.length > 0
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>روش‌های پرداخت این پرونده</CardTitle>
          <CardDescription>با انتخاب هر روش، بخش مربوط به آن در پایین نمایش داده می‌شود</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-x-6 gap-y-3'>
          {methods.map((m) => (
            <label key={m.id} className='flex cursor-pointer items-center gap-2 text-sm'>
              <Checkbox checked={d.paymentMethodIds.includes(m.id)} disabled={update.isPending || !canEdit} onCheckedChange={(c) => toggle(m.id, !!c)} />
              {m.name}{!m.isActive && ' (غیرفعال)'}
            </label>
          ))}
          {methods.length === 0 && <span className='text-muted-foreground text-sm'>هیچ روش پرداختی در تنظیمات تعریف نشده است.</span>}
        </CardContent>
      </Card>

      <Summary d={d} />

      {!show.cheque && !show.cash && !show.guarantee && (
        <p className='text-muted-foreground py-8 text-center text-sm'>برای ثبت چک، مراحل پرداخت یا ضمانت، ابتدا روش پرداخت مربوطه را انتخاب کنید.</p>
      )}
      {show.cash && <StagesSection d={d} />}
      {show.cheque && <ChequesSection d={d} />}
      {show.guarantee && (<>
        <GuaranteesSection d={d} kind='received-guarantees' />
        <GuaranteesSection d={d} kind='issued-guarantees' />
      </>)}
    </div>
  );
}
