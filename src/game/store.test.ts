import { describe, expect, it } from 'vitest';
import { completeMission } from './completeMission';
import { CATEGORIES, getMission, MISSIONS } from './missions';
import { createInitialProgress } from './progress';
import {
  canAfford,
  getPurchased,
  getSpecialMissionViews,
  getUnlockedSpecialMissions,
  isSpecialMissionId,
  isSpecialUnlocked,
  purchaseOffer,
  SPECIAL_MISSIONS,
  STORE_OFFERS,
  StoreError,
} from './store';
import { loadProgress, normalizeProgress, saveProgress, STORAGE_KEY } from './storage';
import type { Answers, PlayerProgress } from './types';

const VIP = STORE_OFFERS[0];
const MIDNIGHT = STORE_OFFERS[1];

/** Progress with enough coins and the first mission done, so specials are playable. */
function rich(coins = 100): PlayerProgress {
  const base = createInitialProgress();
  return { ...base, player: { ...base.player, onboarded: true }, coins };
}

const answers: Answers = { vip_topic: 'loyalty_offer', vip_outcome: 'big_order', rating: 5 };

/** Minimal in-memory localStorage, matching the pattern used by other unit tests. */
function stubStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() { return map.size; },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    writable: true,
    configurable: true,
  });
  return map;
}

describe('store catalog', () => {
  it('keeps exactly two demo offers and six built-in missions', () => {
    expect(STORE_OFFERS).toHaveLength(2);
    expect(MISSIONS).toHaveLength(6);
    for (const offer of STORE_OFFERS) {
      expect(offer.demo).toBe(true);
      expect(offer.price).toBeGreaterThan(0);
      // A store special never overlaps the six-mission island.
      expect(getMission(offer.missionId)).toBeUndefined();
      expect(SPECIAL_MISSIONS.some((mission) => mission.id === offer.missionId)).toBe(true);
    }
  });

  it('does not list specials among the six mission ids or categories', () => {
    const ids = new Set(MISSIONS.map((mission) => mission.id));
    for (const mission of SPECIAL_MISSIONS) {
      expect(ids.has(mission.id)).toBe(false);
      expect(isSpecialMissionId(mission.id)).toBe(true);
      expect(CATEGORIES[mission.category]).toBeTruthy();
    }
    expect(isSpecialMissionId('vip-lounge-pass')).toBe(false);
    expect(getMission('vip-lounge')).toBeUndefined();
  });
});

describe('purchaseOffer', () => {
  it('debits the price once and unlocks only the bought mission', () => {
    const before = rich(100);
    const { progress, pricePaid, coinsBefore, coinsAfter } = purchaseOffer(before, VIP.id);

    expect(pricePaid).toBe(VIP.price);
    expect(coinsBefore).toBe(100);
    expect(coinsAfter).toBe(100 - VIP.price);
    expect(progress.coins).toBe(coinsAfter);
    expect(getPurchased(progress)).toEqual([VIP.id]);
    expect(isSpecialUnlocked(progress, VIP.missionId)).toBe(true);
    expect(isSpecialUnlocked(progress, MIDNIGHT.missionId)).toBe(false);
    expect(getUnlockedSpecialMissions(progress).map((mission) => mission.id)).toEqual([VIP.missionId]);
    // The source document is untouched: the purchase is one atomic replacement.
    expect(before.coins).toBe(100);
    expect(before.store).toEqual({ purchased: [] });
  });

  it('rejects an insufficient balance without changing anything', () => {
    const before = rich(VIP.price - 1);
    expect(() => purchaseOffer(before, VIP.id)).toThrow(StoreError);
    try {
      purchaseOffer(before, VIP.id);
    } catch (error) {
      expect((error as StoreError).code).toBe('insufficient_coins');
    }
    expect(before.coins).toBe(VIP.price - 1);
    expect(before.store).toEqual({ purchased: [] });
    expect(canAfford(before, VIP)).toBe(false);
    expect(canAfford({ ...before, coins: VIP.price }, VIP)).toBe(true);
  });

  it('never charges twice for the same offer', () => {
    const first = purchaseOffer(rich(100), VIP.id).progress;
    expect(() => purchaseOffer(first, VIP.id)).toThrow(StoreError);
    try {
      purchaseOffer(first, VIP.id);
    } catch (error) {
      expect((error as StoreError).code).toBe('already_purchased');
    }
    expect(first.coins).toBe(100 - VIP.price);
    expect(getPurchased(first)).toEqual([VIP.id]);
    expect(canAfford(first, VIP)).toBe(false);
  });

  it('rejects unknown offers and can buy both offers in sequence', () => {
    try {
      purchaseOffer(rich(100), 'free-coins');
    } catch (error) {
      expect((error as StoreError).code).toBe('unknown_offer');
    }
    let progress = rich(100);
    progress = purchaseOffer(progress, VIP.id).progress;
    progress = purchaseOffer(progress, MIDNIGHT.id).progress;
    expect(getPurchased(progress)).toEqual([VIP.id, MIDNIGHT.id]);
    expect(progress.coins).toBe(100 - VIP.price - MIDNIGHT.price);
    expect(getSpecialMissionViews(progress).map((view) => view.id)).toEqual([VIP.missionId, MIDNIGHT.missionId]);
  });

  it('leaves the six-mission views untouched after a purchase', () => {
    const progress = purchaseOffer(rich(100), VIP.id).progress;
    const statuses = Object.fromEntries(MISSIONS.map((mission) => [mission.id, progress.missions[mission.id]?.completions ?? 0]));
    expect(statuses).toEqual(Object.fromEntries(MISSIONS.map((mission) => [mission.id, 0])));
    expect(SPECIAL_MISSIONS.every((mission) => getMission(mission.id) === undefined)).toBe(true);
  });
});

