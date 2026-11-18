import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../game/achievements';
import { GAME_CONFIG } from '../game/config';
import { CATEGORIES, DIFFICULTY, isStepAnswered } from '../game/missions';
import { createInitialProgress } from '../game/progress';
import { blockedKey, withoutLocalOnly } from '../game/serverMissions';
import type { MissionView } from '../game/types';
import { apiErrorKey, definitelyNotSubmitted } from './errors';
import { GameApiError, getBootstrap, postSubmission, SUPPORTED_CONTENT_VERSION } from './game';
import { checkEvidenceFile, prepareEvidence } from './image';

const today = '2026-11-18';
const now = new Date(`${today}T10:00:00Z`);
const progress = { ...createInitialProgress(now), daily: null };
const asJson = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const serverMission = (over: Partial<MissionView> = {}): MissionView => ({
  id: 'm-1', order: 1, title: 'معرفی محصول جدید', shortTitle: 'معرفی محصول جدید', description: 'توضیح مأموریت',
  instructions: 'مراحل انجام', category: 'product_intro', difficulty: 'easy', estimatedMinutes: 10,
  xpReward: 100, coinReward: 20, orgPoints: 20, requiresReview: true, requiresEvidence: false, maxPerUser: 1, remaining: 1,
  source: 'server', unlock: {}, completion: { requiredSteps: ['answer'] },
  steps: [
    { id: 'answer', type: 'note', label: 'پاسخ', question: 'پاسخ را بنویسید', placeholder: '…', maxLength: 1000, suggestions: [] },
    { id: 'evidence', type: 'evidence', label: 'تصویر', question: 'تصویر', required: false },
  ],
  status: 'available', canStart: true, blockedReason: null, completions: 0, bestRating: null, lockReason: null,
  draftProgress: 0, isDaily: false, dailyDone: false, latestSubmission: null, ...over,
} as MissionView);

const boot = (missions: MissionView[] = [serverMission()], version = '2') => ({
  api_version: version, content_version: SUPPORTED_CONTENT_VERSION, server_time: now.toISOString(), date_key: today,
  csrf_token: 'csrf-token', player: { id: 'user-a', account_name: 'Demo', role: 'visitor' },
  game_config: GAME_CONFIG, categories: CATEGORIES, difficulty: DIFFICULTY, missions,
  achievements_catalog: ACHIEVEMENTS.map((item) => ({ ...item, available: item.id !== 'trailblazer' })), progress,
});

