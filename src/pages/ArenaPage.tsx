import { useCallback, useState } from 'react';
import { ActivityFeed } from '../components/ActivityFeed';
import { DailyChallenge } from '../components/DailyChallenge';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { MissionDetail } from '../components/MissionDetail';
import { MissionMap } from '../components/MissionMap';
import { PlayerHeader } from '../components/PlayerHeader';
import { PlayerProgress } from '../components/PlayerProgress';
import { QuestPanel } from '../components/QuestPanel';
import { RankCard } from '../components/RankCard';
import { getActiveMissionId } from '../game/progress';
import type { QuestClaim } from '../game/types';
import { useGame } from '../state/GameContext';

/** The game home: HUD, daily challenge, mission island, weekly quests, rank, progress and activity. */
export function ArenaPage() {
  const { missions } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<QuestClaim | null>(null);

  const onClaimed = useCallback((claim: QuestClaim) => {
    if (claim.level_after > claim.level_before) setLevelUp(claim);
  }, []);

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
        <div className="arena__side">
          <QuestPanel onClaimed={onClaimed} />
          <RankCard />
          <PlayerProgress />
          <ActivityFeed />
        </div>
      </div>
      <MissionDetail missionId={selected} onClose={() => setSelected(null)} />
      {levelUp && <LevelUpOverlay claim={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}
