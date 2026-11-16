import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { api, ApiError, newIdempotencyKey, setCsrfToken } from '../api/client';
import { getLevelInfo } from '../game/levels';
import { getMission, registerMissions, sanitizeAnswers } from '../game/missions';
import { getPlayerStats } from '../game/progress';
import type { Answers, AvatarId, HistoryEntry, Mission, MissionView, PlayerProgress, QuestClaim, WeeklyQuests } from '../game/types';
import { useSession } from './SessionContext';
import { GameContext, type GameContextValue, type ToastMessage } from './GameContext';

interface Snapshot {
  progress: PlayerProgress;
  missions: MissionView[];
  quests: WeeklyQuests | null;
  dateKey: string;
}

interface Bootstrap {
  csrf_token: string;
  date_key: string;
  progress: PlayerProgress;
  missions: MissionView[];
  quests?: WeeklyQuests;
}

interface MissionsPayload {
  progress: PlayerProgress;
  missions: MissionView[];
  quests?: WeeklyQuests;
  date_key?: string;
}

interface CompletionPayload extends MissionsPayload {
  entry: HistoryEntry;
}

interface QuestClaimPayload extends MissionsPayload {
  claim: QuestClaim;
}

const DRAFT_DEBOUNCE_MS = 450;

/**
 * Server-authoritative game state (Kiloos demo).
 *
 * The browser only sends answers. XP, coins, level, streak, achievements and organizational
 * points are computed and persisted by the backend and arrive in the response; the local copy
 * is replaced by whatever the server returns. Drafts are saved optimistically and in the
 * background so the UI never waits on the network between challenges.
 */
