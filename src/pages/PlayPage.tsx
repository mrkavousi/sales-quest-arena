import { useEffect, useState } from 'react';
import { MissionGameplay } from '../components/play/MissionGameplay';
import { MissionResult } from '../components/play/MissionResult';
import { getMission } from '../game/missions';
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
