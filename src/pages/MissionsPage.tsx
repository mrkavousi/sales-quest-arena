import { n } from '../i18n';
import { useCallback, useState } from 'react';
import { DailyChallenge } from '../components/DailyChallenge';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { QuestPanel } from '../components/QuestPanel';
import type { QuestClaim } from '../game/types';
import { MissionCard } from '../components/MissionCard';
import { MissionDetail } from '../components/MissionDetail';
import { CATEGORIES } from '../game/missions';
import type { MissionCategory, MissionStatus } from '../game/types';
import { useGame } from '../state/GameContext';

type Filter = 'all' | MissionCategory;
const ORDER: Record<MissionStatus, number> = { in_progress: 0, available: 1, completed: 2, locked: 3 };

export function MissionsPage() {
  const { missions } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<QuestClaim | null>(null);
  const onClaimed = useCallback((claim: QuestClaim) => {
    if (claim.level_after > claim.level_before) setLevelUp(claim);
  }, []);

  const categories = [...new Set(missions.map((m) => m.category))];
  const visible = missions
    .filter((m) => filter === 'all' || m.category === filter)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.order - b.order);
  const open = missions.filter((m) => m.status !== 'locked').length;

  return (
    <div className="pagebody">
      <header className="pagehead">
        <h1>مأموریت‌ها و چالش‌ها</h1>
        <p>
          {n(open)} از {n(missions.length)} مأموریت باز است · یکی را انتخاب کنید
        </p>
      </header>

      <div className="missions-top">
        <DailyChallenge onOpen={setSelected} />
        <QuestPanel onClaimed={onClaimed} />
      </div>

      <h2 className="missions-heading">همهٔ مأموریت‌ها</h2>
      <div className="filters" role="tablist" aria-label="دسته‌های مأموریت">
        <button role="tab" aria-selected={filter === 'all'} className={`filter${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>
          همه
        </button>
        {categories.map((c) => (
          <button key={c} role="tab" aria-selected={filter === c} className={`filter${filter === c ? ' is-active' : ''}`} onClick={() => setFilter(c)}>
            <i style={{ background: CATEGORIES[c].color }} />
            {CATEGORIES[c].label}
          </button>
        ))}
      </div>

      <div className="mcards" key={filter}>
        {visible.map((m, i) => (
          <MissionCard key={m.id} mission={m} onSelect={setSelected} index={i} />
        ))}
      </div>

      <MissionDetail missionId={selected} onClose={() => setSelected(null)} />
      {levelUp && <LevelUpOverlay claim={levelUp} onClose={() => setLevelUp(null)} />}
    </div>
  );
}
