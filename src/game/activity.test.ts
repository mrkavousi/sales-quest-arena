import { describe, expect, it } from 'vitest';
import { buildActivity } from './activity';
import { createInitialProgress } from './progress';
import type { HistoryEntry, PlayerProgress, WeeklyQuests } from './types';

function entry(id: string, missionId: string, completedAt: string, xp = 100): HistoryEntry {
  return {
    id,
    missionId,
    completedAt,
    answers: {},
    flags: [],
    wasDaily: false,
    rewards: { lines: [], xp, coins: 20 },
    xpBefore: 0,
    xpAfter: xp,
    coinsAfter: 20,
    levelBefore: 1,
    levelAfter: 1,
    streakAfter: 1,
    achievementsUnlocked: [],
  } as unknown as HistoryEntry;
}

function quests(claimedAt: string | null): WeeklyQuests {
  return {
    label: 'DEMO',
    weekKey: '2026-W47',
    weekStart: '2026-11-16',
    weekEnd: '2026-11-22',
    quests: [
      {
        id: 'weekly-momentum',
        title: 'Weekly Momentum',
        description: '',
        icon: 'target',
        objective: { type: 'completions', target: 5 },
        progress: 5,
        target: 5,
        complete: true,
        status: claimedAt ? 'claimed' : 'claimable',
        claimed: !!claimedAt,
        claimedAt,
        rewardXp: 150,
      },
    ],
  };
}

describe('buildActivity', () => {
  it('lists missions, quest claims and achievements newest first, with game XP only', () => {
    const progress: PlayerProgress = {
      ...createInitialProgress(new Date(2026, 10, 16)),
      history: [
        entry('b', 'customer-visit-challenge', '2026-11-17T09:00:00+00:00', 100),
        entry('a', 'product-spotlight', '2026-11-16T09:00:00+00:00', 100),
      ],
      achievements: { first_steps: '2026-11-16T09:00:00+00:00' },
    };

    const items = buildActivity(progress, quests('2026-11-18T08:00:00+00:00'));

    expect(items.map((item) => item.kind)).toEqual(['quest', 'mission', 'mission', 'achievement']);
    expect(items[0]).toMatchObject({ title: 'Weekly Momentum', xp: 150 });
    expect(items[1]).toMatchObject({ title: 'Customer Visit Challenge', xp: 100 });
    expect(items.every((item) => item.xp === null || item.xp >= 0)).toBe(true);
  });

  it('skips quests that are not claimed and unknown achievement ids', () => {
    const progress: PlayerProgress = {
      ...createInitialProgress(new Date(2026, 10, 16)),
      achievements: { not_a_real_badge: '2026-11-16T09:00:00+00:00' },
    };

    expect(buildActivity(progress, quests(null))).toEqual([]);
  });

  it('respects the limit', () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      entry(`h${i}`, 'customer-visit-challenge', `2026-11-${String(10 + i).padStart(2, '0')}T09:00:00+00:00`),
    );
    const progress: PlayerProgress = { ...createInitialProgress(new Date(2026, 10, 16)), history };

    expect(buildActivity(progress, null, 8)).toHaveLength(8);
  });
});
