import { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface CountOptions {
  /** Value to start from on first mount (defaults to the target, i.e. no animation). */
  from?: number;
  duration?: number;
  delay?: number;
}

/** Smoothly counts towards `value` whenever it changes. */
export function useAnimatedNumber(value: number, { from, duration = 900, delay = 0 }: CountOptions = {}): number {
  const [display, setDisplay] = useState(from ?? value);
  const current = useRef(display);

  useEffect(() => {
    const start = current.current;
    if (start === value) return;
    if (prefersReducedMotion()) {
      current.current = value;
      setDisplay(value);
      return;
    }
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / duration);
      const v = Math.round(start + (value - start) * easeOutCubic(k));
      current.current = v;
      setDisplay(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);

  return display;
}

/** Light haptic tick on devices that support it. */
export function buzz(pattern: number | number[] = 12): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported — ignore */
  }
}
