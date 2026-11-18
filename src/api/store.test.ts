import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../game/achievements';
import { GAME_CONFIG } from '../game/config';
import { CATEGORIES, DIFFICULTY } from '../game/missions';
import { createInitialProgress } from '../game/progress';
import { apiErrorKey, definitelyNotSubmitted } from './errors';
import { GameApiError, getBootstrap, getStore, postPurchase, SUPPORTED_CONTENT_VERSION } from './game';

const asJson = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const offers = (purchased: string[] = []) => [
  { id: 'special-market-insight', title: 'Market Insight Mission', description: 'd', price_coins: 40, mission_id: 'market-insight-special', mission_title: 'Market Insight: Special Challenge', purchased: purchased.includes('special-market-insight') },
  { id: 'special-sales-strategy', title: 'Sales Strategy Mission', description: 'd', price_coins: 60, mission_id: 'sales-strategy-special', mission_title: 'Sales Strategy: Special Challenge', purchased: purchased.includes('special-sales-strategy') },
];
const store = (over: Record<string, unknown> = {}) => ({ store_version: 'demo-store-v1', is_demo: true, currency: 'game_coins', coin_balance: 70, offers: offers(), ...over });
const receipt = (over: Record<string, unknown> = {}) => ({
  purchase_id: 'p-1', offer_id: 'special-market-insight', mission_id: 'market-insight-special', price_coins: 40, coin_balance: 30, purchased_at: '2026-11-18T10:00:00+00:00', replayed: false, ...over,
});

describe('server demo store client', () => {
  beforeEach(() => vi.stubGlobal('window', { setTimeout, clearTimeout }));
  afterEach(() => vi.unstubAllGlobals());

  it('reads offers, prices, ownership and the coin balance from the backend', async () => {
    const fetcher = vi.fn(async () => asJson(store({ offers: offers(['special-market-insight']) })));
    vi.stubGlobal('fetch', fetcher);
    const data = await getStore();
    expect(data.coin_balance).toBe(70);
    expect(data.offers.map((offer) => [offer.id, offer.price_coins, offer.purchased])).toEqual([
      ['special-market-insight', 40, true], ['special-sales-strategy', 60, false],
    ]);
    const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/game/store');
    expect(options).toMatchObject({ credentials: 'same-origin', cache: 'no-store' });
  });

  it('rejects a store that is not game-coin based or is malformed', async () => {
    for (const bad of [store({ currency: 'usd' }), store({ is_demo: false }), store({ coin_balance: -1 }), store({ offers: [{ ...offers()[0], price_coins: 4.5 }] }), store({ offers: [{ ...offers()[0], purchased: 'yes' }] })]) {
      vi.stubGlobal('fetch', vi.fn(async () => asJson(bad)));
      await expect(getStore()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });

  it('purchases with the CSRF token, an Idempotency-Key and only the offer id in the body', async () => {
    const fetcher = vi.fn(async () => asJson(receipt()));
    vi.stubGlobal('fetch', fetcher);
    const result = await postPurchase('csrf-1', 'special-market-insight', 'buy-key-1');
    expect(result).toMatchObject({ coin_balance: 30, replayed: false, mission_id: 'market-insight-special' });
    const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/game/store/purchases');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1', 'Idempotency-Key': 'buy-key-1', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(options.body))).toEqual({ offer_id: 'special-market-insight' });
  });

  it('recognizes a replayed purchase and rejects a receipt for another offer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => asJson(receipt({ replayed: true }))));
    expect((await postPurchase('c', 'special-market-insight', 'k')).replayed).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => asJson(receipt({ offer_id: 'special-sales-strategy' }))));
    await expect(postPurchase('c', 'special-market-insight', 'k')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('surfaces insufficient-coin and duplicate-purchase errors with their own messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'INSUFFICIENT_GAME_COINS', message: 'no' } }, 409)));
    const insufficient = await postPurchase('c', 'special-sales-strategy', 'k').catch((error: unknown) => error);
    expect(insufficient).toBeInstanceOf(GameApiError);
    expect(apiErrorKey(insufficient)).toBe('store.error.insufficient_coins');
    expect(definitelyNotSubmitted(insufficient)).toBe(true); // the key can be dropped: nothing was charged

    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'OFFER_ALREADY_PURCHASED', message: 'dup' } }, 409)));
    const duplicate = await postPurchase('c', 'special-market-insight', 'k2').catch((error: unknown) => error);
    expect(apiErrorKey(duplicate)).toBe('store.error.already_purchased');

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const offline = await postPurchase('c', 'special-market-insight', 'k3').catch((error: unknown) => error);
    expect(offline).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(definitelyNotSubmitted(offline)).toBe(false); // ambiguous: the same key must be reused on retry
  });

  it('accepts special_missions in the bootstrap and rejects malformed ones', async () => {
    const progress = { ...createInitialProgress(new Date('2026-11-18T10:00:00Z')), daily: null };
    const boot = (special: unknown) => ({
      api_version: '2', content_version: SUPPORTED_CONTENT_VERSION, server_time: '2026-11-18T10:00:00.000Z', date_key: '2026-11-18',
      csrf_token: 'c', player: { id: 'u', account_name: 'A', role: 'visitor' }, game_config: GAME_CONFIG, categories: CATEGORIES,
      difficulty: DIFFICULTY, missions: [], special_missions: special, achievements_catalog: ACHIEVEMENTS, progress,
    });
    vi.stubGlobal('fetch', vi.fn(async () => asJson(boot([]))));
    expect((await getBootstrap()).special_missions).toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => asJson(boot([{ id: 'x' }]))));
    await expect(getBootstrap()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