export function ServerGameProvider({ children }: { children: ReactNode }) {
  const { logout } = useSession();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const snapRef = useRef<Snapshot | null>(null);
  const draftTimers = useRef(new Map<string, number>());
  const draftInflight = useRef(new Map<string, Promise<unknown>>());
  const completionKeys = useRef(new Map<string, string>());
  const claimKeys = useRef(new Map<string, string>());

  const toast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  const apply = useCallback((payload: MissionsPayload) => {
    registerMissions(payload.missions as unknown as Mission[]);
    const prev = snapRef.current;
    const next: Snapshot = {
      progress: payload.progress,
      missions: payload.missions,
      quests: payload.quests ?? prev?.quests ?? null,
      dateKey: payload.date_key ?? prev?.dateKey ?? new Date().toISOString().slice(0, 10),
    };
    snapRef.current = next;
    // Commit before the caller navigates: the result screen must already see the new history entry.
    flushSync(() => setSnap(next));
  }, []);

  const load = useCallback(async () => {
    setBootError(null);
    try {
      const boot = await api.get<Bootstrap>('/api/v1/game/bootstrap');
      setCsrfToken(boot.csrf_token);
      apply(boot);
    } catch (err) {
      setBootError(err instanceof Error ? err.message : 'بارگذاری بازی ممکن نشد.');
    }
  }, [apply]);

  useEffect(() => {
    void load();
    const timers = draftTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [load]);

  /** Patch only the local, optimistic part (drafts). Rewards are never touched here. */
  const patchProgress = useCallback((update: (p: PlayerProgress) => PlayerProgress) => {
    const current = snapRef.current;
    if (!current) return;
    const next = { ...current, progress: update(current.progress) };
    snapRef.current = next;
    setSnap(next);
  }, []);

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401) return; // SessionContext shows the "session expired" screen.
        toast(err.isNetwork ? 'ارتباط با سرور برقرار نشد؛ اتصال را بررسی کنید و دوباره تلاش کنید.' : err.message, 'warn');
        return;
      }
      toast(fallback, 'warn');
    },
    [toast],
  );

  const completeOnboarding = useCallback(
    (name: string, avatar: AvatarId) => {
      void api
        .patch<{ progress: PlayerProgress }>('/api/v1/game/profile', { name: name.trim().slice(0, 24) || 'Rookie', avatar })
        .then((r) => patchProgress(() => r.progress))
        .catch((err) => fail(err, 'ذخیرهٔ پروفایل ممکن نشد.'));
    },
    [fail, patchProgress],
  );

  const updatePlayer = useCallback(
    (patch: { name?: string; avatar?: AvatarId }) => {
      const body: { name?: string; avatar?: AvatarId } = {};
      if (patch.avatar) body.avatar = patch.avatar;
      if (patch.name !== undefined && patch.name.trim()) body.name = patch.name.trim().slice(0, 24);
      if (!body.name && !body.avatar) return;
      void api
        .patch<{ progress: PlayerProgress }>('/api/v1/game/profile', body)
        .then((r) => patchProgress(() => r.progress))
        .catch((err) => fail(err, 'ذخیرهٔ پروفایل ممکن نشد.'));
    },
    [fail, patchProgress],
  );

  const sendDraft = useCallback(
    (missionId: string) => {
      const draft = snapRef.current?.progress.drafts[missionId];
      if (!draft) return Promise.resolve();
      const request = api
        .put(`/api/v1/game/missions/${missionId}/draft`, { step_index: draft.stepIndex, answers: draft.answers })
        .catch((err) => fail(err, 'ذخیرهٔ پیشرفت ممکن نشد.'))
        .finally(() => {
          if (draftInflight.current.get(missionId) === request) draftInflight.current.delete(missionId);
        });
      draftInflight.current.set(missionId, request);
      return request;
    },
    [fail],
  );

  const scheduleDraft = useCallback(
    (missionId: string) => {
      const timers = draftTimers.current;
      window.clearTimeout(timers.get(missionId));
      timers.set(
        missionId,
        window.setTimeout(() => {
          timers.delete(missionId);
          void sendDraft(missionId);
        }, DRAFT_DEBOUNCE_MS),
      );
    },
    [sendDraft],
  );

  const startMission = useCallback(
    (missionId: string): boolean => {
      const view = snapRef.current?.missions.find((m) => m.id === missionId);
      if (!view || view.status === 'locked' || (view.status === 'completed' && view.lockReason)) return false;
      if (!snapRef.current?.progress.drafts[missionId]) {
        patchProgress((p) => ({
          ...p,
          drafts: { ...p.drafts, [missionId]: { missionId, stepIndex: 0, answers: {}, startedAt: new Date().toISOString() } },
        }));
        scheduleDraft(missionId);
      }
      return true;
    },
    [patchProgress, scheduleDraft],
  );

  const saveDraft = useCallback(
    (missionId: string, stepIndex: number, answers: Answers) => {
      patchProgress((p) => {
        const draft = p.drafts[missionId];
        if (!draft) return p;
        return { ...p, drafts: { ...p.drafts, [missionId]: { ...draft, stepIndex, answers } } };
      });
      scheduleDraft(missionId);
    },
    [patchProgress, scheduleDraft],
  );

  const discardDraft = useCallback(
    (missionId: string) => {
      window.clearTimeout(draftTimers.current.get(missionId));
      draftTimers.current.delete(missionId);
      patchProgress((p) => {
        if (!p.drafts[missionId]) return p;
        const drafts = { ...p.drafts };
        delete drafts[missionId];
        return { ...p, drafts };
      });
      void api.del(`/api/v1/game/missions/${missionId}/draft`).catch((err) => fail(err, 'حذف پیش‌نویس ممکن نشد.'));
    },
    [fail, patchProgress],
  );

  const finishMission = useCallback(
    async (missionId: string, rawAnswers: Answers): Promise<HistoryEntry | null> => {
      const mission = getMission(missionId);
      if (!mission) return null;
      // A pending draft write must not race the completion and resurrect the draft afterwards.
      window.clearTimeout(draftTimers.current.get(missionId));
      draftTimers.current.delete(missionId);
      await draftInflight.current.get(missionId);

      const answers = sanitizeAnswers(mission, rawAnswers);
      // Same answers => same key, so tapping "Complete" again after a network error is a safe replay.
      const fingerprint = `${missionId}:${JSON.stringify(answers)}`;
      let key = completionKeys.current.get(fingerprint);
      if (!key) {
        key = newIdempotencyKey();
        completionKeys.current.set(fingerprint, key);
      }
      try {
        const result = await api.post<CompletionPayload>(`/api/v1/game/missions/${missionId}/completions`, { answers }, { idempotencyKey: key });
        completionKeys.current.delete(fingerprint);
        apply(result);
        return result.entry;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          completionKeys.current.delete(fingerprint);
          toast(err.message, 'warn');
          void load();
        } else if (err instanceof ApiError && err.isNetwork) {
          toast('ارتباط قطع شد؛ پاسخ‌های شما حفظ شده است. دوباره «تکمیل مأموریت» را بزنید؛ پاداش دوبار پرداخت نمی‌شود.', 'warn');
        } else {
          fail(err, 'سرور این مأموریت را تأیید نکرد. دوباره تلاش کنید.');
        }
        return null;
      }
    },
    [apply, fail, load, toast],
  );

  const claimQuest = useCallback(
    async (questId: string): Promise<QuestClaim | null> => {
      // Same claim, same key: tapping again after a dropped connection replays the stored result.
      let key = claimKeys.current.get(questId);
      if (!key) {
        key = newIdempotencyKey();
        claimKeys.current.set(questId, key);
      }
      try {
        const result = await api.post<QuestClaimPayload>(`/api/v1/game/quests/${questId}/claim`, {}, { idempotencyKey: key });
        claimKeys.current.delete(questId);
        apply(result);
        return result.claim;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          claimKeys.current.delete(questId);
          toast(err.message, 'warn');
          void load();
        } else if (err instanceof ApiError && err.isNetwork) {
          toast('ارتباط قطع شد؛ چالش همچنان قابل دریافت است. دوباره تلاش کنید؛ پاداش دوبار پرداخت نمی‌شود.', 'warn');
        } else {
          fail(err, 'سرور این چالش را تأیید نکرد. دوباره تلاش کنید.');
        }
        return null;
      }
    },
    [apply, fail, load, toast],
  );

  const resetProgress = useCallback(() => {
    toast('پیشرفت تأییدشده توسط سرور از داخل برنامه بازنشانی نمی‌شود.', 'info');
  }, [toast]);

  const progress = snap?.progress;
  const todayKey = snap?.dateKey ?? '';
  const quests = snap?.quests ?? null;
  const value = useMemo<GameContextValue | null>(() => {
    if (!snap || !progress) return null;
    return {
      mode: 'server',
      progress,
      todayKey,
      missions: snap.missions,
      level: getLevelInfo(progress.xp),
      stats: getPlayerStats(progress, todayKey),
      persistence: 'saved',
      toasts,
      toast,
      completeOnboarding,
      updatePlayer,
      startMission,
      saveDraft,
      discardDraft,
      finishMission,
      resetProgress,
      quests,
      claimQuest,
    };
  }, [snap, progress, todayKey, quests, toasts, toast, completeOnboarding, updatePlayer, startMission, saveDraft, discardDraft, finishMission, resetProgress, claimQuest]);

  if (!value) {
    return (
      <div className="boot" role="status" aria-live="polite">
        {bootError ? (
          <>
            <h1>بارگذاری بازی ممکن نشد</h1>
            <p>{bootError}</p>
            <div className="boot__actions">
              <button className="btn btn--green" onClick={() => void load()}>
                تلاش دوباره
              </button>
              <button className="btn btn--ghost" onClick={() => void logout()}>
                خروج
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="boot__spinner" aria-hidden="true" />
            <p>در حال بارگذاری عرصهٔ شما…</p>
          </>
        )}
      </div>
    );
  }
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
