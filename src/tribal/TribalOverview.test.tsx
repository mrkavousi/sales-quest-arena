import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRoute } from '../router';
import { TribalOverview } from './TribalOverview';
import { isTribalEnabled } from './feature';
import type { TribalOverviewView, TribalUnitView } from './view';

// Fixtures live only in this test file; the production shell never imports them.
const player = {
  id: 'test-player',
  name: 'SQA_TEST_ONLY_PRIVATE_PLAYER',
  avatar: { src: '/SQA_TEST_ONLY_PRIVATE_AVATAR.png' },
  points: 987654,
  rank: 12345,
};

function deepUnit(level: number): TribalUnitView {
  return {
    id: `unit-${level}`,
    label: `Test unit ${level}`,
    ...(level > 0 ? { children: [deepUnit(level - 1)] } : { players: [player] }),
  };
}

const view: TribalOverviewView = {
  units: [deepUnit(7), { id: 'second', label: 'Second test unit', children: [] }, { id: 'third', label: 'Third test unit' }],
  visibility: { name: true, avatar: true, points: true, rank: true },
};

const render = (data: TribalOverviewView | null, language: 'en' | 'fa' = 'en') =>
  renderToStaticMarkup(<TribalOverview view={data} language={language} />);

describe('Tribal overview presentation boundary', () => {
  beforeEach(() => vi.stubEnv('VITE_TRIBAL_ENABLED', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  it('renders supplied units recursively without fixed types, depths or counts', () => {
    expect(isTribalEnabled()).toBe(true);
    expect(parseRoute('#/tribal').name).toBe('tribal');
    const html = render(view);
    for (let level = 0; level <= 7; level += 1) expect(html).toContain(`Test unit ${level}`);
    expect(html).toContain('Second test unit');
    expect(html).toContain('Third test unit');
    expect(html).toContain(player.name);
    expect(html).toContain(player.avatar.src);
    expect(html).toContain('987654');
    expect(html).toContain('12345');
    expect(render({ units: [] })).toContain('No organization information is available.');
  });

  it('never renders values for fields that are false or missing in the policy', () => {
    const hidden = render({ ...view, visibility: { name: false, avatar: false, points: false, rank: false } });
    const unspecified = render({ ...view, visibility: undefined });
    for (const html of [hidden, unspecified]) {
      expect(html).not.toContain(player.name);
      expect(html).not.toContain(player.avatar.src);
      expect(html).not.toContain('987654');
      expect(html).not.toContain('12345');
      expect(html).not.toContain('tribal-player');
    }
    const partial = render({ ...view, visibility: { name: true, rank: true } });
    expect(partial).toContain(player.name);
    expect(partial).toContain('12345');
    expect(partial).not.toContain(player.avatar.src);
    expect(partial).not.toContain('987654');
  });

  it('localizes supplied labels and numbers without changing the values', () => {
    const html = render(view, 'fa');
    expect(html).toContain('سازمان');
    expect(html).toContain('۹۸۷۶۵۴');
    expect(html).toContain('۱۲۳۴۵');
    expect(html).toContain(`<bdi>${player.name}</bdi>`);
    expect(player.points).toBe(987654);
  });

  it('has a neutral unavailable state and makes no network request', () => {
    const request = vi.spyOn(globalThis, 'fetch');
    try {
      const html = render(null);
      expect(html).toContain('Not connected');
      expect(html).toContain('role="status"');
      expect(html).not.toContain(player.name);
      expect(html).not.toContain('987654');
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });
});
