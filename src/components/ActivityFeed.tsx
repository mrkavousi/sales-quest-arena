import { buildActivity, formatWhen, type ActivityKind } from '../game/activity';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { Icon, type IconName } from './ui/Icon';

const ICON: Record<ActivityKind, IconName> = { mission: 'check', quest: 'target', achievement: 'trophy' };

/** Newest activity first. Game XP is shown here; organizational points stay on the ranking. */
export function ActivityFeed() {
  const { progress, quests } = useGame();
  const items = buildActivity(progress, quests, 6);

  return (
    <section className="panel activity" aria-labelledby="activity-title">
      <header className="panel__head">
        <h2 id="activity-title">Recent activity</h2>
      </header>
      {items.length === 0 ? (
        <p className="activity__empty">No activity yet. Complete your first mission to start your history.</p>
      ) : (
        <ol className="activity__list">
          {items.map((item) => (
            <li key={item.id} className={`activity__item activity__item--${item.kind}`}>
              <span className="activity__icon" aria-hidden="true">
                <Icon name={ICON[item.kind]} size={18} strokeWidth={2.8} />
              </span>
              <div className="activity__body">
                <b>{item.title}</b>
                <small>
                  {item.detail} · {formatWhen(item.at)}
                </small>
              </div>
              {item.xp !== null && <span className="activity__xp">+{item.xp} XP</span>}
            </li>
          ))}
        </ol>
      )}
      <button className="linkbtn activity__more" onClick={() => navigate('/history')}>
        Full history →
      </button>
    </section>
  );
}
