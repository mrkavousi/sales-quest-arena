import { useState, type CSSProperties } from 'react';
import { AchievementBadge } from '../components/AchievementBadge';
import { Avatar, AVATARS } from '../components/art/Avatar';
import { resetHeaderMemory } from '../components/PlayerHeader';
import { CoinIcon, FlameIcon, Icon, XpIcon } from '../components/ui/Icon';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { Sheet } from '../components/ui/Sheet';
import { ACHIEVEMENTS } from '../game/achievements';
import { LEVELS } from '../game/levels';
import { AVATAR_IDS } from '../game/progress';
import { useGame } from '../state/GameContext';

export function ProfilePage() {
  const { progress, level, stats, persistence, updatePlayer, resetProgress, toast } = useGame();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(progress.player.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const saveName = () => {
    if (name.trim()) updatePlayer({ name });
    else setName(progress.player.name);
    setEditing(false);
  };

  return (
    <div className="pagebody profile">
      <section className="profile__hero">
        <button className="profile__avatar" onClick={() => setPickerOpen(true)} aria-label="Change avatar">
          <ProgressRing value={level.progress} size={132} stroke={9} color="var(--yellow)">
            <Avatar id={progress.player.avatar} size={104} />
          </ProgressRing>
          <span className="profile__edit"><Icon name="pencil" size={15} /></span>
        </button>

        {editing ? (
          <div className="profile__nameform">
            <input
              className="input input--center"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              maxLength={24}
              autoFocus
              aria-label="Player name"
            />
            <button className="btn btn--yellow btn--sm" type="button" onClick={saveName}>Save</button>
          </div>
        ) : (
          <button className="profile__name" onClick={() => { setName(progress.player.name); setEditing(true); }} aria-label="Edit player name">
            {progress.player.name}
            <Icon name="pencil" size={16} />
          </button>
        )}
        <span className="profile__title" style={{ '--lc': level.color } as CSSProperties}>
          Level {level.level} · {level.title}
        </span>
        <div className="profile__xp">
          <ProgressBar value={level.progress} tone="yellow" size="md" label="XP progress" />
          <span>{level.isMax ? `${progress.xp} XP · max level` : `${progress.xp} / ${level.nextMinXp} XP`}</span>
        </div>
      </section>

      <section className="statgrid" aria-label="Stats">
        <div className="statgrid__item"><XpIcon size={28} /><b>{stats.totalXp}</b><span>Total XP</span></div>
        <div className="statgrid__item"><CoinIcon size={28} /><b>{stats.coins}</b><span>Coins</span></div>
        <div className="statgrid__item"><FlameIcon size={28} dim={stats.streak === 0} /><b>{stats.streak}</b><span>Day streak</span></div>
        <div className="statgrid__item"><span className="statgrid__check"><Icon name="check" size={16} strokeWidth={4} /></span><b>{stats.missionsCompleted}</b><span>Missions</span></div>
      </section>

      <section className="panel">
        <header className="panel__head"><h2>Level path</h2></header>
        <ol className="levels">
          {LEVELS.map((l) => {
            const state = l.level < level.level ? 'done' : l.level === level.level ? 'current' : 'next';
            return (
              <li key={l.level} className={`levels__item is-${state}`} style={{ '--lc': l.color } as CSSProperties}>
                <span className="levels__dot">{state === 'done' ? <Icon name="check" size={16} strokeWidth={4} /> : l.level}</span>
                <span className="levels__name">{l.title}</span>
                <span className="levels__xp">{state === 'current' ? 'You are here' : `${l.minXp} XP`}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2>Achievements <span className="panel__count">{stats.achievements}/{ACHIEVEMENTS.length}</span></h2>
        </header>
        <ul className="achievements">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = !!progress.achievements[a.id];
            const p = a.progress?.(progress);
            return (
              <li key={a.id} className={unlocked ? 'is-unlocked' : 'is-locked'}>
                <AchievementBadge achievement={a} unlocked={unlocked} size="md" showLabel={false} />
                <div>
                  <b>{a.title}</b>
                  <span>{a.description}</span>
                  {!unlocked && p && <em>{Math.min(p.current, p.target)}/{p.target}</em>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel panel--quiet">
        <header className="panel__head"><h2>Save data</h2></header>
        <p className={`savestate savestate--${persistence}`}>
          <i />
          {persistence === 'saved' ? 'Progress is saved on this device.' : 'Progress is NOT being saved in this browser.'}
        </p>
        <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setResetOpen(true)}>
          <Icon name="trash" size={16} /> Reset all progress
        </button>
      </section>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} label="Choose your hero" size="sm">
        <div className="confirm">
          <h2>Choose your hero</h2>
          <div className="avatar-picker avatar-picker--lg" role="radiogroup" aria-label="Avatar">
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={progress.player.avatar === id}
                aria-label={AVATARS[id].name}
                className={`avatar-picker__item${progress.player.avatar === id ? ' is-selected' : ''}`}
                onClick={() => updatePlayer({ avatar: id })}
              >
                <Avatar id={id} size={72} />
              </button>
            ))}
          </div>
          <button className="btn btn--green btn--block" onClick={() => setPickerOpen(false)}>Done</button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} label="Reset progress" size="sm" hideClose>
        <div className="confirm">
          <h2>Reset everything?</h2>
          <p>This permanently deletes your level, coins, badges and mission history on this device.</p>
          <button className="btn btn--ghost btn--block" onClick={() => setResetOpen(false)}>Keep my progress</button>
          <button
            className="btn btn--coral btn--block"
            onClick={() => {
              resetHeaderMemory();
              resetProgress();
              setResetOpen(false);
              toast('Progress reset. A fresh adventure awaits!', 'info');
            }}
          >
            Yes, reset
          </button>
        </div>
      </Sheet>
    </div>
  );
}
