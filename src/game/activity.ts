import { getAchievement } from './achievements';
import { getMission } from './missions';
import type { PlayerProgress, WeeklyQuests } from './types';

export type ActivityKind = 'mission' | 'quest' | 'achievement';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** ISO timestamp from the server (or the saved history). */
  at: string;
  title: string;
  detail: string;
  /** Game XP for this activity. Organizational points are never shown here. */
  xp: number | null;
}

/**
 * Recent activity, newest first. Built only from data the server returned: completed missions,
 * claimed weekly quests and unlocked achievements. Nothing here is computed on the client as a reward.
 */
export function buildActivity(progress: PlayerProgress, quests: WeeklyQuests | null, limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const entry of progress.history.slice(0, limit)) {
    items.push({
      id: `mission-${entry.id}`,
      kind: 'mission',
      at: entry.completedAt,
      title: getMission(entry.missionId)?.title ?? entry.missionId,
      detail: entry.wasDaily ? 'Daily challenge completed' : 'Mission completed',
      xp: entry.rewards.xp,
    });
  }

  for (const quest of quests?.quests ?? []) {
    if (!quest.claimed || !quest.claimedAt) continue;
    items.push({
      id: `quest-${quest.id}`,
      kind: 'quest',
      at: quest.claimedAt,
      title: quest.title,
      detail: 'Weekly quest claimed · DEMO',
      xp: quest.rewardXp,
    });
  }

  for (const [id, at] of Object.entries(progress.achievements)) {
    const achievement = getAchievement(id);
    if (!achievement) continue;
    items.push({
      id: `achievement-${id}`,
      kind: 'achievement',
      at,
      title: achievement.title,
      detail: 'Achievement unlocked',
      xp: null,
    });
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}

/** Short local date and time for an activity row (the viewer's own timezone). */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
