import type { ReactNode } from 'react';

/** Exact decimal strings -> readable numbers (display only; the API keeps full precision). */
export function fmt(value: string | number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: digits }) : String(value);
}

export function fmtPct(ratio: string | null | undefined): string {
  if (ratio === null || ratio === undefined) return '—';
  return `${(Number(ratio) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

type Tone = 'confirmed' | 'proposed' | 'unconfirmed' | 'warning' | 'error' | 'explained' | 'info';

const LABELS: Record<string, [Tone, string]> = {
  CONFIRMED: ['confirmed', 'Confirmed'],
  PROPOSED: ['proposed', 'Proposed'],
  UNCONFIRMED: ['unconfirmed', 'Unconfirmed'],
  ASSUMPTION: ['unconfirmed', 'Assumption'],
  OPEN: ['unconfirmed', 'Open'],
  match: ['confirmed', 'Match'],
  explained: ['explained', 'Explained difference'],
  warning: ['warning', 'Reconciliation warning'],
  error: ['error', 'Reconciliation error'],
  confirmed: ['confirmed', 'Confirmed'],
  validated: ['info', 'Validated'],
  inspected: ['info', 'Inspected'],
  failed: ['error', 'Failed'],
  calc_error: ['error', 'Calculation error'],
  ok: ['info', 'Calculated'],
  synthetic: ['proposed', 'SYNTHETIC data'],
  real: ['info', 'REAL data · pseudonymised'],
};

/** One consistent vocabulary: Confirmed / Proposed / Unconfirmed / Reconciliation warning / Calculation error. */
export function Badge({ status, label, title }: { status: string; label?: string; title?: string }) {
  const [tone, text] = LABELS[status] ?? ['info', status];
  return (
    <span className={`ri-badge ri-badge--${tone}`} title={title}>
      {label ?? text}
    </span>
  );
}

export function Legend({ legend }: { legend: Record<string, string> }) {
  const items: [string, string][] = [
    ['CONFIRMED', legend.confirmed],
    ['PROPOSED', legend.proposed],
    ['UNCONFIRMED', legend.unconfirmed],
    ['warning', legend.reconciliation_warning],
    ['calc_error', legend.calculation_error],
  ];
  return (
    <ul className="ri-legend" aria-label="Status legend">
      {items.map(([key, text]) => (
        <li key={key}>
          <Badge status={key} /> <small>{text}</small>
        </li>
      ))}
    </ul>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="k-demo" role="note">
      <b>PROTOTYPE</b>
      <span>{children}</span>
    </div>
  );
}
