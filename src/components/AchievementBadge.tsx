import type { CSSProperties } from 'react';
import type { AchievementDef } from '../game/achievements';
import { localizeAchievement } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { Icon } from './ui/Icon';

interface AchievementBadgeProps {
  achievement: AchievementDef;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  /** e.g. "2/5" for locked counters */
  progress?: string;
}

export function AchievementBadge({ achievement, unlocked, size = 'md', showLabel = true, progress }: AchievementBadgeProps) {
  const { language } = useLanguage();
  const text = localizeAchievement(achievement, language);
  return (
    <div
      className={`badge badge--${size}${unlocked ? ' is-unlocked' : ' is-locked'}`}
      style={{ '--b1': achievement.colors[0], '--b2': achievement.colors[1] } as CSSProperties}
      title={`${text.title} — ${text.description}`}
    >
      <div className="badge__medal">
        <span className="badge__emoji" aria-hidden="true">{achievement.emoji}</span>
        {!unlocked && (
          <span className="badge__lock" aria-hidden="true">
            <Icon name="lock" size={size === 'sm' ? 11 : 13} strokeWidth={3} />
          </span>
        )}
      </div>
      {showLabel && (
        <div className="badge__text">
          <span className="badge__title">{text.title}</span>
          {progress && !unlocked && <span className="badge__progress">{progress}</span>}
        </div>
      )}
    </div>
  );
}
