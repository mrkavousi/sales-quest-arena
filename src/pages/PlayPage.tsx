import { useEffect, useState } from 'react';
import { MissionGameplay } from '../components/play/MissionGameplay';
import { MissionResult } from '../components/play/MissionResult';
import { Mascot } from '../components/art/Mascot';
import { getMission } from '../game/missions';
import { blockedKey } from '../game/serverMissions';
import { getSpecialMissionViews } from '../game/store';
import { localizeMissionView } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

/** Wait for the draft to be acknowledged before opening a server-backed run. */
export function PlayPage({ missionId }: { missionId: string | null }) {
  const { missions, progress, mode, startMission, toast } = useGame();
  const { language, t } = useLanguage();
  // Demo-store specials live on their own route and are only playable once bought.
  const special = !getMission(missionId ?? '') && mode === 'local'
    ? getSpecialMissionViews(progress)
        .map((view) => localizeMissionView(view, progress, language))
        .find((item) => item.id === missionId)
    : undefined;
  const mission = missions.find((item) => item.id === missionId) ?? special;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!mission || mission.status === 'locked') {
      if (mission?.status === 'locked') toast(t('play.locked'), 'warn');
      navigate('/', { replace: true });
      return () => { active = false; };
    }
    if (mission.canStart === false) {
      toast(t(blockedKey(mission)), 'warn');
      navigate('/', { replace: true });
      return () => { active = false; };
    }
    setFailed(false);
    void startMission(mission.id).then((started) => {
      if (!active) return;
      if (started) setReady(true);
      else setFailed(true);
    });
    return () => { active = false; };
    // Recheck on a new mission or an explicit retry, not after each draft projection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, startMission, attempt]);

  if (failed) return <div className="connection-start" role="alert"><p>{t('connection.startFailed')}</p><button className="btn btn--green" onClick={() => setAttempt((value) => value + 1)}>{t('connection.retry')}</button><button className="linkbtn" onClick={() => navigate('/')}>{t('history.goArena')}</button></div>;
  if (!mission || !ready) return <div className="connection-start" role="status">{t('connection.loading')}</div>;
  return <MissionGameplay mission={mission} />;
}

/**
 * After submitting a DB mission. A review-required mission is only "pending": no XP/coins are shown or
 * animated until an operator approves it (the status then arrives with the next refresh).
 */
export function SubmittedPage({ missionId }: { missionId: string | null }) {
  const { missions } = useGame();
  const { t, n } = useLanguage();
  const mission = missions.find((item) => item.id === missionId);
  // This page is only reached right after a submit. The router update can land a render before the
  // refreshed mission snapshot, so a missing status means "just submitted" rather than "go home".
  const status = mission?.latestSubmission?.status ?? 'submitted';

  useEffect(() => {
    if (!mission) navigate('/', { replace: true });
  }, [mission]);

  if (!mission) return null;
  const approved = status === 'approved';
  const rejected = status === 'rejected';
  return (
    <div className="welcome connection-gate">
      <div className="welcome__card connection-gate__card">
        <div className="connection-gate__body" role="status">
          <Mascot size={110} mood={approved ? 'cheer' : rejected ? 'sad' : 'think'} />
          <h1>{t(approved ? 'server.submitted.approvedTitle' : rejected ? 'server.submitted.rejectedTitle' : 'server.submitted.title')}</h1>
          <p>
            {approved
              ? t('server.submitted.approvedBody', { xp: n(mission.xpReward), coins: n(mission.coinReward) })
              : rejected
                ? mission.latestSubmission?.rejectionReason ?? ''
                : t('server.submitted.pendingBody')}
          </p>
          <button className="btn btn--green btn--block" onClick={() => navigate('/missions')}>{t('server.submitted.back')}</button>
        </div>
      </div>
    </div>
  );
}

/** Result screen for a purchased demo-store mission, which is not in the main catalog. */
export function SpecialResultPage({ entryId }: { entryId: string | null }) {
  const { progress, mode, lastResult } = useGame();
  const { language } = useLanguage();
  const entry = progress.history.find((item) => item.id === entryId) ?? (lastResult?.id === entryId ? lastResult : undefined);
  const mission = entry && !getMission(entry.missionId) && mode === 'local'
    ? getSpecialMissionViews(progress).map((view) => localizeMissionView(view, progress, language)).find((item) => item.id === entry.missionId)
    : undefined;

  useEffect(() => {
    if (!entry || !mission) navigate('/', { replace: true });
  }, [entry, mission]);

  if (!entry || !mission) return null;
  return <MissionResult entry={entry} mission={mission} />;
}

/** The last result remains available even if an idempotent replay returned an old snapshot. */
export function ResultPage({ entryId }: { entryId: string | null }) {
  const { progress, missions, lastResult } = useGame();
  const entry = progress.history.find((item) => item.id === entryId) ?? (lastResult?.id === entryId ? lastResult : undefined);
  const mission = entry ? missions.find((item) => item.id === entry.missionId) : undefined;

  useEffect(() => {
    if (!entry || !mission) navigate('/', { replace: true });
  }, [entry, mission]);

  if (!entry || !mission) return null;
  return <MissionResult entry={entry} mission={mission} />;
}
