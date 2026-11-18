import { toJalaali, toGregorian, isValidJalaaliDate, jalaaliMonthLength } from 'jalaali-js';

/** Client + server safe Jalali (Shamsi) helpers. Storage format is Gregorian ISO (YYYY-MM-DD). */

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']; // Saturday first

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

export function toFaDigits(v: string | number): string {
  return String(v).replace(/\d/g, (d) => FA[Number(d)]);
}

/** Persian/Arabic digits → latin digits. */
export function toEnDigits(v: string): string {
  return v
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

const pad = (n: number) => String(n).padStart(2, '0');

export type JDate = { jy: number; jm: number; jd: number };

export function isoToJalali(iso: string | null | undefined): JDate | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const { jy, jm, jd } = toJalaali(+m[1], +m[2], +m[3]);
  return { jy, jm, jd };
}

export function jalaliToIso(jy: number, jm: number, jd: number): string | null {
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
}

export function jalaliMonthLength(jy: number, jm: number) {
  return jalaaliMonthLength(jy, jm);
}

/** '2026-03-21' → '۱۴۰۵/۰۱/۰۱' (or latin digits when persianDigits = false). */
export function formatJalali(iso: string | null | undefined, persianDigits = true): string {
  const j = isoToJalali(iso);
  if (!j) return '';
  const s = `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
  return persianDigits ? toFaDigits(s) : s;
}

/** Parses '1405/01/15' (any digits, separators / - .) → ISO, or null. */
export function parseJalaliInput(text: string): string | null {
  const m = /^\s*(\d{4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*$/.exec(toEnDigits(text));
  if (!m) return null;
  return jalaliToIso(+m[1], +m[2], +m[3]);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days between two ISO dates (b − a). */
export function diffDays(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
    Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

/** Jalali 'YYYY/MM' bucket key for a Gregorian ISO date. */
export function jalaliMonthKey(iso: string): string {
  const j = isoToJalali(iso);
  return j ? `${j.jy}/${pad(j.jm)}` : '';
}

export function jalaliMonthLabel(key: string): string {
  const [y, m] = key.split('/').map(Number);
  return `${JALALI_MONTHS[m - 1]} ${toFaDigits(y)}`;
}

/** 'YYYY-MM-DD HH:MM:SS' (UTC, sqlite) → Jalali date + local time. */
export function formatJalaliDateTime(sqliteUtc: string | null | undefined): string {
  if (!sqliteUtc) return '';
  const d = new Date(sqliteUtc.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return sqliteUtc;
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return toFaDigits(`${formatJalali(iso, false)} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
}
