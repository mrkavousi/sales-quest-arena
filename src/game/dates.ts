import { n } from '../i18n';
const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day key, e.g. "2026-11-12". */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / 86_400_000);
}

export function msUntilMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${n(h)} ساعت و ${n(m)} دقیقه` : `${n(m)} دقیقه و ${n(s)} ثانیه`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

/** "Today", "Yesterday" or a short date. */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const key = toDateKey(new Date(iso));
  const diff = daysBetween(key, toDateKey(now));
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  return new Date(iso).toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long', month: 'long', day: 'numeric' });
}
