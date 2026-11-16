import { useState } from 'react';
import { MissionCard } from '../components/MissionCard';
import { MissionDetail } from '../components/MissionDetail';
import { useLanguage } from '../i18n/LanguageContext';
import { CATEGORIES } from '../game/missions';
import type { MissionCategory, MissionStatus } from '../game/types';
import { categoryLabel, localizeMissionView } from '../i18n/content';
import { useGame } from '../state/GameContext';

type Filter = 'all' | MissionCategory;
const ORDER: Record<MissionStatus, number> = { in_progress: 0, available: 1, completed: 2, locked: 3 };

export function MissionsPage() {
  const { missions: rawMissions, progress } = useGame();
  const { t, language } = useLanguage();
  const missions = rawMissions.map((m) => localizeMissionView(m, progress, language, rawMissions));
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const categories = [...new Set(missions.map((m) => m.category))];
  const visible = missions
    .filter((m) => filter === 'all' || m.category === filter)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.order - b.order);
  const open = missions.filter((m) => m.status !== 'locked').length;

  return (
    <div className="pagebody">
      <header className="pagehead">
        <h1>{t('nav.missions')}</h1>
        <p>{t('missions.subtitle', { open, total: missions.length })}</p>
      </header>

      <div className="filters" role="tablist" aria-label={t('missions.categories')}>
        <button role="tab" aria-selected={filter === 'all'} className={`filter${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>
          {t('missions.all')}
        </button>
        {categories.map((c) => (
          <button key={c} role="tab" aria-selected={filter === c} className={`filter${filter === c ? ' is-active' : ''}`} onClick={() => setFilter(c)}>
            <i style={{ background: CATEGORIES[c].color }} />
            {categoryLabel(c, language)}
          </button>
        ))}
      </div>

      <div className="mcards" key={filter}>
        {visible.map((m, i) => (
          <MissionCard key={m.id} mission={m} onSelect={setSelected} index={i} />
        ))}
      </div>

      <MissionDetail missionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
