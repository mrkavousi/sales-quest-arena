import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRoute } from './router';
import { isTribalEnabled } from './tribal/feature';

afterEach(() => vi.unstubAllEnvs());

describe('additive Tribal route and presentation gate', () => {
  it('is off unless explicitly enabled and preserves the old unknown-route fallback', () => {
    for (const value of [undefined, '', 'false', 'TRUE', '1']) {
      vi.stubEnv('VITE_TRIBAL_ENABLED', value);
      expect(isTribalEnabled()).toBe(false);
      expect(parseRoute('#/tribal')).toEqual({ name: 'arena', param: null });
    }
  });

  it('reserves the gated namespace for the neutral overview, including unknown nested hashes', () => {
    vi.stubEnv('VITE_TRIBAL_ENABLED', 'true');
    expect(isTribalEnabled()).toBe(true);
    expect(parseRoute('#/tribal')).toEqual({ name: 'tribal', param: null });
    expect(parseRoute('#/tribal/')).toEqual({ name: 'tribal', param: null });
    expect(parseRoute('#/tribal/unknown/deeper')).toEqual({ name: 'tribal', param: 'unknown/deeper' });
    expect(parseRoute('#/tribal/%bad')).toEqual({ name: 'tribal', param: '%bad' });
  });

  it('preserves the existing routes and encoded mission/result IDs with either gate setting', () => {
    for (const flag of ['true', 'false']) {
      vi.stubEnv('VITE_TRIBAL_ENABLED', flag);
      expect(parseRoute('#/')).toEqual({ name: 'arena', param: null });
      for (const name of ['missions', 'history', 'profile'] as const) {
        expect(parseRoute(`#/${name}`)).toEqual({ name, param: null });
      }
      expect(parseRoute('#/play/customer-visit-challenge')).toEqual({ name: 'play', param: 'customer-visit-challenge' });
      expect(parseRoute('#/result/id%2Fwith%20space')).toEqual({ name: 'result', param: 'id/with space' });
      expect(parseRoute('#/unknown')).toEqual({ name: 'arena', param: null });
    }
  });
});
