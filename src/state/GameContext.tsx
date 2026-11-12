import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ACHIEVEMENTS } from '../game/achievements';
import { completeMission, MissionError } from '../game/completeMission';
import { GAME_CONFIG } from '../game/config';
import { toDateKey } from '../game/dates';
import { getLevelInfo } from '../game/levels';
import { CATEGORIES, DIFFICULTY, getMission } from '../game/missions';
import { createInitialProgress, ensureDaily, getLockReason, getMissionViews, getPlayerStats } from '../game/progress';
import { clearProgress, isStorageAvailable, loadProgress, saveProgress, STORAGE_KEY } from '../game/storage';
import { getPurchased, getUnlockedSpecialMissions, purchaseOffer, STORE_OFFERS, StoreError } from '../game/store';
import type { Answers, AvatarId, HistoryEntry, PlayerProgress } from '../game/types';
import { localizeMissionView } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { GameContext, useToasts, type GameContextValue, type GameMode, type PersistenceState, type PurchaseOutcome } from './GameShared';
import { ServerGameProvider } from './ServerGameContext';

export { useGame } from './GameShared';

const MODE_KEY = 'sales-quest-arena:mode:v1';

function initialMode(): GameMode {
  // file:// has no same-origin HTTP backend and remains a device-only build.
  if (window.location.protocol === 'file:') return 'local';
  try {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (stored === 'local' || stored === 'server') return stored;
  } catch { /* A blocked preference must not block the local game. */ }
  return import.meta.env.VITE_GAME_MODE === 'server' ? 'server' : 'local';
}

/** The two modes never share progress. Switching modes never imports or removes a save. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const switchMode = useCallback((next: GameMode) => {
    try { window.localStorage.setItem(MODE_KEY, next); } catch { /* This choice lasts until reload. */ }
    navigate('/');
    setMode(next);
  }, []);
  return mode === 'server'
    ? <ServerGameProvider switchMode={switchMode}>{children}</ServerGameProvider>
    : <LocalGameProvider switchMode={switchMode}>{children}</LocalGameProvider>;
}