describe('API v2 DB missions', () => {
  beforeEach(() => vi.stubGlobal('window', { setTimeout, clearTimeout }));
  afterEach(() => vi.unstubAllGlobals());

  it('asks for v2, accepts DB missions with the new statuses and an empty list', async () => {
    const fetcher = vi.fn(async () => asJson(boot([serverMission({ status: 'pending_review', canStart: false, blockedReason: 'pending_review' })])));
    vi.stubGlobal('fetch', fetcher);
    const data = await getBootstrap();
    expect(data.missions[0].status).toBe('pending_review');
    const [, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(options.headers).toMatchObject({ 'X-Game-Api': '2' });

    vi.stubGlobal('fetch', vi.fn(async () => asJson(boot([]))));
    expect((await getBootstrap()).missions).toEqual([]);
  });

  it('still accepts a v1 backend and rejects unknown versions or half-formed DB missions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => asJson(boot([serverMission({ source: undefined })], '1'))));
    expect((await getBootstrap()).api_version).toBe('1');
    vi.stubGlobal('fetch', vi.fn(async () => asJson(boot([serverMission()], '3'))));
    await expect(getBootstrap()).rejects.toMatchObject({ code: 'UNSUPPORTED_VERSION' });
    const broken = { ...serverMission() } as unknown as Record<string, unknown>;
    delete broken.canStart;
    vi.stubGlobal('fetch', vi.fn(async () => asJson(boot([broken as unknown as MissionView]))));
    await expect(getBootstrap()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('submits multipart text + image with CSRF and one idempotency key, and recognizes a replay', async () => {
    const result = {
      progress, missions: [serverMission({ status: 'pending_review' })], date_key: today,
      submission: { id: 's-1', missionId: 'm-1', status: 'submitted', submittedAt: now.toISOString() }, mission: null,
    };
    const fetcher = vi.fn(async () => asJson(result, 201, { 'Idempotent-Replay': 'false' }));
    vi.stubGlobal('fetch', fetcher);
    const image = new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' });
    const response = await postSubmission('csrf', 'm-1', 'پاسخ من', image, 'key-1');
    expect(response.replayed).toBe(false);
    expect(response.result.submission.status).toBe('submitted');
    const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/game/missions/m-1/submissions');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ 'X-CSRF-Token': 'csrf', 'Idempotency-Key': 'key-1', 'X-Game-Api': '2' });
    expect(options.headers).not.toHaveProperty('Content-Type'); // the browser sets the multipart boundary
    const form = options.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('answer')).toBe('پاسخ من');
    expect((form.get('evidence') as File).name).toBe('shot.png');

    vi.stubGlobal('fetch', vi.fn(async () => asJson(result, 200, { 'Idempotent-Replay': 'true' })));
    expect((await postSubmission('csrf', 'm-1', 'پاسخ من', null, 'key-1')).replayed).toBe(true);
  });

  it('rejects a submission response for another mission and surfaces server errors', async () => {
    const wrong = { progress, missions: [], date_key: today, submission: { id: 's', missionId: 'other', status: 'submitted', submittedAt: now.toISOString() }, mission: null };
    vi.stubGlobal('fetch', vi.fn(async () => asJson(wrong, 201)));
    await expect(postSubmission('csrf', 'm-1', 'x', null, 'k')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    vi.stubGlobal('fetch', vi.fn(async () => asJson({ error: { code: 'MISSION_EXPIRED', message: 'expired' } }, 409)));
    await expect(postSubmission('csrf', 'm-1', 'x', null, 'k')).rejects.toMatchObject({ status: 409, code: 'MISSION_EXPIRED' });
  });
});

describe('submission helpers', () => {
  it('maps new server error codes to messages and knows when the idempotency key can be dropped', () => {
    const error = (status: number, code: string) => new GameApiError(status, code, 'x');
    expect(apiErrorKey(error(409, 'MISSION_EXPIRED'))).toBe('connection.errorExpired');
    expect(apiErrorKey(error(409, 'SUBMISSION_PENDING'))).toBe('connection.errorPending');
    expect(apiErrorKey(error(409, 'MAX_ATTEMPTS_REACHED'))).toBe('connection.errorLimit');
    expect(apiErrorKey(error(422, 'EVIDENCE_REQUIRED'))).toBe('connection.errorEvidence');
    expect(apiErrorKey(error(422, 'ANSWER_REQUIRED'))).toBe('connection.errorAnswer');
    expect(definitelyNotSubmitted(error(409, 'MISSION_EXPIRED'))).toBe(true);
    expect(definitelyNotSubmitted(error(0, 'NETWORK_ERROR'))).toBe(false);
    expect(definitelyNotSubmitted(error(500, 'HTTP_500'))).toBe(false);
    expect(definitelyNotSubmitted(error(409, 'IDEMPOTENCY_KEY_REUSED'))).toBe(false);
  });

  it('checks picked evidence files and passes small accepted images through unchanged', async () => {
    expect(checkEvidenceFile({ type: 'image/png', size: 10 })).toBe('ok');
    expect(checkEvidenceFile({ type: 'application/pdf', size: 10 })).toBe('badType');
    expect(checkEvidenceFile({ type: 'image/png', size: 0 })).toBe('empty');
    expect(checkEvidenceFile({ type: 'image/jpeg', size: 40 * 1024 * 1024 })).toBe('tooLarge');
    const small = new File([new Uint8Array(100)], 'a.jpg', { type: 'image/jpeg' });
    expect(await prepareEvidence(small)).toBe(small);
    // No canvas available (node): an oversized or unsupported file cannot be sent safely.
    const huge = new File([new Uint8Array(5 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    await expect(prepareEvidence(huge)).rejects.toMatchObject({ code: 'EVIDENCE_TOO_LARGE' });
    const heic = new File([new Uint8Array(100)], 'a.heic', { type: 'image/heic' });
    await expect(prepareEvidence(heic)).rejects.toMatchObject({ code: 'EVIDENCE_TOO_LARGE' });
  });

  it('keeps the evidence marker out of drafts and counts it as an answer only when present', () => {
    expect(withoutLocalOnly({ answer: 'x', evidence: 'shot.png' })).toEqual({ answer: 'x' });
    const step = serverMission().steps[1];
    expect(isStepAnswered(step, { evidence: 'shot.png' })).toBe(true);
    expect(isStepAnswered(step, { evidence: '' })).toBe(false);
    expect(isStepAnswered(step, {})).toBe(false);
  });

  it('explains why a DB mission cannot be started', () => {
    expect(blockedKey({ blockedReason: 'pending_review' })).toBe('server.blocked.pending_review');
    expect(blockedKey({ blockedReason: 'expired' })).toBe('server.blocked.expired');
    expect(blockedKey({ blockedReason: 'limit_reached' })).toBe('server.blocked.limit_reached');
  });
});
