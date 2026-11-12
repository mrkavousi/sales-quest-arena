import { describe, expect, it } from 'vitest';
import { msUntilServerDayEnds } from '../game/dates';
import { formatServerDayLabel } from '../i18n/locale';

describe('server UTC day', () => {
  it('counts down to UTC midnight of the supplied date_key, then holds at zero', () => {
    expect(msUntilServerDayEnds('2026-11-12', Date.parse('2026-11-12T23:59:30Z'))).toBe(30_000);
    expect(msUntilServerDayEnds('2026-11-12', Date.parse('2026-11-13T01:00:00Z'))).toBe(0);
  });
  it('labels history relative to the server date rather than the device calendar', () => {
    expect(formatServerDayLabel('en', '2026-11-12', '2026-11-12')).toBe('Today');
    expect(formatServerDayLabel('en', '2026-11-11', '2026-11-12')).toBe('Yesterday');
    expect(formatServerDayLabel('fa', '2026-11-12', '2026-11-12')).toBe('امروز');
  });
});
