import { DIFFICULTY } from '../game/missions';
import type { MissionDifficulty, MissionStatus } from '../game/types';
import { Icon, StarIcon, type IconName } from './ui/Icon';

const STATUS: Record<MissionStatus, { label: string; icon: IconName | null }> = {
  locked: { label: 'Locked', icon: 'lock' },
  available: { label: 'Available', icon: null },
  in_progress: { label: 'In progress', icon: 'play' },
  completed: { label: 'Completed', icon: 'check' },
};

export function StatusPill({ status }: { status: MissionStatus }) {
  const s = STATUS[status];
  return (
    <span className={`pill pill--${status}`}>
      {s.icon && <Icon name={s.icon} size={12} strokeWidth={3.2} />}
      {s.label}
    </span>
  );
}

export function DifficultyDots({ difficulty }: { difficulty: MissionDifficulty }) {
  const d = DIFFICULTY[difficulty];
  return (
    <span className="difficulty" title={`Difficulty: ${d.label}`}>
      <span className="difficulty__dots" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= d.dots ? 'is-on' : ''} />
        ))}
      </span>
      {d.label}
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars-mini" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= value} />
      ))}
    </span>
  );
}
