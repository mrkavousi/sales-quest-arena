import type { AchievementMeta } from '../game/achievements';
import type { GameConfig } from '../game/config';
import type { CategoryMeta } from '../game/missions';
import type { Answers, AvatarId, HistoryEntry, MissionCategory, MissionDifficulty, MissionView, PlayerProgress } from '../game/types';

/** This client intentionally uses only same-origin paths and never handles a session token. */
const ROOT = '/api/v1/game';
export const SUPPORTED_API_VERSION = '1';
export const SUPPORTED_CONTENT_VERSION = 'sales-quest-arena-7de8a5a0a0da';

export interface GameBootstrap {
  api_version: string;
  content_version: string;
  server_time: string;
  date_key: string;
  csrf_token: string;
  player: { id: string; account_name: string; role: string };
  game_config: GameConfig;
  categories: Record<MissionCategory, CategoryMeta>;
  difficulty: Record<MissionDifficulty, { label: string; dots: number }>;
  missions: MissionView[];
  achievements_catalog: AchievementMeta[];
  progress: PlayerProgress;
}

export interface Projection {
  progress: PlayerProgress;
  missions: MissionView[];
  date_key?: string;
}

export interface Completion extends Projection {
  entry: HistoryEntry;
  date_key: string;
}

export interface HistoryPage {
  items: HistoryEntry[];
  next_cursor: string | null;
}

export interface DemoUser { id: string; label: string }

