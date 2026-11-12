import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as api from '../api/game';
import { apiErrorKey, definitelyNotCompleted } from '../api/errors';
import { clearPendingCompletion, loadPendingCompletion, newCompletionKey, savePendingCompletion, type PendingCompletion, type PendingLoad } from '../api/pendingCompletion';
import { Logo } from '../components/AppLayout';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Mascot } from '../components/art/Mascot';
import { msUntilServerDayEnds } from '../game/dates';
import { getLevelInfo } from '../game/levels';
import { getPlayerStats } from '../game/progress';
import type { Answers, AvatarId, HistoryEntry } from '../game/types';
import { localizeMissionView } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { GameContext, useToasts, type GameContextValue, type GameMode, type PersistenceState } from './GameShared';

interface ProviderProps { children: ReactNode; switchMode: (mode: GameMode) => void }

type Gate =
  | { state: 'loading' }
  | { state: 'login' }
  | { state: 'error'; error: unknown }
  | { state: 'ready'; data: api.GameBootstrap };

function GateFrame({ children, switchMode, busy = false }: { children: ReactNode; switchMode: (mode: GameMode) => void; busy?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="welcome connection-gate">
      <div className="welcome__card connection-gate__card">
        <div className="welcome__top"><Logo /><LanguageSwitcher /></div>
        {children}
        <p className="connection-gate__hint">{t('connection.localPreserved')}</p>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => switchMode('local')} disabled={busy}>{t('connection.useLocal')}</button>
      </div>
    </div>
  );
}

function DemoLogin({ onLogin }: { onLogin: (data: api.GameBootstrap) => void }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<api.DemoUser[] | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.getDemoUsers().then((list) => {
      if (!active) return;
      setUsers(list);
      setSelected(list[0].id);
    }).catch((err: unknown) => { if (active) setError(err); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const signIn = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try { onLogin(await api.demoLogin(selected)); } catch (err) {
      setError(err instanceof api.GameApiError && err.status === 401 ? new api.GameApiError(401, 'COOKIE_BLOCKED', 'The cookie session was not established.') : err);
    } finally { setBusy(false); }
  };
  return (
    <div className="connection-gate__body">
      <Mascot size={90} mood="happy" />
      <h1>{t('connection.loginTitle')}</h1>
      <p>{t('connection.loginDescription')}</p>
      <p className="connection-gate__warning">{t('connection.demoWarning')}</p>
      {loading && <p role="status">{t('connection.loading')}</p>}
      {users && !loading && (
        <>
          <label className="connection-gate__field">
            <span>{t('connection.loginUser')}</span>
            <select className="input" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={busy}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn--yellow btn--block" onClick={() => void signIn()} disabled={busy || !selected}>
            {t(busy ? 'connection.savingAction' : 'connection.signIn')}
          </button>
        </>
      )}
      {error != null && <p className="connection-gate__error" role="alert">{t(apiErrorKey(error))}</p>}
      {error instanceof api.GameApiError && error.code === 'COOKIE_BLOCKED' && <a className="linkbtn" href={`${window.location.origin}${window.location.pathname}`} target="_blank" rel="noopener noreferrer">{t('connection.openTab')}</a>}
      {!users && !loading && <button type="button" className="btn btn--ghost btn--block" onClick={() => setAttempt((value) => value + 1)}>{t('connection.retry')}</button>}
    </div>
  );
}

/** Bootstrap before rendering any player data; a failed server is never replaced silently by local progress. */
export function ServerGameProvider({ children, switchMode }: ProviderProps) {
  const { t } = useLanguage();
  const [gate, setGate] = useState<Gate>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setGate({ state: 'loading' });
    api.getBootstrap().then((data) => { if (active) setGate({ state: 'ready', data }); }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof api.GameApiError && (error.status === 401 || error.status === 403)) setGate({ state: 'login' });
      else setGate({ state: 'error', error });
    });
    return () => { active = false; };
  }, [attempt]);

  if (gate.state === 'ready') {
    return <ServerGameSession key={gate.data.player.id} initial={gate.data} switchMode={switchMode} onChangeAccount={() => setGate({ state: 'login' })} onSessionChanged={(data) => setGate({ state: 'ready', data })}>{children}</ServerGameSession>;
  }
  return (
    <GateFrame switchMode={switchMode}>
      {gate.state === 'loading' && <div className="connection-gate__body" role="status"><Mascot size={90} mood="think" /><h1>{t('connection.loading')}</h1></div>}
      {gate.state === 'login' && <DemoLogin onLogin={(data) => setGate({ state: 'ready', data })} />}
      {gate.state === 'error' && <div className="connection-gate__body"><Mascot size={90} mood="sad" /><h1>{t('connection.errorTitle')}</h1><p role="alert">{t(apiErrorKey(gate.error))}</p><button className="btn btn--yellow btn--block" onClick={() => setAttempt((value) => value + 1)}>{t('connection.retry')}</button></div>}
    </GateFrame>
  );
}

