import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingCompletion, loadPendingCompletion, newCompletionKey, pendingStorageKey, savePendingCompletion, type PendingCompletion } from './pendingCompletion';

const intent: PendingCompletion = { version: 1, userId: 'visitor A', missionId: 'customer-visit-challenge', key: 'request-123', answers: { customer_type: 'new', rating: 5 } };

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe('completion retry records', () => {
  beforeEach(() => vi.stubGlobal('window', { localStorage: memoryStorage() }));
  afterEach(() => vi.unstubAllGlobals());

  it('persists the exact request per user and removes only the resolved key', () => {
    expect(savePendingCompletion(intent)).toBe(true);
    expect(loadPendingCompletion(intent.userId)).toEqual({ status: 'loaded', intent });
    expect(loadPendingCompletion('visitor B')).toEqual({ status: 'empty' });
    expect(savePendingCompletion({ ...intent, key: 'different' })).toBe(false);
    expect(clearPendingCompletion({ ...intent, key: 'different' })).toBe(false);
    expect(loadPendingCompletion(intent.userId).status).toBe('loaded');
    expect(clearPendingCompletion(intent)).toBe(true);
    expect(loadPendingCompletion(intent.userId)).toEqual({ status: 'empty' });
  });

  it('does not accept corrupt or inaccessible storage as an empty safe record', () => {
    window.localStorage.setItem(pendingStorageKey(intent.userId), '{broken');
    expect(loadPendingCompletion(intent.userId)).toEqual({ status: 'corrupt' });
    expect(savePendingCompletion(intent)).toBe(false);
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } });
    expect(loadPendingCompletion(intent.userId)).toEqual({ status: 'unavailable' });
    expect(savePendingCompletion(intent)).toBe(false);
  });

  it('produces printable unique request keys', () => {
    const first = newCompletionKey();
    const second = newCompletionKey();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(first).not.toBe(second);
  });
});
