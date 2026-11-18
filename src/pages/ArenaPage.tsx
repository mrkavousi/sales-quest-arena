import { useState } from 'react';
import { DailyChallenge } from '../components/DailyChallenge';
import { MissionDetail } from '../components/MissionDetail';
import { MissionMap } from '../components/MissionMap';
import { PlayerHeader } from '../components/PlayerHeader';
import { PlayerProgress } from '../components/PlayerProgress';
import { StoreEntry } from '../components/StoreEntry';
import { getActiveMissionId } from '../game/progress';
import { useLanguage } from '../i18n/LanguageContext';
import { useGame } from '../state/GameContext';

/** The game home: HUD, daily challenge, mission island and progress. */
export function ArenaPage() {
  const { missions } = useGame();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="arena">
      <PlayerHeader />
      <div className="arena__grid">
        <div className="arena__daily">
          <DailyChallenge onOpen={setSelected} />
        </div>
        <div className="arena__map">
          {missions.length > 0
            ? <MissionMap missions={missions} activeId={getActiveMissionId(missions)} onSelect={setSelected} />
            : <div className="empty-missions" role="status"><h2>{t('server.empty.title')}</h2><p>{t('server.empty.body')}</p></div>}
        </div>
        <div className="arena__store">
          <StoreEntry />
        </div>
        <div className="arena__progress">
          <PlayerProgress />
        </div>
      </div>
      <MissionDetail missionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