type DraftChange = { missionId: string; stepIndex: number; answers: Answers };

function ServerGameSession({ children, switchMode, initial, onChangeAccount, onSessionChanged }: ProviderProps & {
  initial: api.GameBootstrap;
  onChangeAccount: () => void;
  onSessionChanged: (data: api.GameBootstrap) => void;
}) {
  const { language, t } = useLanguage();
  const [snapshot, setSnapshot] = useState(initial);
  const snapshotRef = useRef(initial);
  const [clockOffset, setClockOffset] = useState(() => Date.parse(initial.server_time) - Date.now());
  const [persistence, setPersistence] = useState<PersistenceState>('saved');
  const [sessionChanged, setSessionChanged] = useState(false);
  const [contractError, setContractError] = useState<'UNSUPPORTED_VERSION' | 'INVALID_RESPONSE' | null>(null);
  const contractErrorRef = useRef<'UNSUPPORTED_VERSION' | 'INVALID_RESPONSE' | null>(null);
  const [lastResult, setLastResult] = useState<HistoryEntry | null>(null);
  const [pending, setPending] = useState<PendingLoad>(() => loadPendingCompletion(initial.player.id));
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<unknown>(null);
  const { toasts, toast } = useToasts();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const active = useRef(true);
  const draft = useRef<DraftChange | null>(null);
  const draftTimer = useRef<number | null>(null);
  const flushing = useRef<Promise<boolean> | null>(null);
  const completing = useRef(false);

  useEffect(() => {
    active.current = true;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!draft.current && !flushing.current && !completing.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => {
      active.current = false;
      window.removeEventListener('beforeunload', warnBeforeLeaving);
      if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    };
  }, []);

  const markContractError = useCallback((error: unknown) => {
    if (error instanceof api.GameApiError && (error.code === 'UNSUPPORTED_VERSION' || error.code === 'INVALID_RESPONSE')) {
      contractErrorRef.current = error.code;
      if (active.current) {
        setContractError(error.code);
        setPersistence('error');
      }
    }
  }, []);

  const requireCompatible = useCallback(() => {
    if (contractErrorRef.current) throw new api.GameApiError(0, contractErrorRef.current, 'A compatible bootstrap is required.');
  }, []);

  // Serialize the response handling as well as the requests. A contract error
  // must be recorded before any already-queued write is allowed to start.
  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(async () => {
      if (!active.current) throw new Error('Session closed');
      try { return await operation(); } catch (error) { markContractError(error); throw error; }
    });
    queue.current = result.then(() => undefined, () => undefined);
    return result;
  }, [markContractError]);

  const apply = useCallback((next: api.GameBootstrap) => {
    if (!active.current) return;
    if (next.player.id !== initial.player.id) { onSessionChanged(next); return; }
    const resolvedContractError = contractErrorRef.current;
    contractErrorRef.current = null;
    setContractError(null);
    if (resolvedContractError) {
      setRecoveryError((previous: unknown) => previous instanceof api.GameApiError && previous.code === resolvedContractError ? null : previous);
    }
    snapshotRef.current = next;
    setSnapshot(next);
    setClockOffset(Date.parse(next.server_time) - Date.now());
  }, [initial.player.id, onSessionChanged]);

  const applyProjection = useCallback((result: api.Projection) => {
    if (!active.current) return;
    const next = { ...snapshotRef.current, progress: result.progress, missions: result.missions, date_key: result.date_key ?? snapshotRef.current.date_key };
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const reportError = useCallback((error: unknown) => {
    if (!active.current) return;
    markContractError(error);
    if (error instanceof api.GameApiError && (error.status === 401 || error.status === 403)) setSessionChanged(true);
    setPersistence('error');
    toast(t(apiErrorKey(error)), 'warn');
  }, [markContractError, t, toast]);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      return await enqueue(async () => {
        const next = await api.getBootstrap();
        if (!active.current) return false;
        if (next.player.id !== initial.player.id) {
          // Do not discard answers which are still only in this tab. Keep them
          // visible until the original visitor signs in again and retries.
          if (draft.current || flushing.current || completing.current) {
            setSessionChanged(true);
            setPersistence('error');
          } else onSessionChanged(next);
          return false;
        }
        setSessionChanged(false);
        apply(next);
        if (!draft.current && !flushing.current && !completing.current) setPersistence('saved');
        return true;
      });
    } catch (error) {
      if (active.current) {
        if (error instanceof api.GameApiError && (error.status === 401 || error.status === 403)) setSessionChanged(true);
        setPersistence('error');
      }
      return false;
    }
  }, [apply, enqueue, initial.player.id, onSessionChanged]);

  const ensureCompatible = useCallback(async () => {
    if (!contractErrorRef.current) return true;
    if (await refresh()) return true;
    reportError(new api.GameApiError(0, contractErrorRef.current ?? 'NETWORK_ERROR', 'A compatible bootstrap is required.'));
    return false;
  }, [refresh, reportError]);

  // Bootstrap carries both UTC date_key and identity. Recheck on focus/reconnect
  // and periodically, including after UTC midnight and account changes in other tabs.
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(check, 60_000);
    const rollover = window.setTimeout(check, Math.max(1_000, msUntilServerDayEnds(snapshot.date_key, Date.now() + clockOffset) + 250));
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(timer); window.clearTimeout(rollover); window.removeEventListener('focus', check); window.removeEventListener('online', check); document.removeEventListener('visibilitychange', check); };
  }, [refresh, snapshot.date_key, clockOffset]);

  const updatePlayer = useCallback(async (patch: { name?: string; avatar?: AvatarId }): Promise<boolean> => {
    if (!await ensureCompatible()) return false;
    setPersistence('saving');
    try {
      return await enqueue(async () => {
        requireCompatible();
        const result = await api.updateProfile(snapshotRef.current.csrf_token, patch);
        if (!active.current) return false;
        const next = { ...snapshotRef.current, progress: result.progress };
        snapshotRef.current = next;
        setSnapshot(next);
        if (!draft.current && !flushing.current && !completing.current) setPersistence('saved');
        return true;
      });
    } catch (error) { reportError(error); return false; }
  }, [enqueue, ensureCompatible, reportError, requireCompatible]);

  const completeOnboarding = useCallback((name: string, avatar: AvatarId) => updatePlayer({ name: name.trim().slice(0, 24) || t('welcome.defaultName'), avatar }), [t, updatePlayer]);

  const startMission = useCallback(async (missionId: string): Promise<boolean> => {
    if (!await ensureCompatible()) return false;
    const mission = snapshotRef.current.missions.find((item) => item.id === missionId);
    if (!mission || mission.status === 'locked') { toast(t('play.locked'), 'warn'); return false; }
    const stored = loadPendingCompletion(initial.player.id);
    if (stored.status === 'loaded' || stored.status === 'corrupt') { setPending(stored); return false; }
    if (snapshotRef.current.progress.drafts[missionId]) return true;
    setPersistence('saving');
    try {
      return await enqueue(async () => {
        requireCompatible();
        const result = await api.putDraft(snapshotRef.current.csrf_token, missionId, 0, {});
        if (!active.current) return false;
        applyProjection(result);
        if (!draft.current && !flushing.current && !completing.current) setPersistence('saved');
        return true;
      });
    } catch (error) { reportError(error); return false; }
  }, [applyProjection, enqueue, ensureCompatible, initial.player.id, reportError, requireCompatible, t, toast]);

  const flushDraft = useCallback(async (): Promise<boolean> => {
    if (draftTimer.current !== null) { window.clearTimeout(draftTimer.current); draftTimer.current = null; }
    if (flushing.current) return flushing.current;
    const run = async () => {
      if (!await ensureCompatible()) return false;
      // Even when all edits were already autosaved, verify connectivity and
      // identity before reporting a successful save-and-exit or completion.
      if (!draft.current && !await refresh()) return false;
      while (draft.current && active.current) {
        const change = draft.current;
        draft.current = null;
        try {
          await enqueue(async () => {
            requireCompatible();
            const result = await api.putDraft(snapshotRef.current.csrf_token, change.missionId, change.stepIndex, change.answers);
            applyProjection(result);
          });
        } catch (error) {
          // Keep the most recent unsaved answers in memory, not an implicit offline queue.
          if (!draft.current) draft.current = change;
          reportError(error);
          return false;
        }
      }
      if (active.current && !completing.current && !contractErrorRef.current) setPersistence('saved');
      return active.current && !contractErrorRef.current;
    };
    const promise = run();
    flushing.current = promise;
    try { return await promise; } finally { flushing.current = null; }
  }, [applyProjection, enqueue, ensureCompatible, refresh, reportError, requireCompatible]);

  const saveDraft = useCallback((missionId: string, stepIndex: number, answers: Answers) => {
    if (completing.current) return;
    draft.current = { missionId, stepIndex, answers: { ...answers } };
    setPersistence('saving');
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => { draftTimer.current = null; void flushDraft(); }, 350);
  }, [flushDraft]);

  const discardDraft = useCallback(async (missionId: string, stepIndex: number, answers: Answers): Promise<boolean> => {
    if (draftTimer.current !== null) { window.clearTimeout(draftTimer.current); draftTimer.current = null; }
    draft.current = null;
    if (flushing.current) await flushing.current;
    // Retain the visible answers while checking compatibility, including if a
    // different account has signed in in another tab during that check.
    const visible = { missionId, stepIndex, answers: { ...answers } };
    draft.current = visible;
    if (!await ensureCompatible()) return false;
    draft.current = null;
    setPersistence('saving');
    try {
      return await enqueue(async () => {
        requireCompatible();
        const result = await api.deleteDraft(snapshotRef.current.csrf_token, missionId);
        if (!active.current) return false;
        applyProjection(result);
        setPersistence('saved');
        return true;
      });
    } catch (error) {
      // A failed/ambiguous DELETE must not turn the still-visible answers into
      // a falsely saved draft. Retain them for an explicit save or retry.
      draft.current = visible;
      reportError(error);
      return false;
    }
  }, [applyProjection, enqueue, ensureCompatible, reportError, requireCompatible]);

  const sendCompletion = useCallback(async (intent: PendingCompletion, recovering: boolean): Promise<HistoryEntry | null> => {
    if (recovering && !await ensureCompatible()) {
      if (active.current) setRecoveryError(new api.GameApiError(0, contractErrorRef.current ?? 'NETWORK_ERROR', 'A compatible bootstrap is required.'));
      return null;
    }
    try {
      return await enqueue(async () => {
        requireCompatible();
        const { completion, replayed } = await api.postCompletion(snapshotRef.current.csrf_token, intent.missionId, intent.answers, intent.key);
        // Replays contain the original projection, which may be stale. Refresh
        // identity and progress before displaying totals whenever possible.
        let fresh: api.GameBootstrap | null = null;
        try { fresh = await api.getBootstrap(); } catch (error) {
          // Completion itself was confirmed, but do not hide a changed contract.
          markContractError(error);
          if (active.current && error instanceof api.GameApiError && (error.status === 401 || error.status === 403)) setSessionChanged(true);
        }
        // If this session was closed during the request, leave the retry record
        // intact so returning to it can explicitly recover the confirmed result.
        if (!active.current) return null;
        if (!clearPendingCompletion(intent)) {
          setPending({ status: 'loaded', intent });
          setRecoveryError(new api.GameApiError(0, 'NETWORK_ERROR', 'Could not clear the retry record.'));
          return null;
        }
        setPending({ status: 'empty' });
        if (fresh && fresh.player.id !== initial.player.id) { onSessionChanged(fresh); return null; }
        if (fresh) { apply(fresh); setPersistence('saved'); }
        else if (replayed === false) { applyProjection(completion); setPersistence('error'); }
        else setPersistence('error');
        setLastResult(completion.entry);
        return completion.entry;
      });
    } catch (error) {
      if (!active.current) return null;
      const rejected = definitelyNotCompleted(error);
      // A validation failure on the FIRST attempt is known not to have awarded.
      // On recovery it says nothing about an earlier ambiguous attempt (the BFF
      // validates before idempotency lookup), so retain the record conservatively.
      if (!recovering && rejected && clearPendingCompletion(intent)) setPending({ status: 'empty' });
      else setPending({ status: 'loaded', intent });
      const shown = recovering && rejected ? new api.GameApiError(0, 'RECOVERY_UNRESOLVED', 'An earlier attempt may have completed.') : error;
      setRecoveryError(shown);
      reportError(shown);
      return null;
    }
  }, [apply, applyProjection, enqueue, ensureCompatible, initial.player.id, markContractError, onSessionChanged, reportError, requireCompatible]);

  const finishMission = useCallback(async (missionId: string, answers: Answers): Promise<HistoryEntry | null> => {
    if (completing.current) return null;
    completing.current = true;
    try {
      if (!await flushDraft()) return null;
      const existing = loadPendingCompletion(initial.player.id);
      if (existing.status === 'loaded' || existing.status === 'corrupt') { setPending(existing); return null; }
      if (existing.status === 'unavailable') { toast(t('connection.pendingStorage'), 'warn'); return null; }
      let key: string;
      try { key = newCompletionKey(); } catch { toast(t('connection.pendingStorage'), 'warn'); return null; }
      const intent: PendingCompletion = { version: 1, userId: initial.player.id, missionId, key, answers: { ...answers } };
      if (!savePendingCompletion(intent)) {
        const concurrent = loadPendingCompletion(initial.player.id);
        if (concurrent.status === 'loaded' || concurrent.status === 'corrupt') setPending(concurrent);
        else toast(t('connection.pendingStorage'), 'warn');
        return null;
      }
      setPersistence('saving');
      return await sendCompletion(intent, false);
    } finally { completing.current = false; }
  }, [flushDraft, initial.player.id, sendCompletion, t, toast]);

  const loadHistory = useCallback(async (cursor?: string) => {
    try {
      return await enqueue(async () => {
        const page = await api.getHistory(20, cursor);
        const fresh = await api.getBootstrap();
        if (!active.current) return null;
        if (fresh.player.id !== initial.player.id) {
          if (draft.current || flushing.current || completing.current) { setSessionChanged(true); setPersistence('error'); }
          else onSessionChanged(fresh);
          return null;
        }
        setSessionChanged(false);
        apply(fresh);
        if (!draft.current && !flushing.current && !completing.current) setPersistence('saved');
        return page;
      });
    } catch (error) { reportError(error); return null; }
  }, [apply, enqueue, initial.player.id, onSessionChanged, reportError]);

  const mayLeave = useCallback(() => (!draft.current && !flushing.current && !completing.current) || window.confirm(t('connection.leaveUnsaved')), [t]);
  const safeSwitchMode = useCallback((mode: GameMode) => { if (mayLeave()) switchMode(mode); }, [mayLeave, switchMode]);
  const safeChangeAccount = useCallback(() => { if (mayLeave()) onChangeAccount(); }, [mayLeave, onChangeAccount]);
  const missions = useMemo(() => snapshot.missions.map((mission) => localizeMissionView(mission, snapshot.progress, language, snapshot.missions)), [snapshot.missions, snapshot.progress, language]);
  const value = useMemo<GameContextValue>(() => ({
    mode: 'server', switchMode: safeSwitchMode, account: snapshot.player, changeAccount: safeChangeAccount,
    progress: snapshot.progress, todayKey: snapshot.date_key, serverClockOffset: clockOffset, missions,
    config: snapshot.game_config, categories: snapshot.categories, difficulty: snapshot.difficulty, achievements: snapshot.achievements_catalog,
    level: getLevelInfo(snapshot.progress.xp, snapshot.game_config.levels), stats: getPlayerStats(snapshot.progress, snapshot.date_key),
    persistence, sessionChanged, contractError, toasts, toast, completeOnboarding, updatePlayer, startMission, saveDraft, flushDraft, discardDraft, finishMission,
    resetProgress: () => {}, lastResult, refresh, loadHistory,
  }), [safeSwitchMode, snapshot, safeChangeAccount, clockOffset, missions, persistence, sessionChanged, contractError, toasts, toast, completeOnboarding, updatePlayer, startMission, saveDraft, flushDraft, discardDraft, finishMission, lastResult, refresh, loadHistory]);

  if (pending.status === 'loaded' || pending.status === 'corrupt') {
    const recover = async () => {
      if (pending.status !== 'loaded' || recoveryBusy) return;
      setRecoveryBusy(true);
      setRecoveryError(null);
      completing.current = true;
      try {
        const entry = await sendCompletion(pending.intent, true);
        if (entry) navigate(`/result/${entry.id}`, { replace: true });
      } finally { completing.current = false; setRecoveryBusy(false); }
    };
    return (
      <GateFrame switchMode={safeSwitchMode} busy={recoveryBusy}>
        <div className="connection-gate__body">
          <Mascot size={90} mood="think" />
          <h1>{t('connection.pendingTitle')}</h1>
          <p>{t(pending.status === 'corrupt' ? 'connection.pendingCorrupt' : 'connection.pendingDescription')}</p>
          {(contractError || recoveryError != null) && <p role="alert" className="connection-gate__error">
            {t(contractError === 'UNSUPPORTED_VERSION' ? 'connection.errorVersion' : contractError ? 'connection.errorResponse' : apiErrorKey(recoveryError))}
            {contractError && <> {t('connection.compatibilityPaused')}</>}
          </p>}
          {pending.status === 'loaded' && <button className="btn btn--yellow btn--block" onClick={() => void recover()} disabled={recoveryBusy}>{t(recoveryBusy ? 'connection.savingAction' : 'connection.pendingRetry')}</button>}
          <button className="linkbtn" onClick={safeChangeAccount} disabled={recoveryBusy}>{t('connection.switchAccount')}</button>
        </div>
      </GateFrame>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
