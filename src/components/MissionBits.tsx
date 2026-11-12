import { useGame } from '../state/GameContext';
import type { MissionDifficulty, MissionStatus } from '../game/types';
import { difficultyLabel } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { Icon, StarIcon, type IconName } from './ui/Icon';

const STATUS_ICONS: Record<MissionStatus, IconName | null> = {
  locked: 'lock', available: null, in_progress: 'play', completed: 'check',
};

export function StatusPill({ status }: { status: MissionStatus }) {
  const { t } = useLanguage();
  const icon = STATUS_ICONS[status];
  return (
    <span className={`pill pill--${status}`}>
      {icon && <Icon name={icon} size={12} strokeWidth={3.2} />}
      {t(`status.${status}`)}
    </span>
  );
}

export function DifficultyDots({ difficulty }: { difficulty: MissionDifficulty }) {
  const { language, t } = useLanguage();
  const { difficulty: difficulties } = useGame();
  const d = difficulties[difficulty];
  const label = difficultyLabel(difficulty, language, difficulties);
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