describe('special missions', () => {
  it('can only be completed after the matching purchase', () => {
    expect(() => completeMission(rich(100), VIP.missionId, answers, new Date('2026-01-01T09:00:00Z'))).toThrow(/Unknown mission/);

    const owned = purchaseOffer(rich(100), VIP.id).progress;
    const { progress, entry } = completeMission(owned, VIP.missionId, answers, new Date('2026-01-01T09:00:00Z'));
    expect(entry.missionId).toBe(VIP.missionId);
    expect(entry.rewards.coins).toBe(20);
    expect(progress.missions[VIP.missionId].completions).toBe(1);
    // Buying then playing must not have shrunk or reset the purchase record.
    expect(getPurchased(progress)).toEqual([VIP.id]);
  });

  it('marks purchased specials in their own view list only', () => {
    const progress = purchaseOffer(rich(100), MIDNIGHT.id).progress;
    const views = getSpecialMissionViews(progress);
    expect(views.map((view) => view.id)).toEqual([MIDNIGHT.missionId]);
    expect(views[0].status).toBe('available');
    expect(views[0].isDaily).toBe(false);
    expect(getSpecialMissionViews(rich(100))).toEqual([]);
  });
});

describe('legacy saves', () => {
  it('normalizes a v1 save without a store section and keeps every value', () => {
    const legacy = { ...rich(60) } as Partial<PlayerProgress>;
    delete legacy.store;
    const normalized = normalizeProgress(JSON.parse(JSON.stringify(legacy)));
    expect(normalized).not.toBeNull();
    expect(normalized!.coins).toBe(60);
    expect(normalized!.xp).toBe(legacy.xp);
    expect(normalized!.player).toEqual(legacy.player);
    expect(normalized!.store).toEqual({ purchased: [] });
    expect(getPurchased(normalized!)).toEqual([]);
  });

  it('loads a pre-store save from localStorage unchanged, then persists purchases', () => {
    stubStorage();
    const legacy = { ...rich(80) };
    delete legacy.store;
    expect(saveProgress(legacy as PlayerProgress)).toBe(true);

    const loaded = loadProgress();
    expect(loaded.status).toBe('loaded');
    const legacyLoaded = loaded.progress!;
    expect(legacyLoaded.coins).toBe(80);
    expect(getPurchased(legacyLoaded)).toEqual([]);

    // Persist a purchase, then reload as the app would on a fresh page load.
    const { progress } = purchaseOffer(legacyLoaded, VIP.id);
    expect(saveProgress(progress)).toBe(true);
    const reloaded = loadProgress().progress!;
    expect(reloaded.coins).toBe(80 - VIP.price);
    expect(getPurchased(reloaded)).toEqual([VIP.id]);
    expect(isSpecialUnlocked(reloaded, VIP.missionId)).toBe(true);
    expect(normalizeProgress(reloaded)).toEqual(reloaded);
  });

  it('drops unknown or repeated store ids instead of widening access', () => {
    const raw = { ...rich(0), store: { purchased: [VIP.id, 'free-coins', VIP.id, MIDNIGHT.id, 7] } };
    const normalized = normalizeProgress(JSON.parse(JSON.stringify(raw)));
    expect(normalized!.store!.purchased).toEqual([VIP.id, MIDNIGHT.id]);
    // Coins are never minted by normalization, even though access was filtered.
    expect(normalized!.coins).toBe(0);
  });

  it('writes purchases under the versioned key so older builds ignore them safely', () => {
    const map = stubStorage();
    expect(saveProgress(purchaseOffer(rich(100), VIP.id).progress)).toBe(true);
    const stored = JSON.parse(map.get(STORAGE_KEY)!);
    expect(stored.version).toBe(1);
    expect(stored.store.purchased).toEqual([VIP.id]);
    // Older builds only read the fields they know about; the extra section is inert.
    expect(stored.missions).toEqual({});
  });
});

describe('stored document shape', () => {
  it('keeps purchases inside the versioned v1 document and ignores unrelated keys', () => {
    stubStorage();
    const saved = purchaseOffer(rich(100), VIP.id).progress;
    expect(saveProgress(saved)).toBe(true);
    expect(loadProgress().status).toBe('loaded');
    expect(loadProgress().progress!.version).toBe(1);
    // The document stays a superset of what older readers expect.
    expect(Object.keys(saved)).toEqual(expect.arrayContaining(['version', 'player', 'coins', 'missions', 'drafts', 'history', 'store']));
  });

  it('refuses to reset a save written by a newer format', () => {
    const map = stubStorage();
    map.set(STORAGE_KEY, JSON.stringify({ ...rich(10), version: 2 }));
    const loaded = loadProgress();
    expect(loaded.status).toBe('corrupt');
    expect(loaded.progress).toBeNull();
  });
});
