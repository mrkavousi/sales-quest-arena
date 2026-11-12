import { findNewAchievements } from './achievements';
import { GAME_CONFIG } from './config';
import { daysBetween, toDateKey } from './dates';
import { getLevelInfo } from './levels';
import { collectFlags, getMission, getRating, isMissionComplete, sanitizeAnswers } from './missions';
import { ensureDaily, getLockReason } from './progress';
import { calculateRewards } from './rewards';
import type { Answers, HistoryEntry, PlayerProgress } from './types';

export class MissionError extends Error {}

export interface CompletionResult {
  progress: PlayerProgress;
  entry: HistoryEntry;
}

function makeId(now: Date): string {
  return `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The one place where a mission run turns into rewards.
 * Pure function: (progress, mission, answers, time) -> new progress + history entry.
 * A backend can run the exact same function to validate client results.
 */
export function completeMission(
  current: PlayerProgress,
  missionId: string,
  rawAnswers: Answers,
  now: Date = new Date(),
): CompletionResult {
  const mission = getMission(missionId);
  if (!mission) throw new MissionError(`Unknown mission: ${missionId}`);

  const lockReason = getLockReason(mission, current);
  if (lockReason) throw new MissionError(lockReason);

  const answers = sanitizeAnswers(mission, rawAnswers);
  if (!isMissionComplete(mission, answers)) {
    throw new MissionError('This mission still has unanswered challenges.');
  }

  const todayKey = toDateKey(now);
  const base = ensureDaily(current, todayKey);
  const isDaily = base.daily?.missionId === mission.id && !base.daily.completed;

  // 1. Rewards
  const flags = collectFlags(mission, answers);
  const rewards = calculateRewards({ mission, answers, flags: new Set(flags), isDaily });
  const xpAfter = base.xp + rewards.xp;
  const coinsAfter = base.coins + rewards.coins;

  // 2. Streak
  const last = base.streak.lastActiveDate;
  const gap = last ? daysBetween(last, todayKey) : null;
  const streakCount = gap === 0 ? base.streak.count : gap === 1 ? base.streak.count + 1 : 1;

  // 3. Mission record
  const previous = base.missions[mission.id];
  const rating = getRating(mission, answers);
  const bestRating = Math.max(previous?.bestRating ?? 0, rating ?? 0) || null;

  const drafts = { ...base.drafts };
  delete drafts[mission.id];

  const entry: HistoryEntry = {
    id: makeId(now),
    missionId: mission.id,
    completedAt: now.toISOString(),
    answers,
    flags,
    wasDaily: isDaily,
    rewards,
    xpBefore: base.xp,
    xpAfter,
    coinsAfter,
    levelBefore: getLevelInfo(base.xp).level,
    levelAfter: getLevelInfo(xpAfter).level,
    streakAfter: streakCount,
    achievementsUnlocked: [],
  };

  let next: PlayerProgress = {
    ...base,
    xp: xpAfter,
    coins: coinsAfter,
    streak: { count: streakCount, best: Math.max(base.streak.best, streakCount), lastActiveDate: todayKey },
    missions: {
      ...base.missions,
      [mission.id]: {
        completions: (previous?.completions ?? 0) + 1,
        firstCompletedAt: previous?.firstCompletedAt ?? entry.completedAt,
        lastCompletedAt: entry.completedAt,
        bestRating,
      },
    },
    drafts,
    daily: isDaily && base.daily ? { ...base.daily, completed: true } : base.daily,
    history: [entry, ...base.history].slice(0, GAME_CONFIG.history.maxEntries),
  };

  // 4. Achievements (evaluated against the updated progress)
  const unlocked = findNewAchievements(next);
  if (unlocked.length > 0) {
    entry.achievementsUnlocked = unlocked;
    const achievements = { ...next.achievements };
    for (const id of unlocked) achievements[id] = entry.completedAt;
    next = { ...next, achievements };
  }

  return { progress: next, entry };
}
