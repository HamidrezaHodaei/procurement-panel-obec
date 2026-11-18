'use client';

import * as React from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toEnDigits } from '@/lib/jalali';

/** Label + control + error, using the reference project's Field primitives. */
export function FormField({
  label, error, required, description, className, children
}: {
  label?: string; error?: string; required?: boolean; description?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <Field data-invalid={!!error || undefined} className={className}>
      {label && (
        <FieldLabel>
          {label}
          {required && <span className='text-destructive'> *</span>}
        </FieldLabel>
      )}
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

const NONE = '__none__';

export type Opt = { value: string | number; label: string; disabled?: boolean };

/** Select box bound to string|number ids. `clearable` adds an empty option. */
export function OptionSelect({
  value, onChange, options, placeholder = 'انتخاب کنید', clearable, disabled, invalid, className
}: {
  value: string | number | null | undefined;
  onChange: (v: string | null) => void;
  options: Opt[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const items: { value: string; label: string; disabled?: boolean }[] = [
    ...(clearable ? [{ value: NONE, label: '— بدون انتخاب —' }] : []),
    ...options.map((o) => ({ value: String(o.value), label: o.label, disabled: o.disabled }))
  ];
  const current = value === null || value === undefined || value === '' ? null : String(value);
  return (
    <Select
      items={items}
      value={current}
      disabled={disabled}
      onValueChange={(v) => onChange(v === NONE || v === null ? null : (v as string))}
    >
      <SelectTrigger className={cn('w-full', className)} aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Group the integer part with commas while typing; keeps the decimal part as typed. */
function groupAmount(raw: string, decimals: number): string {
  let s = toEnDigits(raw).replace(/[,٬،\s]/g, '').replace(/٫/g, '.').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  if (decimals === 0) s = s.replace(/\./g, '');
  let [i, f] = s.split('.');
  i = i.replace(/^0+(?=\d)/, '');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return f !== undefined ? `${grouped}.${f.slice(0, decimals)}` : grouped;
}

/** Amount input (latin digits, thousands separators). `decimals` comes from the chosen currency. */
export function MoneyInput({
  value, onChange, decimals = 0, placeholder, invalid, disabled
}: {
  value: string | null | undefined; onChange: (v: string) => void; decimals?: number; placeholder?: string; invalid?: boolean; disabled?: boolean;
}) {
  return (
    <Input
      dir='ltr'
      inputMode='decimal'
      className='text-end tabular-nums'
      value={value ? groupAmount(value, decimals) : ''}
      onChange={(e) => onChange(groupAmount(e.target.value, decimals))}
      placeholder={placeholder ?? (decimals ? `0.${'0'.repeat(decimals)}` : '0')}
      aria-invalid={invalid || undefined}
      disabled={disabled}
    />
  );
}

/** Small section heading used inside forms. */
export function FormSection({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h3 className='text-sm font-semibold'>{title}</h3>
        {description && <p className='text-muted-foreground text-xs'>{description}</p>}
      </div>
      {children}
    </section>
  );
}
