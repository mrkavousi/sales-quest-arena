import { daysBetween, toDateKey } from '../game/dates';
import { EN, FA, type MessageKey } from './messages';

export type Language = 'en' | 'fa';
export type MessageParams = Record<string, string | number>;
export const LANGUAGE_STORAGE_KEY = 'sales-quest-arena:language:v1';

const NUMBER_FORMATTERS: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', { useGrouping: false }),
  fa: new Intl.NumberFormat('fa-IR-u-nu-arabext', { useGrouping: false }),
};

/** A saved choice wins; otherwise use the first supported browser language, or English. */
export function resolveLanguage(stored: string | null, browserLanguages: readonly string[]): Language {
  if (stored === 'en' || stored === 'fa') return stored;
  for (const locale of browserLanguages) {
    const language = locale.toLowerCase().split('-')[0];
    if (language === 'fa' || language === 'en') return language;
  }
  return 'en';
}

export function formatNumber(language: Language, value: number): string {
  return NUMBER_FORMATTERS[language].format(value);
}

export function translate(language: Language, key: MessageKey, params: MessageParams = {}): string {
  const message: string = language === 'fa' ? FA[key] : EN[key];
  return message.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) return match;
    const value = params[name];
    return typeof value === 'number' ? formatNumber(language, value) : value;
  });
}

export function formatCountdown(language: Language, ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => formatNumber(language, n).padStart(2, language === 'fa' ? '۰' : '0');
  return hours > 0
    ? translate(language, 'countdown.hours', { hours, minutes: pad(minutes) })
    : translate(language, 'countdown.minutes', { minutes, seconds: pad(seconds) });
}

export function formatTime(language: Language, iso: string): string {
  return new Date(iso).toLocaleTimeString(language === 'fa' ? 'fa-IR-u-nu-arabext' : 'en', { hour: '2-digit', minute: '2-digit' });
}

/** Local calendar day comparison; older Persian dates use the Persian calendar. */
export function formatDayLabel(language: Language, iso: string, now: Date = new Date()): string {
  const diff = daysBetween(toDateKey(new Date(iso)), toDateKey(now));
  if (diff === 0) return translate(language, 'date.today');
  if (diff === 1) return translate(language, 'date.yesterday');
  return new Date(iso).toLocaleDateString(language === 'fa' ? 'fa-IR-u-ca-persian-nu-arabext' : 'en', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Accept physical number keys and Persian/Arabic numerals from localized keyboards. */
export function keyboardDigit(key: string): number {
  if (/^[0-9]$/.test(key)) return Number(key);
  const persian = '۰۱۲۳۴۵۶۷۸۹'.indexOf(key);
  if (key.length === 1 && persian >= 0) return persian;
  const arabic = '٠١٢٣٤٥٦٧٨٩'.indexOf(key);
  return key.length === 1 && arabic >= 0 ? arabic : NaN;
}
