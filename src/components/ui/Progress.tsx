import type { CSSProperties, ReactNode } from 'react';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  tone?: 'yellow' | 'green' | 'blue' | 'white';
  size?: 'sm' | 'md' | 'lg';
  /** Disable the width transition (used to "snap" the bar on level-up). */
  instant?: boolean;
  label?: string;
}

export function ProgressBar({ value, tone = 'yellow', size = 'md', instant = false, label }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`bar bar--${tone} bar--${size}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className={`bar__fill${instant ? ' is-instant' : ''}`} style={{ width: `${pct}%` }}>
        <span className="bar__shine" />
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({ value, size, stroke = 6, color = 'var(--yellow)', track = 'rgba(255,255,255,.25)', children, className }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <div className={`ring ${className ?? ''}`} style={{ width: size, height: size } as CSSProperties}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__content">{children}</div>
    </div>
  );
}
