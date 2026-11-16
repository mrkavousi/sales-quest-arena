import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, newIdempotencyKey, onSessionExpired, setCsrfToken } from './client';
import { getMission, registerMissions } from '../game/missions';
import type { Mission } from '../game/types';

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body === null ? '' : JSON.stringify(body), { status, headers }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('sends CSRF + Idempotency-Key on writes and never on reads', async () => {
    setCsrfToken('csrf-1');
    const fetchMock = mockFetch(200, { ok: true });
    await api.post('/api/v1/x', { a: 1 }, { idempotencyKey: 'key-1' });
    const post = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(post.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(post.headers['Idempotency-Key']).toBe('key-1');
    expect(post.body).toBe('{"a":1}');
    await api.get('/api/v1/x');
    const get = fetchMock.mock.calls[1][1] as RequestInit & { headers: Record<string, string> };
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('maps server error bodies to ApiError and broadcasts 401', async () => {
    mockFetch(401, { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in is required.' } });
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    await expect(api.get('/api/v1/auth/me')).rejects.toMatchObject({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    expect(expired).toHaveBeenCalledTimes(1);
    mockFetch(401, { error: { code: 'AUTHENTICATION_REQUIRED', message: 'x' } });
    await expect(api.get('/api/v1/auth/me', { quiet401: true })).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledTimes(1); // probing the session does not count as an expiry
    off();
  });

  it('reports network failures distinctly and keeps the CSRF token from response headers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await expect(api.get('/api/v1/x')).rejects.toMatchObject({ status: 0, isNetwork: true });
    const fetchMock = mockFetch(200, {}, { 'X-CSRF-Token': 'from-header' });
    await api.post('/api/v1/auth/demo-login', { user_id: 'u' });
    await api.post('/api/v1/y');
    const second = fetchMock.mock.calls[1][1] as RequestInit & { headers: Record<string, string> };
    expect(second.headers['X-CSRF-Token']).toBe('from-header');
  });

  it('generates distinct idempotency keys', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});

describe('server mission registry', () => {
  it('resolves server-only missions after registration, keeping the static six', () => {
    expect(getMission('target-sprint')).toBeUndefined();
    expect(getMission('customer-visit-challenge')).toBeDefined();
    registerMissions([{ id: 'target-sprint', title: 'Target Sprint', steps: [] } as unknown as Mission]);
    expect(getMission('target-sprint')?.title).toBe('Target Sprint');
  });
});
