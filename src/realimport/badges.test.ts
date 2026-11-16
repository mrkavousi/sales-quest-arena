import { describe, expect, it } from 'vitest';
import { fmt, fmtPct } from './badges';

describe('real-import display helpers', () => {
  it('formats exact decimal strings without losing sign or fractions', () => {
    expect(fmt('112244.5833333333332999')).toBe('112,244.583');
    expect(fmt('-2')).toBe('-2');
    expect(fmt('2280000000', 0)).toBe('2,280,000,000');
    expect(fmt(null)).toBe('—');
    expect(fmt('')).toBe('—');
  });

  it('shows achievement as a percentage and never invents a value', () => {
    expect(fmtPct('1.160229')).toBe('116%');
    expect(fmtPct('0.97')).toBe('97%');
    expect(fmtPct(null)).toBe('—');
  });
});