function LocalGameProvider({ children, switchMode }: { children: ReactNode; switchMode: (mode: GameMode) => void }) {
  const { language, t } = useLanguage();
  const [boot] = useState(() => {
    const loaded = loadProgress();
    return { progress: loaded.progress ?? createInitialProgress(), status: loaded.status };
  });
  const [progress, setProgress] = useState<PlayerProgress>(boot.progress);
  const [persistence, setPersistence] = useState<PersistenceState>(boot.status === 'unavailable' ? 'unavailable' : 'saved');
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const { toasts, toast } = useToasts();
  const ref = useRef(progress);

  const commit = useCallback((update: (p: PlayerProgress) => PlayerProgress): PlayerProgress => {
    const next = update(ref.current);
    if (next === ref.current) return next;
    ref.current = next;
    setProgress(next);
    const ok = saveProgress(next);
    setPersistence(ok ? 'saved' : isStorageAvailable() ? 'error' : 'unavailable');
    return next;
  }, []);

  useEffect(() => {
    const check = () => setTodayKey(toDateKey(new Date()));
    const timer = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);

  useEffect(() => { commit((p) => ensureDaily(p, todayKey)); }, [commit, todayKey]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || (e.key !== STORAGE_KEY && e.key !== null)) return;
      const loaded = loadProgress();
      const next = loaded.progress ?? (loaded.status === 'empty' ? createInitialProgress() : null);
      if (next) { ref.current = next; setProgress(next); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const completeOnboarding = useCallback(async (name: string, avatar: AvatarId) => {
    commit((p) => ({ ...p, player: { ...p.player, name: name.trim().slice(0, 24) || t('welcome.defaultName'), avatar, onboarded: true } }));
    return true;
  }, [commit, t]);

  const updatePlayer = useCallback(async (patch: { name?: string; avatar?: AvatarId }) => {
    commit((p) => ({ ...p, player: { ...p.player, ...(patch.avatar ? { avatar: patch.avatar } : {}), ...(patch.name !== undefined ? { name: patch.name.trim().slice(0, 24) || p.player.name } : {}) } }));
    return true;
  }, [commit]);

  const startMission = useCallback(async (missionId: string): Promise<boolean> => {
    const mission = getMission(missionId) ?? getUnlockedSpecialMissions(ref.current).find((item) => item.id === missionId);
    if (!mission || getLockReason(mission, ref.current)) return false;
    commit((p) => p.drafts[missionId] ? p : { ...p, drafts: { ...p.drafts, [missionId]: { missionId, stepIndex: 0, answers: {}, startedAt: new Date().toISOString() } } });
    return true;
  }, [commit]);

  const saveDraft = useCallback((missionId: string, stepIndex: number, answers: Answers) => {
    commit((p) => {
      const draft = p.drafts[missionId];
      return draft ? { ...p, drafts: { ...p.drafts, [missionId]: { ...draft, stepIndex, answers } } } : p;
    });
  }, [commit]);

  const flushDraft = useCallback(async () => true, []);
  const discardDraft = useCallback(async (missionId: string) => {
    commit((p) => {
      if (!p.drafts[missionId]) return p;
      const drafts = { ...p.drafts };
      delete drafts[missionId];
      return { ...p, drafts };
    });
    return true;
  }, [commit]);

  const finishMission = useCallback(async (missionId: string, answers: Answers): Promise<HistoryEntry | null> => {
    try {
      const result = completeMission(ref.current, missionId, answers, new Date());
      commit(() => result.progress);
      return result.entry;
    } catch (err) {
      const message = err instanceof MissionError && err.code === 'locked' ? t('play.locked') : err instanceof MissionError && err.code === 'incomplete' ? t('play.incomplete') : t('play.error');
      toast(message, 'warn');
      return null;
    }
  }, [commit, toast, t]);

  /**
   * Device-only demo purchase, written before it is adopted: the verified save
   * must contain the debited balance and the offer id, otherwise nothing changes
   * in memory either. A rejected purchase therefore never spends a coin.
   */
  const buyOffer = useCallback(async (offerId: string): Promise<PurchaseOutcome> => {
    let result;
    try {
      result = purchaseOffer(ref.current, offerId);
    } catch (error) {
      return { ok: false, error: error instanceof StoreError ? error.code : 'save_failed' };
    }
    // `saveProgress` reads the value back, so a partial or blocked write fails here.
    if (!saveProgress(result.progress) || !getPurchased(result.progress).includes(offerId)) {
      setPersistence(isStorageAvailable() ? 'error' : 'unavailable');
      return { ok: false, error: 'save_failed' };
    }
    ref.current = result.progress;
    setProgress(result.progress);
    setPersistence('saved');
    return { ok: true, result };
  }, []);

  const resetProgress = useCallback(() => {
    clearProgress();
    const fresh = ensureDaily(createInitialProgress(), toDateKey(new Date()));
    ref.current = fresh;
    setProgress(fresh);
    setPersistence(isStorageAvailable() ? 'saved' : 'unavailable');
  }, []);

  const missions = useMemo(() => getMissionViews(progress, todayKey).map((mission) => localizeMissionView(mission, progress, language)), [progress, todayKey, language]);
  const store = useMemo(() => ({ status: 'available' as const, offers: STORE_OFFERS, purchased: getPurchased(progress) }), [progress]);
  const refresh = useCallback(async () => true, []);
  const loadHistory = useCallback(async () => ({ items: ref.current.history, next_cursor: null }), []);
  const value = useMemo<GameContextValue>(() => ({
    mode: 'local', switchMode, account: null, changeAccount: () => {}, signOut: async () => false, progress, todayKey, serverClockOffset: 0,
    missions, config: GAME_CONFIG, categories: CATEGORIES, difficulty: DIFFICULTY, achievements: ACHIEVEMENTS,
    level: getLevelInfo(progress.xp), stats: getPlayerStats(progress, todayKey), persistence, sessionChanged: false, contractError: null, toasts, toast,
    completeOnboarding, updatePlayer, startMission, saveDraft, flushDraft, discardDraft, finishMission, resetProgress,
    store, buyOffer,
    lastResult: null, refresh, loadHistory,
  }), [switchMode, progress, todayKey, missions, persistence, toasts, toast, completeOnboarding, updatePlayer, startMission, saveDraft, flushDraft, discardDraft, finishMission, resetProgress, store, buyOffer, refresh, loadHistory]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
