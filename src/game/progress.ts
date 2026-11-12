import { daysBetween, toDateKey } from './dates';
import { getLevelInfo } from './levels';
import { MISSIONS, getMission } from './missions';
import type { AvatarId, DailyChallengeState, Mission, MissionStatus, MissionView, PlayerProgress } from './types';

export const AVATAR_IDS: AvatarId[] = ['fox', 'bear', 'cat', 'bunny', 'panda', 'frog'];

export function createInitialProgress(now: Date = new Date()): PlayerProgress {
  return {
    version: 1,
    player: { name: '', avatar: 'fox', onboarded: false, createdAt: now.toISOString() },
    xp: 0,
    coins: 0,
    streak: { count: 0, best: 0, lastActiveDate: null },
    missions: {},
    drafts: {},
    daily: null,
    achievements: {},
    history: [],
    // Older saves predate the demo store; an empty list means nothing bought.
    store: { purchased: [] },
  };
}

/* ---------- Mission status ---------- */

export type LockRequirement = { type: 'mission'; missionId: string } | { type: 'level'; level: number };

/** Structured requirements let the UI translate them without parsing English text. */
export function getLockRequirement(mission: Mission, p: PlayerProgress): LockRequirement | null {
  const { afterMission, minLevel } = mission.unlock;
  if (afterMission && !(p.missions[afterMission]?.completions > 0)) return { type: 'mission', missionId: afterMission };
  if (minLevel && getLevelInfo(p.xp).level < minLevel) return { type: 'level', level: minLevel };
  return null;
}

export function getLockReason(mission: Mission, p: PlayerProgress): string | null {
  const requirement = getLockRequirement(mission, p);
  if (requirement?.type === 'mission') return `Complete “${getMission(requirement.missionId)?.title ?? requirement.missionId}” to unlock`;
  if (requirement?.type === 'level') return `Reach Level ${requirement.level} to unlock`;
  return null;
}

export function getMissionStatus(mission: Mission, p: PlayerProgress): MissionStatus {
  if (getLockReason(mission, p)) return 'locked';
  if (p.drafts[mission.id]) return 'in_progress';
  if (p.missions[mission.id]?.completions > 0) return 'completed';
  return 'available';
}

export function getMissionView(mission: Mission, p: PlayerProgress, todayKey: string): MissionView {
  const record = p.missions[mission.id];
  const draft = p.drafts[mission.id];
  const isDaily = p.daily?.date === todayKey && p.daily.missionId === mission.id;
  return {
    ...mission,
    status: getMissionStatus(mission, p),
    completions: record?.completions ?? 0,
    bestRating: record?.bestRating ?? null,
    lockReason: getLockReason(mission, p),
    draftProgress: draft ? Math.min(1, draft.stepIndex / mission.steps.length) : 0,
    isDaily,
    dailyDone: isDaily && !!p.daily?.completed,
  };
}

export function getMissionViews(p: PlayerProgress, todayKey: string): MissionView[] {
  return [...MISSIONS].sort((a, b) => a.order - b.order).map((m) => getMissionView(m, p, todayKey));
}

/** The mission the map should point the player at next. */
export function getActiveMissionId(views: MissionView[]): string | null {
  const inProgress = views.find((v) => v.status === 'in_progress');
  if (inProgress) return inProgress.id;
  const fresh = views.find((v) => v.status === 'available');
  if (fresh) return fresh.id;
  const daily = views.find((v) => v.isDaily && !v.dailyDone && v.status !== 'locked');
  return daily?.id ?? null;
}

/* ---------- Streak ---------- */

/** A streak silently expires when a full day was missed. */
export function getCurrentStreak(p: PlayerProgress, todayKey: string): number {
  if (!p.streak.lastActiveDate) return 0;
  return daysBetween(p.streak.lastActiveDate, todayKey) <= 1 ? p.streak.count : 0;
}

export function isStreakSafeToday(p: PlayerProgress, todayKey: string): boolean {
  return p.streak.lastActiveDate === todayKey;
}

/* ---------- Daily challenge ---------- */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic pick among the missions the player has unlocked. */
export function pickDailyMission(p: PlayerProgress, todayKey: string): string {
  const unlocked = MISSIONS.filter((m) => !getLockReason(m, p));
  const pool = unlocked.length > 0 ? unlocked : [MISSIONS[0]];
  return pool[hashString(todayKey) % pool.length].id;
}

/** Returns the same object when today's challenge already exists. */
export function ensureDaily(p: PlayerProgress, todayKey: string): PlayerProgress {
  if (p.daily?.date === todayKey && getMission(p.daily.missionId)) return p;
  const daily: DailyChallengeState = { date: todayKey, missionId: pickDailyMission(p, todayKey), completed: false };
  return { ...p, daily };
}

/* ---------- Stats ---------- */

export interface PlayerStats {
  missionsCompleted: number;
  totalXp: number;
  coins: number;
  streak: number;
  bestStreak: number;
  achievements: number;
  ordersLogged: number;
}

export function getPlayerStats(p: PlayerProgress, todayKey: string = toDateKey(new Date())): PlayerStats {
  return {
    missionsCompleted: Object.values(p.missions).reduce((total, mission) => total + (Number.isFinite(mission?.completions) ? Math.max(0, mission.completions) : 0), 0),
    totalXp: p.xp,
    coins: p.coins,
    streak: getCurrentStreak(p, todayKey),
    bestStreak: p.streak.best,
    achievements: Object.keys(p.achievements).length,
    ordersLogged: p.history.filter((h) => h.flags.includes('order_received')).length,
  };
}
