import { DIFFICULTY } from '../game/missions';
import type { MissionDifficulty, MissionStatus } from '../game/types';
import { n } from '../i18n';
import { Icon, StarIcon, type IconName } from './ui/Icon';

const STATUS: Record<MissionStatus, { label: string; icon: IconName | null }> = {
  locked: { label: 'قفل', icon: 'lock' },
  available: { label: 'آماده', icon: null },
  in_progress: { label: 'در حال انجام', icon: 'play' },
  completed: { label: 'تکمیل‌شده', icon: 'check' },
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
  const d = DIFFICULTY[difficulty] ?? DIFFICULTY.medium;
  return (
    <span className="difficulty" title={`سطح دشواری: ${d.label}`}>
      <span className="difficulty__dots" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= d.dots ? 'is-on' : ''} />
        ))}
      </span>
      {d.label}
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars-mini" role="img" aria-label={`${n(value)} از ۵ ستاره`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} filled={i <= value} />
      ))}
    </span>
  );
}
