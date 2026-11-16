/** Persian presentation helpers: Persian digits, Jalali dates, money in millions of Rials. */

const numberFormat = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
const dateOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const monthOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' });

/** 1234.5 → ۱٬۲۳۴٫۵ (null → —). */
export function n(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : numberFormat.format(value);
}

export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${numberFormat.format(value)}٪`;
}

/** Sample amounts are Rials; show millions to stay readable. */
export function money(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${numberFormat.format(value / 1_000_000)} میلیون`;
  return numberFormat.format(value);
}

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Jalali date, for example ۲۵ آبان ۱۴۰۵. */
export function jdate(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? dateOnly.format(date) : '—';
}

/** Jalali date with time. */
export function jdateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? dateTime.format(date) : '—';
}

/** "2026-11" → آبان ۱۴۰۵ (the sample period). */
export function jperiod(period: string | null | undefined): string {
  if (!period) return '—';
  const date = parse(`${period}-15`);
  return date ? monthOnly.format(date) : period;
}

export const BRAND_FA: Record<string, string> = { EFES: 'افس', MATADOR: 'ماتادور', UNASSIGNED: 'نامشخص' };
export const brandName = (code: string): string => BRAND_FA[code] ?? code;

export const STATUS_FA: Record<string, string> = {
  validated: 'اعتبارسنجی‌شده',
  processing: 'در حال پردازش',
  completed: 'تکمیل‌شده',
  rejected: 'ردشده',
  failed: 'ناموفق',
  uploaded: 'بارگذاری‌شده',
  sample: 'نمونه',
  imported: 'واردشده',
  valid: 'معتبر',
  pending: 'در انتظار',
  processed: 'پردازش‌شده',
  duplicate: 'تکراری',
};
export const statusName = (status: string): string => STATUS_FA[status] ?? status;

export const POSITION_FA: Record<string, string> = {
  admin: 'مدیر کل',
  management: 'مدیر کل',
  branch_manager: 'مدیر شعبه',
  supervisor: 'سرپرست فروش',
  rep: 'ویزیتور',
  staff: 'کارمند',
};

export const BRANCH_FA: Record<string, string> = { 'BR-TEH': 'شعبه تهران', 'BR-ISF': 'شعبه اصفهان' };
export const branchLabel = (code: string | null | undefined, name?: string | null): string => (code && BRANCH_FA[code]) || name || code || '—';
