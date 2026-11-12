import { useEffect, useMemo, useState } from 'react';
import { MissionGameplay } from '../components/play/MissionGameplay';
import { MissionResult } from '../components/play/MissionResult';
import { getMission } from '../game/missions';
import { localizeMission } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

/** /play/:missionId — validates access, opens (or resumes) a run, then hands over to the gameplay. */
export function PlayPage({ missionId }: { missionId: string | null }) {
  const { startMission, toast } = useGame();
  const { language, t } = useLanguage();
  const mission = missionId ? getMission(missionId) : undefined;
  const localized = useMemo(() => mission ? localizeMission(mission, language) : undefined, [mission, language]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mission) {
      navigate('/', { replace: true });
      return;
    }
    if (!startMission(mission.id)) {
      toast(t('play.locked'), 'warn');
      navigate('/', { replace: true });
      return;
    }
    setReady(true);
  }, [mission, startMission, toast, t]);

  if (!localized || !ready) return null;
  return <MissionGameplay mission={localized} />;
}

/** /result/:entryId — the completion screen, rebuilt from the saved history entry (refresh-safe). */
export function ResultPage({ entryId }: { entryId: string | null }) {
  const { progress } = useGame();
  const { language } = useLanguage();
  const entry = progress.history.find((h) => h.id === entryId);
  const mission = entry ? getMission(entry.missionId) : undefined;

  useEffect(() => {
    if (!entry || !mission) navigate('/', { replace: true });
  }, [entry, mission]);

  if (!entry || !mission) return null;
  return <MissionResult entry={entry} mission={localizeMission(mission, language)} />;
}
