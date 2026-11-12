import type { CSSProperties } from 'react';
import { CATEGORIES } from '../game/missions';
import type { MissionView } from '../game/types';
import { categoryLabel } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { MissionArt } from './art/MissionArt';
import { DifficultyDots, StatusPill } from './MissionBits';
import { CoinIcon, Icon, XpIcon } from './ui/Icon';
import { ProgressBar } from './ui/Progress';

interface MissionCardProps {
  mission: MissionView;
  onSelect: (missionId: string) => void;
  index?: number;
}

export function MissionCard({ mission, onSelect, index = 0 }: MissionCardProps) {
  const { language, t, n } = useLanguage();
  const meta = CATEGORIES[mission.category];
  const locked = mission.status === 'locked';
  return (
    <button
      className={`mcard mcard--${mission.status}`}
      style={{ '--c': meta.color, '--d': meta.dark, '--soft': meta.soft, '--i': index } as CSSProperties}
      onClick={() => onSelect(mission.id)}
    >
      <span className="mcard__art">
        <MissionArt category={mission.category} locked={locked} />
        {locked && (
          <span className="mcard__lock">
            <Icon name="lock" size={22} />
          </span>
        )}
        {mission.isDaily && !mission.dailyDone && !locked && <span className="mcard__daily">{t('common.daily')}</span>}
      </span>
      <span className="mcard__body">
        <span className="mcard__top">
          <span className="mcard__cat">{categoryLabel(mission.category, language)}</span>
          <StatusPill status={mission.status} />
        </span>
        <span className="mcard__title">{mission.title}</span>
        <span className="mcard__desc">{locked ? mission.lockReason : mission.description}</span>
        {mission.status === 'in_progress' && <ProgressBar value={Math.max(0.08, mission.draftProgress)} tone="yellow" size="sm" label={t('common.missionProgress')} />}
        <span className="mcard__foot">
          <span className="mcard__stat"><Icon name="clock" size={14} />{t('missions.minutes', { minutes: mission.estimatedMinutes })}</span>
          <DifficultyDots difficulty={mission.difficulty} />
          <span className="mcard__rewards">
            <span><XpIcon size={16} />{n(mission.xpReward)}</span>
            <span><CoinIcon size={16} />{n(mission.coinReward)}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
