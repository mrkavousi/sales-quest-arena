import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { OriginCounts } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';

/* ------------------------------------------------------------------ data hook */

export interface Remote<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** GET a JSON resource; re-fetches when `path` changes. Errors are shown, never swallowed. */
export function useApi<T>(path: string | null): Remote<T> {
  const { t } = useLanguage();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then((result) => alive && setData(result))
      .catch((err: unknown) => alive && setError(err instanceof ApiError ? err.message : t('k.loadError')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // `t` changes with the language; the request itself does not depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, reload };
}

/* ------------------------------------------------------------------ formatting */

/** Amounts are Rials in the sample workbook; show millions to stay readable. */
export function formatMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  return value.toLocaleString('en-US');
}

export function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export const BRAND_COLORS: Record<string, string> = { EFES: '#5b3df5', MATADOR: '#e8741a', UNASSIGNED: '#9a93c2' };
export const brandColor = (code: string): string => BRAND_COLORS[code] ?? '#2ea8ff';

const STATUS_KEYS: Record<string, MessageKey> = {
  completed: 'k.status.completed',
  processed: 'k.status.processed',
  pending: 'k.status.pending',
  valid: 'k.status.valid',
  rejected: 'k.status.rejected',
  duplicate: 'k.status.duplicate',
  failed: 'k.status.failed',
  approved: 'k.status.approved',
  submitted: 'k.status.submitted',
};

/* ------------------------------------------------------------------ small widgets */

export function DemoBanner({ notice }: { notice?: string }) {
  const { t } = useLanguage();
  return (
    <div className="k-demo" role="note">
      <b>{t('k.demoBadge')}</b>
      <span>{notice ?? t('k.demoNotice')}</span>
    </div>
  );
}

export function OriginChips({ origin }: { origin?: OriginCounts }) {
  const { t } = useLanguage();
  if (!origin) return null;
  const sample = origin.sample ?? 0;
  const imported = origin.imported ?? 0;
  return (
    <span className="k-origin">
      {sample > 0 && (
        <span className="k-chip k-chip--sample" title={t('k.sampleRowsTitle')}>
          {t('k.sampleRows', { count: sample })}
        </span>
      )}
      {imported > 0 && (
        <span className="k-chip k-chip--real" title={t('k.importedRowsTitle')}>
          {t('k.importedRows', { count: imported })}
        </span>
      )}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const { t } = useLanguage();
  const key = STATUS_KEYS[status];
  return <span className={`k-chip k-chip--${status}`}>{key ? t(key) : status.replace('_', ' ')}</span>;
}

export function Tile({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className={`k-tile${tone ? ` k-tile--${tone}` : ''}`}>
      <span className="k-tile__label">{label}</span>
      <b className="k-tile__value">{value}</b>
      {sub && <span className="k-tile__sub">{sub}</span>}
    </div>
  );
}

/** Attainment is always shown as text too, never colour alone. `label` is already translated by the caller. */
export function AttainmentBar({ pct, label }: { pct: number | null; label?: string }) {
  const { t } = useLanguage();
  const width = Math.max(0, Math.min(pct ?? 0, 120));
  const tone = pct === null ? 'none' : pct >= 100 ? 'good' : pct >= 80 ? 'ok' : pct >= 60 ? 'warn' : 'bad';
  return (
    <span className="k-att" role="img" aria-label={t('k.att.aria', { label: label ?? t('k.attainment'), pct: formatPct(pct) })}>
      <span className="k-att__track">
        <span className={`k-att__fill k-att__fill--${tone}`} style={{ width: `${(width / 120) * 100}%` }} />
        <span className="k-att__mark" />
      </span>
      <b>{formatPct(pct)}</b>
    </span>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`k-card${className ? ` ${className}` : ''}`}>
      {(title || action) && (
        <header className="k-card__head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Loading() {
  const { t } = useLanguage();
  return (
    <div className="k-state" role="status">
      <span className="boot__spinner" aria-hidden="true" />
      <p>{t('k.loading')}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="k-state k-state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn--ghost btn--sm" onClick={onRetry}>
          {t('k.retry')}
        </button>
      )}
    </div>
  );
}

export function Remoted<T>({ remote, children }: { remote: Remote<T>; children: (data: T) => ReactNode }) {
  if (remote.error && !remote.data) return <ErrorState message={remote.error} onRetry={remote.reload} />;
  if (!remote.data) return <Loading />;
  return (
    <>
      {remote.error && <ErrorState message={remote.error} onRetry={remote.reload} />}
      {children(remote.data)}
    </>
  );
}

/** Stacked daily-sales columns for one rep (inline SVG, brand colours + legend + totals). */
export function DailyChart({ days, brands }: { days: { date: string; amount: number; by_brand: Record<string, number> }[]; brands: string[] }) {
  const { t } = useLanguage();
  if (days.length === 0) return <p className="k-muted">{t('k.empty.noSalesPeriod')}</p>;
  const width = 640;
  const height = 180;
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const max = Math.max(...days.map((d) => d.amount), 1);
  const slot = (width - pad.l - pad.r) / days.length;
  const barW = Math.min(36, slot * 0.7);
  return (
    <figure className="k-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('k.dc.aria', { count: days.length })}>
        <line x1={pad.l} x2={width - pad.r} y1={height - pad.b} y2={height - pad.b} stroke="var(--line)" />
        {days.map((day, i) => {
          let y = height - pad.b;
          const x = pad.l + i * slot + (slot - barW) / 2;
          return (
            <g key={day.date}>
              <title>{t('k.dc.tooltip', { date: day.date, amount: formatMoney(day.amount) })}</title>
              {brands.map((brand) => {
                const value = day.by_brand[brand] ?? 0;
                const h = (value / max) * (height - pad.t - pad.b);
                y -= h;
                return h > 0 ? <rect key={brand} x={x} y={y} width={barW} height={h} rx={3} fill={brandColor(brand)} /> : null;
              })}
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
                {day.date.slice(8)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {brands.map((b) => (
          <span key={b} className="k-legend">
            <i style={{ background: brandColor(b) }} />
            {b}
          </span>
        ))}
        <span className="k-muted">{t('k.dc.caption', { amount: formatMoney(max) })}</span>
      </figcaption>
    </figure>
  );
}
