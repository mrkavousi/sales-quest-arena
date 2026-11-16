import { getLevelInfo } from './levels';
import { MISSIONS } from './missions';
import type { PlayerProgress } from './types';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Badge colors [light, dark]. */
  colors: [string, string];
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
    title: 'اولین قدم‌ها',
    description: 'اولین مأموریت خود را کامل کنید.',
    emoji: '👟',
    colors: ['#7ad7ff', '#2ea8ff'],
    isUnlocked: (p) => p.history.length >= 1,
  },
  {
    id: 'deal_maker',
    title: 'عقدکنندهٔ قرارداد',
    description: 'مأموریتی ثبت کنید که در آن سفارش گرفته‌اید.',
    emoji: '🛒',
    colors: ['#7ee6a8', '#2fbf71'],
    isUnlocked: (p) => countFlag(p, 'order_received') >= 1,
  },
  {
    id: 'five_star',
    title: 'ویزیتور پنج‌ستاره',
    description: 'به یک مأموریت امتیاز کامل ۵ ستاره بدهید.',
    emoji: '⭐',
    colors: ['#ffe07a', '#ffb81f'],
    isUnlocked: (p) => countFlag(p, 'five_star') >= 1,
  },
  {
    id: 'daily_hero',
    title: 'قهرمان روزانه',
    description: 'یک مأموریت روزانه را کامل کنید.',
    emoji: '☀️',
    colors: ['#ffc98a', '#ff8f3d'],
    isUnlocked: (p) => p.history.some((h) => h.wasDaily),
  },
  {
    id: 'storyteller',
    title: 'قصه‌گو',
    description: 'به ۳ مأموریت یادداشت اضافه کنید.',
    emoji: '📝',
    colors: ['#c9b3ff', '#9366ff'],
    isUnlocked: (p) => countFlag(p, 'note_added') >= 3,
    progress: (p) => ({ current: countFlag(p, 'note_added'), target: 3 }),
  },
  {
    id: 'high_five',
    title: 'پنج‌تایی',
    description: '۵ مأموریت را کامل کنید.',
    emoji: '🖐️',
    colors: ['#ffb3c4', '#ff6b8e'],
    isUnlocked: (p) => p.history.length >= 5,
    progress: (p) => ({ current: p.history.length, target: 5 }),
  },
  {
    id: 'on_fire',
    title: 'در اوج',
    description: 'به ۳ روز فعالیت پیاپی برسید.',
    emoji: '🔥',
    colors: ['#ffb08a', '#ff6a3d'],
    isUnlocked: (p) => p.streak.best >= 3,
    progress: (p) => ({ current: p.streak.best, target: 3 }),
  },
  {
    id: 'explorer',
    title: 'کاوشگر در حال رشد',
    description: 'به سطح ۲ برسید.',
    emoji: '🧭',
    colors: ['#8fe3d6', '#19c9b2'],
    isUnlocked: (p) => getLevelInfo(p.xp).level >= 2,
  },
  {
    id: 'trailblazer',
    title: 'راه‌گشا',
    description: 'همهٔ مأموریت‌های نقشه را کامل کنید.',
    emoji: '🗺️',
    colors: ['#a9b8ff', '#5b3df5'],
    isUnlocked: (p) => uniqueMissionsDone(p) >= MISSIONS.length,
    progress: (p) => ({ current: uniqueMissionsDone(p), target: MISSIONS.length }),
  },
  {
    id: 'champion',
    title: 'قهرمان',
    description: 'به سطح ۵ برسید.',
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
