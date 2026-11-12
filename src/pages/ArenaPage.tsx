import { useState } from 'react';
import { DailyChallenge } from '../components/DailyChallenge';
import { MissionDetail } from '../components/MissionDetail';
import { MissionMap } from '../components/MissionMap';
import { PlayerHeader } from '../components/PlayerHeader';
import { PlayerProgress } from '../components/PlayerProgress';
import { getActiveMissionId } from '../game/progress';
import { useGame } from '../state/GameContext';

/** The game home: HUD, daily challenge, mission island and progress. */
export function ArenaPage() {
  const { missions } = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="arena">
      <PlayerHeader />
      <div className="arena__grid">
        <div className="arena__daily">
          <DailyChallenge onOpen={setSelected} />
        </div>
        <div className="arena__map">
          <MissionMap missions={missions} activeId={getActiveMissionId(missions)} onSelect={setSelected} />
        </div>
        <div className="arena__progress">
          <PlayerProgress />
        </div>
      </div>
      <MissionDetail missionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
