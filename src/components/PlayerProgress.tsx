import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { AchievementBadge } from './AchievementBadge';
import { FlameIcon, Icon, XpIcon } from './ui/Icon';
import { useAnimatedNumber } from './ui/motion';

function StatTile({ value, label, tone, children }: { value: number; label: string; tone: string; children: React.ReactNode }) {
  const { n } = useLanguage();
  const shown = useAnimatedNumber(value, { duration: 900 });
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__icon">{children}</span>
      <b className="stat__value">{n(shown)}</b>
      <span className="stat__label">{label}</span>
    </div>
  );
}

/** Player progress summary: totals, streak and achievement badges. */
export function PlayerProgress() {
  const { progress, stats, achievements } = useGame();
  const { t, n } = useLanguage();
  const sorted = [...achievements].sort((a, b) => Number(!!progress.achievements[b.id]) - Number(!!progress.achievements[a.id]));

  return (
    <section className="panel progress" aria-label={t('progress.title')}>
      <header className="panel__head">
        <h2>{t('progress.title')}</h2>
      </header>
      <div className="stats">
        <StatTile value={stats.missionsCompleted} label={t('nav.missions')} tone="green">
          <Icon name="check" size={20} strokeWidth={3.4} />
        </StatTile>
        <StatTile value={stats.totalXp} label={t('common.totalXp')} tone="blue">
          <XpIcon size={24} />
        </StatTile>
        <StatTile value={stats.streak} label={t('common.dayStreak')} tone="orange">
          <FlameIcon size={24} dim={stats.streak === 0} />
        </StatTile>
      </div>

      <header className="panel__head panel__head--sub">
        <h3>
          {t('progress.badges')} <span className="panel__count"><bdi dir="ltr">{n(stats.achievements)}/{n(achievements.length)}</bdi></span>
        </h3>
        <button className="linkbtn" onClick={() => navigate('/profile')}>
          {t('progress.seeAll')}
        </button>
      </header>
      <div className="badge-row">
        {sorted.slice(0, 5).map((a) => (
          <AchievementBadge key={a.id} achievement={a} unlocked={!!progress.achievements[a.id]} size="sm" />
        ))}
      </div>
    </section>
  );
}
