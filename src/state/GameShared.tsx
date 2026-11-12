import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { HistoryPage } from '../api/game';
import type { AchievementMeta } from '../game/achievements';
import type { GameConfig } from '../game/config';
import type { LevelInfo } from '../game/levels';
import type { CategoryMeta } from '../game/missions';
import type { PlayerStats } from '../game/progress';
import type { Answers, AvatarId, HistoryEntry, MissionCategory, MissionDifficulty, MissionView, PlayerProgress } from '../game/types';

export type GameMode = 'local' | 'server';
/** In server mode, saved means acknowledged by the BFF, not stored on the device. */
export type PersistenceState = 'saved' | 'saving' | 'unavailable' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'warn' | 'success';
}

export interface GameContextValue {
  mode: GameMode;
  switchMode: (mode: GameMode) => void;
  account: { id: string; account_name: string; role: string } | null;
  changeAccount: () => void;
  progress: PlayerProgress;
  todayKey: string;
  /** Server time offset from this device, used for the UTC countdown only. */
  serverClockOffset: number;
  missions: MissionView[];
  config: GameConfig;
  categories: Record<MissionCategory, CategoryMeta>;
  difficulty: Record<MissionDifficulty, { label: string; dots: number }>;
  achievements: AchievementMeta[];
  level: LevelInfo;
  stats: PlayerStats;
  persistence: PersistenceState;
  sessionChanged: boolean;
  contractError: 'UNSUPPORTED_VERSION' | 'INVALID_RESPONSE' | null;
  toasts: ToastMessage[];
  toast: (text: string, tone?: ToastMessage['tone']) => void;
  completeOnboarding: (name: string, avatar: AvatarId) => Promise<boolean>;
  updatePlayer: (patch: { name?: string; avatar?: AvatarId }) => Promise<boolean>;
  startMission: (missionId: string) => Promise<boolean>;
  saveDraft: (missionId: string, stepIndex: number, answers: Answers) => void;
  flushDraft: () => Promise<boolean>;
  discardDraft: (missionId: string, stepIndex: number, answers: Answers) => Promise<boolean>;
  finishMission: (missionId: string, answers: Answers) => Promise<HistoryEntry | null>;
  resetProgress: () => void;
  lastResult: HistoryEntry | null;
  refresh: () => Promise<boolean>;
  loadHistory: (cursor?: string) => Promise<HistoryPage | null>;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used inside <GameProvider>');
  return context;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const toast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3200);
  }, []);
  return { toasts, toast };
}