export class GameApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'GameApiError';
  }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const dateKey = (value: unknown): value is string => {
  if (!string(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
};
const stringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
const optionalString = (value: unknown) => value === undefined || typeof value === 'string';
const optionalStringList = (value: unknown) => value === undefined || stringList(value);
const nonnegativeInteger = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const answers = (value: unknown) => object(value) && Object.values(value).every((item) => typeof item === 'string' || number(item));
const categoriesSupported = ['customer_visit', 'product_intro', 'follow_up', 'new_customer', 'market_research', 'sales_achievement'];
const difficultiesSupported = ['easy', 'medium', 'hard'];

function validEntry(value: unknown): boolean {
  return object(value) && string(value.id) && string(value.missionId) && string(value.completedAt) && Number.isFinite(Date.parse(value.completedAt)) &&
    answers(value.answers) && stringList(value.flags) && typeof value.wasDaily === 'boolean' && object(value.rewards) &&
    number(value.rewards.xp) && number(value.rewards.coins) && Array.isArray(value.rewards.lines) &&
    value.rewards.lines.every((line: unknown) => object(line) && string(line.ruleId) && string(line.label) && number(line.xp) && number(line.coins)) &&
    number(value.xpBefore) && number(value.xpAfter) && number(value.coinsAfter) && number(value.levelBefore) && number(value.levelAfter) &&
    number(value.streakAfter) && stringList(value.achievementsUnlocked);
}

function validProgress(value: unknown): boolean {
  if (!object(value) || value.version !== 1 || !object(value.player) || typeof value.player.name !== 'string' ||
      !['fox', 'bear', 'cat', 'bunny', 'panda', 'frog'].includes(String(value.player.avatar)) || typeof value.player.onboarded !== 'boolean' || !string(value.player.createdAt) ||
      !number(value.xp) || !number(value.coins) || !object(value.streak) || !number(value.streak.count) || !number(value.streak.best) || !(value.streak.lastActiveDate === null || dateKey(value.streak.lastActiveDate)) ||
      !object(value.missions) || !object(value.drafts) || !object(value.achievements) || !Array.isArray(value.history) || !value.history.every(validEntry)) return false;
  if (!(value.daily === null || (object(value.daily) && dateKey(value.daily.date) && string(value.daily.missionId) && typeof value.daily.completed === 'boolean'))) return false;
  return Object.values(value.missions).every((record) => object(record) && number(record.completions)) &&
    Object.values(value.drafts).every((draft) => object(draft) && string(draft.missionId) && nonnegativeInteger(draft.stepIndex) && answers(draft.answers) && string(draft.startedAt)) &&
    Object.values(value.achievements).every((entry) => typeof entry === 'string');
}

function validMission(value: unknown): boolean {
  if (!object(value) || !string(value.id) || !number(value.order) || !string(value.title) || !string(value.shortTitle) || typeof value.description !== 'string' ||
      !categoriesSupported.includes(String(value.category)) || !difficultiesSupported.includes(String(value.difficulty)) ||
      !number(value.estimatedMinutes) || !number(value.xpReward) || !number(value.coinReward) || !object(value.unlock) ||
      !optionalString(value.unlock.afterMission) || !(value.unlock.minLevel === undefined || nonnegativeInteger(value.unlock.minLevel)) ||
      !object(value.completion) || !stringList(value.completion.requiredSteps) || !Array.isArray(value.steps) || !value.steps.length ||
      !['locked', 'available', 'in_progress', 'completed'].includes(String(value.status)) || !number(value.completions) ||
      !(value.bestRating === null || number(value.bestRating)) || !nullableString(value.lockReason) || !number(value.draftProgress) ||
      typeof value.isDaily !== 'boolean' || typeof value.dailyDone !== 'boolean') return false;
  return value.steps.every((step: unknown) => {
    if (!object(step) || !string(step.id) || !string(step.label) || !string(step.question) || !optionalString(step.helper)) return false;
    if (step.type === 'choice') return Array.isArray(step.options) && step.options.length > 0 && step.options.every((option: unknown) =>
      object(option) && string(option.id) && string(option.label) && typeof option.emoji === 'string' && optionalString(option.hint) && optionalStringList(option.flags));
    if (step.type === 'rating') return stringList(step.scale) && step.scale.length === 5;
    if (step.type === 'note') return typeof step.placeholder === 'string' && nonnegativeInteger(step.maxLength) && optionalStringList(step.suggestions);
    return false;
  });
}

function validateProjection(value: unknown, needsDate = false): Projection {
  if (!object(value) || !validProgress(value.progress) || !Array.isArray(value.missions) || !value.missions.length || !value.missions.every(validMission) || (needsDate && !dateKey(value.date_key)) || ('date_key' in value && !dateKey(value.date_key))) {
    throw new GameApiError(0, 'INVALID_RESPONSE', 'The game progress response is invalid.');
  }
  return value as unknown as Projection;
}

function validateBootstrap(value: unknown): GameBootstrap {
  if (!object(value)) throw new GameApiError(0, 'INVALID_RESPONSE', 'Expected a game bootstrap object.');
  if (value.api_version !== SUPPORTED_API_VERSION || value.content_version !== SUPPORTED_CONTENT_VERSION) {
    throw new GameApiError(0, 'UNSUPPORTED_VERSION', 'The game API or content version is not supported by this app.');
  }
  const player = value.player;
  const config = value.game_config;
  const progress = value.progress;
  const categories = value.categories;
  const difficulty = value.difficulty;
  if (!string(value.csrf_token) || !string(value.server_time) || !Number.isFinite(Date.parse(value.server_time)) ||
      !dateKey(value.date_key) || new Date(value.server_time).toISOString().slice(0, 10) !== value.date_key ||
      !object(player) || !string(player.id) || !string(player.account_name) || player.role !== 'visitor' ||
      !object(config) || !object(config.rewards) || !number(config.rewards.missionXp) || !number(config.rewards.missionCoins) || !number(config.rewards.dailyBonusXp) || !number(config.rewards.orderBonusXp) ||
      !Array.isArray(config.levels) || !config.levels.length || !config.levels.every((level: unknown) => object(level) && number(level.level) && number(level.minXp) && string(level.title) && string(level.color)) ||
      !object(config.history) || !number(config.history.maxEntries) ||
      !object(categories) || !categoriesSupported.every((category) => object(categories[category]) && string(categories[category].label) && string(categories[category].color) && string(categories[category].dark) && string(categories[category].soft)) ||
      !object(difficulty) || !difficultiesSupported.every((item) => object(difficulty[item]) && string(difficulty[item].label) && number(difficulty[item].dots)) ||
      !Array.isArray(value.missions) || !value.missions.length || !value.missions.every(validMission) ||
      !Array.isArray(value.achievements_catalog) || !value.achievements_catalog.every((item: unknown) => object(item) && string(item.id) && string(item.title) && string(item.description) && string(item.emoji) && stringList(item.colors) && item.colors.length === 2) ||
      !validProgress(progress)) {
    throw new GameApiError(0, 'INVALID_RESPONSE', 'The game bootstrap is incomplete or invalid.');
  }
  return value as unknown as GameBootstrap;
}

async function request<T>(path: string, options: RequestInit, read: (response: Response) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(path, { redirect: 'error', ...options, credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
    // Keep the timeout active until the body is consumed, not just until the
    // headers arrive. A stalled body is an ambiguous network failure.
    return await read(response);
  } catch (error) {
    if (error instanceof GameApiError) throw error;
    throw new GameApiError(0, 'NETWORK_ERROR', 'The server could not be reached.');
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new GameApiError(response.status, 'INVALID_RESPONSE', 'The server did not return JSON.');
  }
  if (!response.ok) {
    const detail = object(payload) && object(payload.error) ? payload.error : {};
    throw new GameApiError(response.status, string(detail.code) ? detail.code : `HTTP_${response.status}`, string(detail.message) ? detail.message : 'The request failed.');
  }
  return payload as T;
}

async function jsonRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request(path, { ...options, headers: { Accept: 'application/json', ...options.headers } }, readJson<T>);
}

function writeOptions(method: string, csrf: string, body?: unknown, extra?: Record<string, string>): RequestInit {
  return {
    method,
    headers: { 'X-CSRF-Token': csrf, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export async function getBootstrap(): Promise<GameBootstrap> {
  return validateBootstrap(await jsonRequest<unknown>(`${ROOT}/bootstrap`));
}

export async function getProgress(): Promise<Projection> {
  return validateProjection(await jsonRequest<unknown>(`${ROOT}/progress`), true);
}

export async function getHistory(limit = 20, cursor?: string): Promise<HistoryPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  const data = await jsonRequest<unknown>(`${ROOT}/history?${query}`);
  if (!object(data) || !Array.isArray(data.items) || !data.items.every(validEntry) || !nullableString(data.next_cursor)) throw new GameApiError(0, 'INVALID_RESPONSE', 'The history response is invalid.');
  return data as unknown as HistoryPage;
}

export async function updateProfile(csrf: string, patch: { name?: string; avatar?: AvatarId }): Promise<{ progress: PlayerProgress }> {
  const data = await jsonRequest<unknown>(`${ROOT}/profile`, writeOptions('PATCH', csrf, patch));
  if (!object(data) || !validProgress(data.progress)) throw new GameApiError(0, 'INVALID_RESPONSE', 'The profile response is invalid.');
  return data as unknown as { progress: PlayerProgress };
}

export async function putDraft(csrf: string, missionId: string, stepIndex: number, answers: Answers): Promise<Projection> {
  return validateProjection(await jsonRequest<unknown>(`${ROOT}/missions/${encodeURIComponent(missionId)}/draft`, writeOptions('PUT', csrf, { step_index: stepIndex, answers })));
}

export async function deleteDraft(csrf: string, missionId: string): Promise<Projection> {
  return validateProjection(await jsonRequest<unknown>(`${ROOT}/missions/${encodeURIComponent(missionId)}/draft`, writeOptions('DELETE', csrf)));
}

export async function postCompletion(csrf: string, missionId: string, answers: Answers, key: string): Promise<{ completion: Completion; replayed: boolean | null }> {
  return request(`${ROOT}/missions/${encodeURIComponent(missionId)}/completions`, writeOptions('POST', csrf, { answers }, { 'Idempotency-Key': key }), async (response) => {
    const data = await readJson<unknown>(response);
    validateProjection(data, true);
    if (!object(data) || !validEntry(data.entry) || !object(data.entry) || data.entry.missionId !== missionId) throw new GameApiError(0, 'INVALID_RESPONSE', 'The completion response is invalid.');
    const replay = response.headers.get('Idempotent-Replay');
    // A proxy may strip this header. The confirmed entry is still usable, but
    // an unknown projection may be a stale replay and must not replace totals.
    return { completion: data as unknown as Completion, replayed: replay === 'true' ? true : replay === 'false' ? false : null };
  });
}

/**
 * Dev/test-only JSON demo accounts. These IDs only populate the picker; the BFF
 * still authorizes every request from the signed HttpOnly cookie and visitor role.
 */
export async function getDemoUsers(): Promise<DemoUser[]> {
  const data = await request(`${ROOT}/demo-users`, { headers: { Accept: 'application/json' } }, async (response) => {
    try {
      return await readJson<unknown>(response);
    } catch (error) {
      // The route exists only in dev/test; elsewhere (or on an older backend)
      // the 404 is "demo sign-in is unavailable", not invalid player input.
      if (error instanceof GameApiError && error.status === 404) throw new GameApiError(404, 'DEMO_USERS_UNAVAILABLE', 'Demo accounts are not available on this server.');
      throw error;
    }
  });
  const users = object(data) && Array.isArray(data.users) ? data.users : null;
  if (!users || !users.every((user: unknown) => object(user) && string(user.id) && string(user.name))) {
    throw new GameApiError(0, 'INVALID_RESPONSE', 'The demo account list is invalid.');
  }
  const list = users
    .map((user) => ({ id: (user as { id: string }).id, label: (user as { name: string }).name.replace(/\s+/g, ' ').trim() }))
    .filter((user) => user.id && user.label);
  if (!list.length) throw new GameApiError(0, 'DEMO_USERS_UNAVAILABLE', 'No demo visitor accounts are available.');
  return list;
}

/**
 * JSON sign-in. The HttpOnly cookie is set by the response and the CSRF token is
 * returned in a header; neither is stored by this client. Bootstrap proves that
 * the cookie session really works before any player data is rendered.
 */
export async function demoLogin(userId: string): Promise<GameBootstrap> {
  await request(`${ROOT}/demo-login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  }, async (response) => {
    try {
      await readJson<unknown>(response);
    } catch (error) {
      // The JSON login route only exists in dev/test. Elsewhere the backend
      // answers 404, which would otherwise read as "wrong visitor".
      if (error instanceof GameApiError && error.status === 404) throw new GameApiError(404, 'DEMO_LOGIN_DISABLED', 'Demo sign-in is disabled on this server.');
      throw error;
    }
  });
  return getBootstrap();
}

/** Best-effort cookie logout; the caller falls back to the account picker regardless. */
export async function demoLogout(csrf: string): Promise<boolean> {
  const data = await jsonRequest<unknown>(`${ROOT}/logout`, { method: 'POST', headers: { 'X-CSRF-Token': csrf } });
  return object(data) && data.logged_out === true;
}
