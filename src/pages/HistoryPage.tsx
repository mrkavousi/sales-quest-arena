import type { CSSProperties } from 'react';
import { Mascot } from '../components/art/Mascot';
import { CATEGORY_ICON } from '../components/art/MissionArt';
import { Stars } from '../components/MissionBits';
import { CoinIcon, Icon, XpIcon } from '../components/ui/Icon';
import { formatDayLabel, formatTime } from '../game/dates';
import { CATEGORIES, getMission } from '../game/missions';
import type { HistoryEntry } from '../game/types';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

function HistoryCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const mission = getMission(entry.missionId);
  if (!mission) return null; // mission was removed from the catalog
  const meta = CATEGORIES[mission.category];
  const note = mission.steps.find((s) => s.type === 'note');
  const noteText = note ? entry.answers[note.id] : undefined;

  return (
    <li className="hcard" style={{ '--c': meta.color, '--d': meta.dark, '--soft': meta.soft, '--i': Math.min(index, 8) } as CSSProperties}>
      <span className="hcard__icon">
        <Icon name={CATEGORY_ICON[mission.category]} size={24} />
        <span className="hcard__check"><Icon name="check" size={11} strokeWidth={4.5} /></span>
      </span>
      <div className="hcard__body">
        <div className="hcard__top">
          <h3>{mission.title}</h3>
          <time dateTime={entry.completedAt}>{formatTime(entry.completedAt)}</time>
        </div>
        <div className="hcard__answers">
          {mission.steps.map((step) => {
            const value = entry.answers[step.id];
            if (value === undefined) return null;
            if (step.type === 'choice') {
              const option = step.options.find((o) => o.id === value);
              return option ? (
                <span key={step.id} className="hchip">
                  <span aria-hidden="true">{option.emoji}</span> {option.label}
                </span>
              ) : null;
            }
            if (step.type === 'rating') return <span key={step.id} className="hchip hchip--stars"><Stars value={value as number} size={13} /></span>;
            return null;
          })}
        </div>
        {typeof noteText === 'string' && noteText && <p className="hcard__note">“{noteText}”</p>}
        <div className="hcard__rewards">
          <span className="hcard__reward"><XpIcon size={16} />+{entry.rewards.xp} XP</span>
          <span className="hcard__reward"><CoinIcon size={16} />+{entry.rewards.coins}</span>
          {entry.wasDaily && <span className="pill pill--daily">Daily bonus</span>}
          {entry.levelAfter > entry.levelBefore && <span className="pill pill--level">Level {entry.levelAfter}!</span>}
        </div>
      </div>
    </li>
  );
}

export function HistoryPage() {
  const { progress, stats } = useGame();
  const groups: { label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of progress.history) {
    const label = formatDayLabel(entry.completedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  const xpFromMissions = progress.history.reduce((sum, h) => sum + h.rewards.xp, 0);

  return (
    <div className="pagebody">
      <header className="pagehead">
        <h1>Mission History</h1>
        <p>Every quest you have completed, newest first.</p>
      </header>

      {progress.history.length === 0 ? (
        <div className="empty">
          <Mascot size={110} mood="think" />
          <h2>No missions yet</h2>
          <p>Complete your first mission and it will show up here.</p>
          <button className="btn btn--green" onClick={() => navigate('/')}>
            Go to the arena
          </button>
        </div>
      ) : (
        <>
          <div className="summary">
            <div><b>{stats.missionsCompleted}</b><span>Missions</span></div>
            <div><b>{xpFromMissions}</b><span>XP earned</span></div>
            <div><b>{stats.ordersLogged}</b><span>Orders</span></div>
          </div>
          {groups.map((group) => (
            <section key={group.label} className="hgroup">
              <h2 className="hgroup__label">{group.label}</h2>
              <ul className="hlist">
                {group.entries.map((entry, i) => (
                  <HistoryCard key={entry.id} entry={entry} index={i} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
