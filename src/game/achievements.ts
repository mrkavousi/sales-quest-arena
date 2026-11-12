import { getLevelInfo } from './levels';
import { MISSIONS } from './missions';
import type { PlayerProgress } from './types';

export interface AchievementMeta {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Badge colors [light, dark]. */
  colors: [string, string];
}

export interface AchievementDef extends AchievementMeta {
  isUnlocked: (p: PlayerProgress) => boolean;
  /** Optional counter shown on locked badges. */
  progress?: (p: PlayerProgress) => { current: number; target: number };
}

const countFlag = (p: PlayerProgress, flag: string) => p.history.filter((h) => h.flags.includes(flag)).length;
const uniqueMissionsDone = (p: PlayerProgress) => MISSIONS.filter((m) => (p.missions[m.id]?.completions ?? 0) > 0).length;

/** Append new badges here; they are evaluated automatically after every mission. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first mission.',
    emoji: '👟',
    colors: ['#7ad7ff', '#2ea8ff'],
    isUnlocked: (p) => p.history.length >= 1,
  },
  {
    id: 'deal_maker',
    title: 'Deal Maker',
    description: 'Log a mission where you received an order.',
    emoji: '🛒',
    colors: ['#7ee6a8', '#2fbf71'],
    isUnlocked: (p) => countFlag(p, 'order_received') >= 1,
  },
  {
    id: 'five_star',
    title: 'Five-Star Rep',
    description: 'Rate a mission a full 5 stars.',
    emoji: '⭐',
    colors: ['#ffe07a', '#ffb81f'],
    isUnlocked: (p) => countFlag(p, 'five_star') >= 1,
  },
  {
    id: 'daily_hero',
    title: 'Daily Hero',
    description: 'Complete a daily challenge.',
    emoji: '☀️',
    colors: ['#ffc98a', '#ff8f3d'],
    isUnlocked: (p) => p.history.some((h) => h.wasDaily),
  },
  {
    id: 'storyteller',
    title: 'Storyteller',
    description: 'Add a note to 3 missions.',
    emoji: '📝',
    colors: ['#c9b3ff', '#9366ff'],
    isUnlocked: (p) => countFlag(p, 'note_added') >= 3,
    progress: (p) => ({ current: countFlag(p, 'note_added'), target: 3 }),
  },
  {
    id: 'high_five',
    title: 'High Five',
    description: 'Complete 5 missions.',
    emoji: '🖐️',
    colors: ['#ffb3c4', '#ff6b8e'],
    isUnlocked: (p) => p.history.length >= 5,
    progress: (p) => ({ current: p.history.length, target: 5 }),
  },
  {
    id: 'on_fire',
    title: 'On Fire',
    description: 'Reach a 3-day streak.',
    emoji: '🔥',
    colors: ['#ffb08a', '#ff6a3d'],
    isUnlocked: (p) => p.streak.best >= 3,
    progress: (p) => ({ current: p.streak.best, target: 3 }),
  },
  {
    id: 'explorer',
    title: 'Rising Explorer',
    description: 'Reach Level 2.',
    emoji: '🧭',
    colors: ['#8fe3d6', '#19c9b2'],
    isUnlocked: (p) => getLevelInfo(p.xp).level >= 2,
  },
  {
    id: 'trailblazer',
    title: 'Trailblazer',
    description: 'Complete every mission on the map.',
    emoji: '🗺️',
    colors: ['#a9b8ff', '#5b3df5'],
    isUnlocked: (p) => uniqueMissionsDone(p) >= MISSIONS.length,
    progress: (p) => ({ current: uniqueMissionsDone(p), target: MISSIONS.length }),
  },
  {
    id: 'champion',
    title: 'Champion',
    description: 'Reach Level 5.',
    emoji: '👑',
    colors: ['#ffe07a', '#f59e0b'],
    isUnlocked: (p) => getLevelInfo(p.xp).level >= 5,
  },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Ids of achievements whose condition is met but that are not stored yet. */
export function findNewAchievements(p: PlayerProgress): string[] {
  return ACHIEVEMENTS.filter((a) => !p.achievements[a.id] && a.isUnlocked(p)).map((a) => a.id);
}
