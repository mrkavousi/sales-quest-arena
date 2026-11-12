import { describe, expect, it } from 'vitest';
import { loadProgress, saveProgress } from '../game/storage';
import { purchaseOffer, STORE_OFFERS } from '../game/store';
import { completeMission } from '../game/completeMission';
import { createInitialProgress } from '../game/progress';
import type { PlayerProgress } from '../game/types';

/**
 * Mirrors the local provider's commit path: a purchase returns a fully replaced
 * document that is written once and read back, exactly like `buyOffer` does.
 */
function commitLikeProvider(current: PlayerProgress, offerId: string): { saved: PlayerProgress; wrote: boolean } {
  const { progress } = purchaseOffer(current, offerId);
  const wrote = saveProgress(progress);
  const reloaded = loadProgress();
  if (!wrote || !reloaded.progress) return { saved: progress, wrote: false };
  return { saved: reloaded.progress, wrote: true };
}

function stubStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => void map.set(key, String(value)),
        removeItem: (key: string) => void map.delete(key),
        clear: () => map.clear(),
        key: (index: number) => [...map.keys()][index] ?? null,
        get length() { return map.size; },
      },
    },
    writable: true,
    configurable: true,
  });
  return map;
}

describe('local store persistence through the provider write path', () => {
  it('keeps a purchase and the debited balance across a simulated reload', () => {
    stubStorage();
    const offer = STORE_OFFERS[0];
    const start = { ...createInitialProgress(), coins: 100 };
    const first = commitLikeProvider(start, offer.id);
    expect(first.wrote).toBe(true);
    expect(first.saved.coins).toBe(100 - offer.price);

    // A second provider instance (fresh mount after reload) sees the same state.
    const reread = loadProgress().progress!;
    expect(reread.coins).toBe(100 - offer.price);
    expect(reread.store?.purchased).toEqual([offer.id]);
  });

  it('records mission completions on a purchased special after reload and re-spends nothing', () => {
    stubStorage();
    const offer = STORE_OFFERS[0];
    const owned = commitLikeProvider({ ...createInitialProgress(), coins: 100 }, offer.id).saved;

    const answers = { vip_topic: 'feedback', vip_outcome: 'loved_it', rating: 4 };
    const completed = completeMission(owned, offer.missionId, answers, new Date('2026-01-02T10:00:00Z')).progress;
    expect(saveProgress(completed)).toBe(true);

    const reread = loadProgress().progress!;
    // Completing a special pays its own coins and leaves the purchase record alone.
    expect(reread.missions[offer.missionId].completions).toBe(1);
    expect(reread.store?.purchased).toEqual([offer.id]);
    expect(reread.coins).toBe(100 - offer.price + 20);
    expect(reread.drafts[offer.missionId]).toBeUndefined();
  });
});
