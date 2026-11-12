import type { CSSProperties } from 'react';
import { CATEGORIES } from '../game/missions';
import type { MissionView } from '../game/types';
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
        {mission.isDaily && !mission.dailyDone && !locked && <span className="mcard__daily">Daily</span>}
      </span>
      <span className="mcard__body">
        <span className="mcard__top">
          <span className="mcard__cat">{meta.label}</span>
          <StatusPill status={mission.status} />
        </span>
        <span className="mcard__title">{mission.title}</span>
        <span className="mcard__desc">{locked ? mission.lockReason : mission.description}</span>
        {mission.status === 'in_progress' && <ProgressBar value={Math.max(0.08, mission.draftProgress)} tone="yellow" size="sm" label="Mission progress" />}
        <span className="mcard__foot">
          <span className="mcard__stat"><Icon name="clock" size={14} />{mission.estimatedMinutes} min</span>
          <DifficultyDots difficulty={mission.difficulty} />
          <span className="mcard__rewards">
            <span><XpIcon size={16} />{mission.xpReward}</span>
            <span><CoinIcon size={16} />{mission.coinReward}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
