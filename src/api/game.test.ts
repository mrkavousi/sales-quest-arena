import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../game/achievements';
import { completeMission } from '../game/completeMission';
import { GAME_CONFIG } from '../game/config';
import { CATEGORIES, CUSTOMER_VISIT_ID, DIFFICULTY } from '../game/missions';
import { createInitialProgress, ensureDaily, getMissionViews } from '../game/progress';
import { apiErrorKey, definitelyNotCompleted } from './errors';
import { demoLogin, demoLogout, GameApiError, getBootstrap, getDemoUsers, isSignOutAlreadyEnded, postCompletion, putDraft, SUPPORTED_CONTENT_VERSION } from './game';

const today = '2026-11-12';
const now = new Date(`${today}T10:00:00Z`);
const initial = ensureDaily(createInitialProgress(now), today);
const boot = () => ({
  api_version: '1', content_version: SUPPORTED_CONTENT_VERSION, server_time: now.toISOString(), date_key: today,
  csrf_token: 'csrf-from-bootstrap', player: { id: 'user-a', account_name: 'Demo', role: 'visitor' },
  game_config: GAME_CONFIG, categories: CATEGORIES, difficulty: DIFFICULTY,
  missions: getMissionViews(initial, today), achievements_catalog: ACHIEVEMENTS, progress: initial,
});
const asJson = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });

