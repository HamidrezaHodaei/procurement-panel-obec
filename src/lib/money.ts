import { toEnDigits, toFaDigits } from './jalali';

/**
 * Money helpers. Amounts are integers in minor units; `decimals` comes from the currency.
 * Parsing is string-based so no floating point error can leak into stored values.
 */

/** '1,250.50' / '۱٬۲۵۰٫۵۰' → 125050 (decimals = 2). Returns null for empty, NaN for invalid. */
export function parseMoneyToMinor(input: string | number | null | undefined, decimals: number): number | null {
  if (input === null || input === undefined) return null;
  let s = toEnDigits(String(input)).trim();
  if (s === '') return null;
  s = s.replace(/[,٬،\s]/g, '').replace(/٫/g, '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const [intPart, frac = ''] = s.split('.');
  if (frac.length > decimals && /[1-9]/.test(frac.slice(decimals))) return NaN; // would lose precision
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const minor = Number(intPart + fracPadded);
  return Number.isSafeInteger(minor) ? minor : NaN;
}

/** Plain editable string (latin digits, no grouping) for an input field. */
export function minorToInput(minor: number | null | undefined, decimals: number): string {
  if (minor === null || minor === undefined) return '';
  if (decimals === 0) return String(minor);
  const neg = minor < 0;
  const s = String(Math.abs(minor)).padStart(decimals + 1, '0');
  const intPart = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, '');
  return (neg ? '-' : '') + intPart + (frac ? `.${frac}` : '');
}

/** Display: grouped Persian digits, e.g. ۱٬۲۵۰٫۵۰ */
export function formatMoney(minor: number | null | undefined, decimals: number): string {
  if (minor === null || minor === undefined) return '—';
  const value = minor / 10 ** decimals;
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatMoneyWithCode(minor: number | null | undefined, c?: { code: string; decimals: number } | null) {
  if (minor === null || minor === undefined || !c) return '—';
  return `${formatMoney(minor, c.decimals)} ${c.code}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fa-IR').format(n);
}

/** Basis points → '۳۰٪' */
export function formatPercentBp(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return '—';
  const v = bp / 100;
  return toFaDigits(String(v)) + '٪';
}
