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

export function getLevelDef(level: number, levels: readonly LevelDef[] = LEVELS): LevelDef {
  return levels.find((l) => l.level === level) ?? levels[0];
}

export function getLevelInfo(xp: number, levels: readonly LevelDef[] = LEVELS): LevelInfo {
  let current = levels[0];
  for (const def of levels) if (xp >= def.minXp) current = def;
  const next = levels.find((l) => l.level === current.level + 1) ?? null;
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
