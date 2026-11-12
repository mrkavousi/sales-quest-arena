import { createInitialProgress, AVATAR_IDS } from './progress';
import { STORE_OFFERS } from './store';
import type { PlayerProgress, StoreState } from './types';

/**
 * Device-only persistence. Server mode uses a separate async BFF client and
 * never uploads this progress document or treats its rewards as authoritative.
 *
 * Rule: never pretend a save worked. Every write is read back and verified.
 */
export const STORAGE_KEY = 'sales-quest-arena:progress:v1';

export type LoadStatus = 'loaded' | 'empty' | 'unavailable' | 'corrupt';

export function isStorageAvailable(): boolean {
  try {
    const probe = '__sqa_probe__';
    window.localStorage.setItem(probe, '1');
    const ok = window.localStorage.getItem(probe) === '1';
    window.localStorage.removeItem(probe);
    return ok;
  } catch {
    return false;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const toInt = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback);

/** Keeps only offers this build knows about, de-duplicated, so a save never widens access. */
export function normalizeStore(raw: unknown): StoreState {
  const source = isObject(raw) && Array.isArray(raw.purchased) ? raw.purchased : [];
  const known = new Set(STORE_OFFERS.map((offer) => offer.id));
  const purchased: string[] = [];
  for (const value of source) {
    if (typeof value === 'string' && known.has(value) && !purchased.includes(value)) purchased.push(value);
  }
  return { purchased };
}

/** Defensive merge so a damaged or older save can never crash the game. */
export function normalizeProgress(raw: unknown): PlayerProgress | null {
  if (!isObject(raw) || raw.version !== 1) return null;
  const base = createInitialProgress();
  const player = isObject(raw.player) ? raw.player : {};
  const streak = isObject(raw.streak) ? raw.streak : {};
  const avatar = AVATAR_IDS.find((a) => a === player.avatar) ?? base.player.avatar;
  return {
    version: 1,
    player: {
      name: typeof player.name === 'string' ? player.name.slice(0, 24) : '',
      avatar,
      onboarded: player.onboarded === true,
      createdAt: typeof player.createdAt === 'string' ? player.createdAt : base.player.createdAt,
    },
    xp: toInt(raw.xp),
    coins: toInt(raw.coins),
    streak: {
      count: toInt(streak.count),
      best: toInt(streak.best),
      lastActiveDate: typeof streak.lastActiveDate === 'string' ? streak.lastActiveDate : null,
    },
    missions: isObject(raw.missions) ? (raw.missions as PlayerProgress['missions']) : {},
    drafts: isObject(raw.drafts) ? (raw.drafts as PlayerProgress['drafts']) : {},
    daily: isObject(raw.daily) ? (raw.daily as unknown as PlayerProgress['daily']) : null,
    achievements: isObject(raw.achievements) ? (raw.achievements as PlayerProgress['achievements']) : {},
    history: Array.isArray(raw.history) ? (raw.history.filter(isObject) as unknown as PlayerProgress['history']) : [],
    // Saves written before the demo store simply have no store section.
    store: normalizeStore(raw.store),
  };
}

export function loadProgress(): { progress: PlayerProgress | null; status: LoadStatus } {
  if (!isStorageAvailable()) return { progress: null, status: 'unavailable' };
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (text === null) return { progress: null, status: 'empty' };
    const parsed = JSON.parse(text);
    // Older builds only understand `version: 1`; a newer document is left untouched
    // (never reset) so a downgraded tab cannot silently wipe a newer save.
    if (isObject(parsed) && typeof parsed.version === 'number' && parsed.version !== 1) {
      return { progress: null, status: 'corrupt' };
    }
    const progress = normalizeProgress(parsed);
    return progress ? { progress, status: 'loaded' } : { progress: null, status: 'corrupt' };
  } catch {
    return { progress: null, status: 'corrupt' };
  }
}

/** Returns true only if the data is verifiably stored. */
export function saveProgress(progress: PlayerProgress): boolean {
  try {
    const text = JSON.stringify(progress);
    window.localStorage.setItem(STORAGE_KEY, text);
    return window.localStorage.getItem(STORAGE_KEY) === text;
  } catch {
    return false;
  }
}

export function clearProgress(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}
