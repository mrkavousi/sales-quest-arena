import { GAME_CONFIG } from './config';

export interface LevelDef {
  level: number;
  title: string;
  minXp: number;
  color: string;
}

export const LEVELS: readonly LevelDef[] = GAME_CONFIG.levels;

export interface LevelInfo extends LevelDef {
  /** XP threshold of the next level, or null at max level. */
  nextMinXp: number | null;
  nextTitle: string | null;
  xpIntoLevel: number;
  xpForLevel: number;
  /** 0..1 */
  progress: number;
  isMax: boolean;
}

export function getLevelDef(level: number): LevelDef {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0];
}

export function getLevelInfo(xp: number): LevelInfo {
  let current = LEVELS[0];
  for (const def of LEVELS) if (xp >= def.minXp) current = def;
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  if (!next) {
    return { ...current, nextMinXp: null, nextTitle: null, xpIntoLevel: xp - current.minXp, xpForLevel: 0, progress: 1, isMax: true };
  }
  const xpForLevel = next.minXp - current.minXp;
  const xpIntoLevel = xp - current.minXp;
  return {
    ...current,
    nextMinXp: next.minXp,
    nextTitle: next.title,
    xpIntoLevel,
    xpForLevel,
    progress: Math.min(1, Math.max(0, xpIntoLevel / xpForLevel)),
    isMax: false,
  };
}
