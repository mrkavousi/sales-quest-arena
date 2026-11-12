import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { completeMission, MissionError } from '../game/completeMission';
import { toDateKey } from '../game/dates';
import { getLevelInfo, type LevelInfo } from '../game/levels';
import { getMission } from '../game/missions';
import { createInitialProgress, ensureDaily, getLockReason, getMissionViews, getPlayerStats, type PlayerStats } from '../game/progress';
import { clearProgress, isStorageAvailable, loadProgress, saveProgress, STORAGE_KEY } from '../game/storage';
import type { Answers, AvatarId, HistoryEntry, MissionView, PlayerProgress } from '../game/types';
import { localizeMissionView } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';

/** 'saved' = verified on disk · 'unavailable' = browser blocks storage · 'error' = last write failed */
export type PersistenceState = 'saved' | 'unavailable' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'warn' | 'success';
}

interface GameContextValue {
  progress: PlayerProgress;
  todayKey: string;
  missions: MissionView[];
  level: LevelInfo;
  stats: PlayerStats;
  persistence: PersistenceState;
  toasts: ToastMessage[];
  toast: (text: string, tone?: ToastMessage['tone']) => void;
  completeOnboarding: (name: string, avatar: AvatarId) => void;
  updatePlayer: (patch: { name?: string; avatar?: AvatarId }) => void;
  startMission: (missionId: string) => boolean;
  saveDraft: (missionId: string, stepIndex: number, answers: Answers) => void;
  discardDraft: (missionId: string) => void;
  finishMission: (missionId: string, answers: Answers) => HistoryEntry | null;
  resetProgress: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage();
  const [boot] = useState(() => {
    const loaded = loadProgress();
    return { progress: loaded.progress ?? createInitialProgress(), status: loaded.status };
  });
  const [progress, setProgress] = useState<PlayerProgress>(boot.progress);
  const [persistence, setPersistence] = useState<PersistenceState>(boot.status === 'unavailable' ? 'unavailable' : 'saved');
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const ref = useRef(progress);
  const toastId = useRef(0);

  const toast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  /** Single write path: update memory, then persist and verify. */
  const commit = useCallback((update: (p: PlayerProgress) => PlayerProgress): PlayerProgress => {
    const next = update(ref.current);
    if (next === ref.current) return next;
    ref.current = next;
    setProgress(next);
    const ok = saveProgress(next);
    setPersistence(ok ? 'saved' : isStorageAvailable() ? 'error' : 'unavailable');
    return next;
  }, []);

  // Keep "today" fresh so streaks and the daily challenge roll over at midnight.
  useEffect(() => {
    const check = () => setTodayKey(toDateKey(new Date()));
    const timer = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  useEffect(() => {
    commit((p) => ensureDaily(p, todayKey));
  }, [commit, todayKey]);

  // If the save was changed in another tab, follow it instead of overwriting it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || (e.key !== STORAGE_KEY && e.key !== null)) return;
      const loaded = loadProgress();
      const next = loaded.progress ?? (loaded.status === 'empty' ? createInitialProgress() : null);
      if (next) {
        ref.current = next;
        setProgress(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const completeOnboarding = useCallback(
    (name: string, avatar: AvatarId) => {
      commit((p) => ({ ...p, player: { ...p.player, name: name.trim().slice(0, 24) || t('welcome.defaultName'), avatar, onboarded: true } }));
    },
    [commit, t],
  );

  const updatePlayer = useCallback(
    (patch: { name?: string; avatar?: AvatarId }) => {
      commit((p) => ({
        ...p,
        player: {
          ...p.player,
          ...(patch.avatar ? { avatar: patch.avatar } : {}),
          ...(patch.name !== undefined ? { name: patch.name.trim().slice(0, 24) || p.player.name } : {}),
        },
      }));
    },
    [commit],
  );

  const startMission = useCallback(
    (missionId: string): boolean => {
      const mission = getMission(missionId);
      if (!mission || getLockReason(mission, ref.current)) return false;
      commit((p) =>
        p.drafts[missionId]
          ? p
          : { ...p, drafts: { ...p.drafts, [missionId]: { missionId, stepIndex: 0, answers: {}, startedAt: new Date().toISOString() } } },
      );
      return true;
    },
    [commit],
  );

  const saveDraft = useCallback(
    (missionId: string, stepIndex: number, answers: Answers) => {
      commit((p) => {
        const draft = p.drafts[missionId];
        if (!draft) return p;
        return { ...p, drafts: { ...p.drafts, [missionId]: { ...draft, stepIndex, answers } } };
      });
    },
    [commit],
  );

  const discardDraft = useCallback(
    (missionId: string) => {
      commit((p) => {
        if (!p.drafts[missionId]) return p;
        const drafts = { ...p.drafts };
        delete drafts[missionId];
        return { ...p, drafts };
      });
    },
    [commit],
  );

  const finishMission = useCallback(
    (missionId: string, answers: Answers): HistoryEntry | null => {
      try {
        const result = completeMission(ref.current, missionId, answers, new Date());
        commit(() => result.progress);
        return result.entry;
      } catch (err) {
        const message = err instanceof MissionError && err.code === 'locked'
          ? t('play.locked')
          : err instanceof MissionError && err.code === 'incomplete'
            ? t('play.incomplete')
            : t('play.error');
        toast(message, 'warn');
        return null;
      }
    },
    [commit, toast, t],
  );

  const resetProgress = useCallback(() => {
    clearProgress();
    const fresh = ensureDaily(createInitialProgress(), toDateKey(new Date()));
    ref.current = fresh;
    setProgress(fresh);
    setPersistence(isStorageAvailable() ? 'saved' : 'unavailable');
  }, []);

  const missions = useMemo(
    () => getMissionViews(progress, todayKey).map((mission) => localizeMissionView(mission, progress, language)),
    [progress, todayKey, language],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      progress,
      todayKey,
      missions,
      level: getLevelInfo(progress.xp),
      stats: getPlayerStats(progress, todayKey),
      persistence,
      toasts,
      toast,
      completeOnboarding,
      updatePlayer,
      startMission,
      saveDraft,
      discardDraft,
      finishMission,
      resetProgress,
    }),
    [progress, todayKey, missions, persistence, toasts, toast, completeOnboarding, updatePlayer, startMission, saveDraft, discardDraft, finishMission, resetProgress],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
