import type { Answers } from '../game/types';

/**
 * One explicit, per-account recovery record, not a background/offline queue.
 * It contains no session/CSRF token or reward data. Retain the same request and
 * key when a response is lost, including across reloads or account changes.
 */
export interface PendingCompletion {
  version: 1;
  userId: string;
  missionId: string;
  key: string;
  answers: Answers;
}

export type PendingLoad =
  | { status: 'empty' }
  | { status: 'loaded'; intent: PendingCompletion }
  | { status: 'corrupt' | 'unavailable' };

export const pendingStorageKey = (userId: string) => `sales-quest-arena:pending-completion:v1:${encodeURIComponent(userId)}`;

export function loadPendingCompletion(userId: string): PendingLoad {
  let text: string | null;
  try { text = window.localStorage.getItem(pendingStorageKey(userId)); } catch { return { status: 'unavailable' }; }
  if (text === null) return { status: 'empty' };
  try {
    const value = JSON.parse(text) as Partial<PendingCompletion>;
    if (value.version !== 1 || value.userId !== userId || typeof value.missionId !== 'string' || !value.missionId ||
        typeof value.key !== 'string' || !value.key || value.key.length > 128 ||
        !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers) ||
        !Object.values(value.answers).every((answer) => typeof answer === 'string' || (typeof answer === 'number' && Number.isFinite(answer)))) {
      return { status: 'corrupt' };
    }
    return { status: 'loaded', intent: value as PendingCompletion };
  } catch { return { status: 'corrupt' }; }
}

/** Refuse to submit when the retry key cannot be persisted and verified. */
export function savePendingCompletion(intent: PendingCompletion): boolean {
  try {
    const key = pendingStorageKey(intent.userId);
    if (window.localStorage.getItem(key) !== null) return false;
    const text = JSON.stringify(intent);
    window.localStorage.setItem(key, text);
    return window.localStorage.getItem(key) === text;
  } catch { return false; }
}

/** Only clear the exact intent resolved by the server; never delete another tab's request. */
export function clearPendingCompletion(intent: PendingCompletion): boolean {
  try {
    const existing = loadPendingCompletion(intent.userId);
    if (existing.status !== 'loaded' || existing.intent.key !== intent.key) return false;
    window.localStorage.removeItem(pendingStorageKey(intent.userId));
    return window.localStorage.getItem(pendingStorageKey(intent.userId)) === null;
  } catch { return false; }
}

export function newCompletionKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