describe('same-origin game BFF client', () => {
  beforeEach(() => vi.stubGlobal('window', { setTimeout, clearTimeout }));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('bootstraps a versioned catalog with cookie credentials and no cache', async () => {
    const fetcher = vi.fn(async () => asJson(boot()));
    vi.stubGlobal('fetch', fetcher);
    const data = await getBootstrap();
    expect(data.missions).toHaveLength(6);
    expect(data.date_key).toBe(today);
    expect(fetcher).toHaveBeenCalledWith('/api/v1/game/bootstrap', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store', redirect: 'error' }));
  });

  it('rejects mismatched content versions, inconsistent UTC dates and unrecognized payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ ...boot(), content_version: 'new-content' })));
    await expect(getBootstrap()).rejects.toMatchObject({ code: 'UNSUPPORTED_VERSION' });
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ ...boot(), date_key: '2026-11-13' })));
    await expect(getBootstrap()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>static fallback</html>', { status: 200 })));
    await expect(getBootstrap()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects malformed optional content and draft indexes before rendering', async () => {
    const data = boot();
    const mission = data.missions[0];
    const choice = mission.steps[0];
    const note = mission.steps.find((step) => step.type === 'note');
    if (choice.type !== 'choice' || !note || note.type !== 'note') throw new Error('Unexpected test catalog');
    const withSteps = (steps: unknown[]) => ({ ...data, missions: [{ ...mission, steps }, ...data.missions.slice(1)] });
    const malformed = [
      withSteps([{ ...choice, options: [{ ...choice.options[0], flags: { unexpected: true } }] }, ...mission.steps.slice(1)]),
      withSteps(mission.steps.map((step) => step.id === note.id ? { ...note, suggestions: { length: 1 } } : step)),
      withSteps([{ ...choice, helper: { unexpected: true } }, ...mission.steps.slice(1)]),
      { ...data, progress: { ...data.progress, drafts: { [mission.id]: { missionId: mission.id, stepIndex: 0.5, answers: {}, startedAt: now.toISOString() } } } },
      { ...data, progress: { ...data.progress, streak: { ...data.progress.streak, lastActiveDate: 'not-a-date' } } },
    ];
    for (const payload of malformed) {
      vi.stubGlobal('fetch', vi.fn(async () => asJson(payload)));
      await expect(getBootstrap()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });

  it('sends only answers and the CSRF/idempotency headers, then recognizes a replay', async () => {
    const submitted = { customer_type: 'new', outcome: 'order_received', rating: 5 };
    const result = completeMission(initial, CUSTOMER_VISIT_ID, submitted, now);
    const payload = { entry: result.entry, progress: result.progress, missions: getMissionViews(result.progress, today), date_key: today };
    const fetcher = vi.fn(async () => asJson(payload, 200, { 'Idempotent-Replay': 'true' }));
    vi.stubGlobal('fetch', fetcher);
    const response = await postCompletion('csrf', CUSTOMER_VISIT_ID, submitted, 'same-retry-key');
    expect(response.replayed).toBe(true);
    expect(response.completion.entry.id).toBe(result.entry.id);
    const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/game/missions/customer-visit-challenge/completions');
    expect(options.credentials).toBe('same-origin');
    expect(options.headers).toMatchObject({ 'X-CSRF-Token': 'csrf', 'Idempotency-Key': 'same-retry-key', 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body as string)).toEqual({ answers: submitted });
    vi.stubGlobal('fetch', vi.fn(async () => asJson(payload)));
    expect((await postCompletion('csrf', CUSTOMER_VISIT_ID, submitted, 'same-retry-key')).replayed).toBeNull();
  });

  it('does not treat an invalid successful completion response as confirmed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ entry: {}, progress: initial })));
    await expect(postCompletion('csrf', CUSTOMER_VISIT_ID, {}, 'key')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(definitelyNotCompleted(new GameApiError(200, 'INVALID_RESPONSE', 'bad body'))).toBe(false);
    expect(definitelyNotCompleted(new GameApiError(422, 'MISSION_INCOMPLETE', 'invalid'))).toBe(true);
    expect(definitelyNotCompleted(new GameApiError(422, 'HTTP_422', 'unrecognized proxy response'))).toBe(false);
    expect(definitelyNotCompleted(new GameApiError(500, 'INVALID_ANSWER', 'wrong status'))).toBe(false);
    expect(definitelyNotCompleted(new GameApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'conflict'))).toBe(false);
  });

  it('times out a stalled response body and treats completion as ambiguous', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.stubGlobal('fetch', vi.fn(async (_path: string, options: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          options.signal!.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
        },
      });
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const result = postCompletion('csrf', CUSTOMER_VISIT_ID, {}, 'retry-key').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15_000);
    const error = await result;
    expect(error).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(definitelyNotCompleted(error)).toBe(false);
  });

  it('propagates JSON auth/validation errors and never sends reward state in drafts', async () => {
    const fetcher = vi.fn(async () => asJson({ error: { code: 'INVALID_ANSWER', message: 'Invalid answer' } }, 422));
    vi.stubGlobal('fetch', fetcher);
    await expect(putDraft('csrf', CUSTOMER_VISIT_ID, 1, { customer_type: 'new' })).rejects.toMatchObject({ status: 422, code: 'INVALID_ANSWER' });
    const options = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(options.body as string)).toEqual({ step_index: 1, answers: { customer_type: 'new' } });
    expect(apiErrorKey(new GameApiError(401, 'AUTHENTICATION_REQUIRED', 'auth'))).toBe('connection.errorAuth');
  });

  it('lists demo visitors from the JSON endpoint and ignores malformed entries', async () => {
    const fetcher = vi.fn(async () => asJson({ users: [{ id: 'u1', name: '  Visitor   One ' }, { id: 'u2', name: 'Visitor Two' }] }));
    vi.stubGlobal('fetch', fetcher);
    expect(await getDemoUsers()).toEqual([{ id: 'u1', label: 'Visitor One' }, { id: 'u2', label: 'Visitor Two' }]);
    const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/game/demo-users');
    expect(options.credentials).toBe('same-origin');
    expect(options.cache).toBe('no-store');

    vi.stubGlobal('fetch', vi.fn(async () => asJson({ users: [] })));
    await expect(getDemoUsers()).rejects.toMatchObject({ code: 'DEMO_USERS_UNAVAILABLE' });
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ users: [{ id: '' , name: 'x' }] })));
    await expect(getDemoUsers()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'no' } }, 401)));
    await expect(getDemoUsers()).rejects.toMatchObject({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'HTTP_404', message: 'Demo login is disabled in this environment.' } }, 404)));
    await expect(getDemoUsers()).rejects.toMatchObject({ status: 404, code: 'DEMO_USERS_UNAVAILABLE' });
  });

  it('signs in with the JSON login body and confirms the cookie through bootstrap', async () => {
    const calls: { path: string; options: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit) => {
      calls.push({ path, options });
      if (path === '/api/v1/game/demo-login') return asJson({ user: { id: 'u1', name: 'Visitor One' } });
      return asJson(boot());
    }));
    const data = await demoLogin('u1');
    expect(data.player.id).toBe('user-a');
    expect(calls.map((call) => call.path)).toEqual(['/api/v1/game/demo-login', '/api/v1/game/bootstrap']);
    expect(JSON.parse(calls[0].options.body as string)).toEqual({ user_id: 'u1' });
    expect(calls[0].options.headers).toMatchObject({ Accept: 'application/json', 'Content-Type': 'application/json' });
    expect(calls[0].options.credentials).toBe('same-origin');
    expect(calls[0].options.redirect).toBe('error');
    // No session token or CSRF token is ever written by the client.
    expect(JSON.stringify(calls)).not.toContain('csrf-from-bootstrap');
  });

  it('reports disabled demo login, rate limits and cookie failures distinctly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'HTTP_404', message: 'Not Found' } }, 404)));
    await expect(demoLogin('u1')).rejects.toMatchObject({ status: 404, code: 'DEMO_LOGIN_DISABLED' });
    expect(apiErrorKey(new GameApiError(404, 'DEMO_LOGIN_DISABLED', 'off'))).toBe('connection.demoLoginDisabled');
    expect(apiErrorKey(new GameApiError(429, 'RATE_LIMITED', 'slow down'))).toBe('connection.errorRateLimited');
    expect(apiErrorKey(new GameApiError(0, 'DEMO_USERS_UNAVAILABLE', 'none'))).toBe('connection.demoUsersUnavailable');

    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'RATE_LIMITED', message: 'Too many demo login attempts' } }, 429)));
    await expect(demoLogin('u1')).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });

  it('logs out with only the CSRF header and validates the acknowledgement', async () => {
    const fetcher = vi.fn(async () => asJson({ logged_out: true }));
    vi.stubGlobal('fetch', fetcher);
    expect(await demoLogout('csrf-token')).toBe(true);
    const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/game/logout');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' });
    expect(options.body).toBeUndefined();
    expect(options.credentials).toBe('same-origin');
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ logged_out: false })));
    expect(await demoLogout('csrf-token')).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'Csrf mismatch', message: 'no' } }, 403)));
    await expect(demoLogout('csrf-token')).rejects.toMatchObject({ status: 403 });
  });

  it('treats only a 401 as an already-ended sign-out, never a 403 CSRF failure', () => {
    expect(isSignOutAlreadyEnded(new GameApiError(401, 'UNAUTHORIZED', 'gone'))).toBe(true);
    // A 403 leaves the HttpOnly cookie alive, so claiming success would be a lie.
    expect(isSignOutAlreadyEnded(new GameApiError(403, 'Csrf mismatch', 'no'))).toBe(false);
    expect(isSignOutAlreadyEnded(new GameApiError(500, 'INTERNAL', 'boom'))).toBe(false);
    expect(isSignOutAlreadyEnded(new TypeError('network down'))).toBe(false);
    expect(isSignOutAlreadyEnded(null)).toBe(false);
  });
});
