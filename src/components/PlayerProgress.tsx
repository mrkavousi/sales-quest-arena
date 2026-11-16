import { ACHIEVEMENTS } from '../game/achievements';
import { n } from '../i18n';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { AchievementBadge } from './AchievementBadge';
import { FlameIcon, Icon, XpIcon } from './ui/Icon';
import { useAnimatedNumber } from './ui/motion';

function StatTile({ value, label, tone, children }: { value: number; label: string; tone: string; children: React.ReactNode }) {
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
  const { progress, stats } = useGame();
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!!progress.achievements[b.id]) - Number(!!progress.achievements[a.id]));

  return (
    <section className="panel progress" aria-label="پیشرفت شما">
      <header className="panel__head">
        <h2>پیشرفت شما</h2>
      </header>
      <div className="stats">
        <StatTile value={stats.missionsCompleted} label="مأموریت" tone="green">
          <Icon name="check" size={20} strokeWidth={3.4} />
        </StatTile>
        <StatTile value={stats.totalXp} label="امتیاز تجربه" tone="blue">
          <XpIcon size={24} />
        </StatTile>
        <StatTile value={stats.streak} label="روز پیاپی" tone="orange">
          <FlameIcon size={24} dim={stats.streak === 0} />
        </StatTile>
      </div>

      <header className="panel__head panel__head--sub">
        <h3>
          نشان‌ها <span className="panel__count">{n(stats.achievements)}/{n(ACHIEVEMENTS.length)}</span>
        </h3>
        <button className="linkbtn" onClick={() => navigate('/profile')}>
          همه نشان‌ها
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
