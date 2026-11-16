import { DIFFICULTY } from '../game/missions';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import type { MissionDifficulty, MissionStatus } from '../game/types';
import { Icon, StarIcon, type IconName } from './ui/Icon';

const STATUS: Record<MissionStatus, { label: MessageKey; icon: IconName | null }> = {
  locked: { label: 'status.locked', icon: 'lock' },
  available: { label: 'status.available', icon: null },
  in_progress: { label: 'status.in_progress', icon: 'play' },
  completed: { label: 'status.completed', icon: 'check' },
};

const DIFFICULTY_KEY: Record<MissionDifficulty, MessageKey> = {
  easy: 'k.g.diffEasy',
  medium: 'k.g.diffMedium',
  hard: 'k.g.diffHard',
};

export function StatusPill({ status }: { status: MissionStatus }) {
  const { t } = useLanguage();
  const s = STATUS[status];
  return (
    <span className={`pill pill--${status}`}>
      {s.icon && <Icon name={s.icon} size={12} strokeWidth={3.2} />}
      {t(s.label)}
    </span>
  );
}

export function DifficultyDots({ difficulty }: { difficulty: MissionDifficulty }) {
  const { t } = useLanguage();
  const d = DIFFICULTY[difficulty];
  const label = t(DIFFICULTY_KEY[difficulty]);
  return (
    <span className="difficulty" title={t('difficulty.label', { difficulty: label })}>
      <span className="difficulty__dots" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= d.dots ? 'is-on' : ''} />
        ))}
      </span>
      {label}
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { t } = useLanguage();
  return (
    <span className="stars-mini" role="img" aria-label={t('stars.outOfFive', { value })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= value} />
      ))}
    </span>
  );
}
