import { useEffect, useState } from 'react';
import { MissionGameplay } from '../components/play/MissionGameplay';
import { MissionResult } from '../components/play/MissionResult';
import { getMission } from '../game/missions';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

/** /play/:missionId — validates access, opens (or resumes) a run, then hands over to the gameplay. */
export function PlayPage({ missionId }: { missionId: string | null }) {
  const { startMission, toast } = useGame();
  const mission = missionId ? getMission(missionId) : undefined;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mission) {
      navigate('/', { replace: true });
      return;
    }
    if (!startMission(mission.id)) {
      toast('That mission is still locked.', 'warn');
      navigate('/', { replace: true });
      return;
    }
    setReady(true);
  }, [mission, startMission, toast]);

  if (!mission || !ready) return null;
  return <MissionGameplay mission={mission} />;
}

/** /result/:entryId — the completion screen, rebuilt from the saved history entry (refresh-safe). */
export function ResultPage({ entryId }: { entryId: string | null }) {
  const { progress } = useGame();
  const entry = progress.history.find((h) => h.id === entryId);
  const mission = entry ? getMission(entry.missionId) : undefined;

  useEffect(() => {
    if (!entry || !mission) navigate('/', { replace: true });
  }, [entry, mission]);

  if (!entry || !mission) return null;
  return <MissionResult entry={entry} mission={mission} />;
}
