import { useState, type CSSProperties } from 'react';
import { AchievementBadge } from '../components/AchievementBadge';
import { Avatar } from '../components/art/Avatar';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { resetHeaderMemory } from '../components/PlayerHeader';
import { CoinIcon, FlameIcon, Icon, XpIcon } from '../components/ui/Icon';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { Sheet } from '../components/ui/Sheet';
import { ACHIEVEMENTS } from '../game/achievements';
import { LEVELS } from '../game/levels';
import { AVATAR_IDS } from '../game/progress';
import { levelTitle, localizeAchievement } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { useGame } from '../state/GameContext';

export function ProfilePage() {
  const { progress, level, stats, persistence, updatePlayer, resetProgress, toast } = useGame();
  const { language, t, n } = useLanguage();
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
        <button className="profile__avatar" onClick={() => setPickerOpen(true)} aria-label={t('profile.changeAvatar')}>
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
              dir="auto"
              autoFocus
              aria-label={t('profile.playerName')}
            />
            <button className="btn btn--yellow btn--sm" type="button" onClick={saveName}>{t('common.save')}</button>
          </div>
        ) : (
          <button className="profile__name" onClick={() => { setName(progress.player.name); setEditing(true); }} aria-label={t('profile.editName')}>
            <bdi>{progress.player.name}</bdi>
            <Icon name="pencil" size={16} />
          </button>
        )}
        <span className="profile__title" style={{ '--lc': level.color } as CSSProperties}>
          {t('common.levelTitle', { level: level.level, title: levelTitle(level.level, language) })}
        </span>
        <div className="profile__xp">
          <ProgressBar value={level.progress} tone="yellow" size="md" label={t('common.xpProgress')} />
          <span>{level.isMax ? t('common.xpAtMax', { xp: progress.xp }) : t('common.xpFraction', { xp: progress.xp, next: level.nextMinXp! })}</span>
        </div>
      </section>

      <section className="statgrid" aria-label={t('profile.stats')}>
        <div className="statgrid__item"><XpIcon size={28} /><b>{n(stats.totalXp)}</b><span>{t('common.totalXp')}</span></div>
        <div className="statgrid__item"><CoinIcon size={28} /><b>{n(stats.coins)}</b><span>{t('common.coins')}</span></div>
        <div className="statgrid__item"><FlameIcon size={28} dim={stats.streak === 0} /><b>{n(stats.streak)}</b><span>{t('common.dayStreak')}</span></div>
        <div className="statgrid__item"><span className="statgrid__check"><Icon name="check" size={16} strokeWidth={4} /></span><b>{n(stats.missionsCompleted)}</b><span>{t('nav.missions')}</span></div>
      </section>

      <section className="panel profile__language">
        <header className="panel__head"><h2>{t('language.label')}</h2></header>
        <LanguageSwitcher />
      </section>

      <section className="panel">
        <header className="panel__head"><h2>{t('profile.levelPath')}</h2></header>
        <ol className="levels">
          {LEVELS.map((l) => {
            const state = l.level < level.level ? 'done' : l.level === level.level ? 'current' : 'next';
            return (
              <li key={l.level} className={`levels__item is-${state}`} style={{ '--lc': l.color } as CSSProperties}>
                <span className="levels__dot">{state === 'done' ? <Icon name="check" size={16} strokeWidth={4} /> : n(l.level)}</span>
                <span className="levels__name">{levelTitle(l.level, language)}</span>
                <span className="levels__xp">{state === 'current' ? t('profile.youAreHere') : t('common.xpAmount', { xp: l.minXp })}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2>{t('profile.achievements')} <span className="panel__count"><bdi dir="ltr">{n(stats.achievements)}/{n(ACHIEVEMENTS.length)}</bdi></span></h2>
        </header>
        <ul className="achievements">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = !!progress.achievements[a.id];
            const p = a.progress?.(progress);
            const text = localizeAchievement(a, language);
            return (
              <li key={a.id} className={unlocked ? 'is-unlocked' : 'is-locked'}>
                <AchievementBadge achievement={a} unlocked={unlocked} size="md" showLabel={false} />
                <div>
                  <b>{text.title}</b>
                  <span>{text.description}</span>
                  {!unlocked && p && <em><bdi dir="ltr">{n(Math.min(p.current, p.target))}/{n(p.target)}</bdi></em>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel panel--quiet">
        <header className="panel__head"><h2>{t('profile.saveData')}</h2></header>
        <p className={`savestate savestate--${persistence}`}>
          <i />
          {t(persistence === 'saved' ? 'profile.saved' : 'profile.notSaved')}
        </p>
        <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setResetOpen(true)}>
          <Icon name="trash" size={16} /> {t('profile.reset')}
        </button>
      </section>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} label={t('welcome.chooseHero')} size="sm">
        <div className="confirm">
          <h2>{t('welcome.chooseHero')}</h2>
          <div className="avatar-picker avatar-picker--lg" role="radiogroup" aria-label={t('common.avatar')}>
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={progress.player.avatar === id}
                aria-label={t(`avatar.${id}`)}
                className={`avatar-picker__item${progress.player.avatar === id ? ' is-selected' : ''}`}
                onClick={() => updatePlayer({ avatar: id })}
              >
                <Avatar id={id} size={72} />
              </button>
            ))}
          </div>
          <button className="btn btn--green btn--block" onClick={() => setPickerOpen(false)}>{t('common.done')}</button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} label={t('profile.resetLabel')} size="sm" hideClose>
        <div className="confirm">
          <h2>{t('profile.resetTitle')}</h2>
          <p>{t('profile.resetDescription')}</p>
          <button className="btn btn--ghost btn--block" onClick={() => setResetOpen(false)}>{t('profile.keepProgress')}</button>
          <button
            className="btn btn--coral btn--block"
            onClick={() => {
              resetHeaderMemory();
              resetProgress();
              setResetOpen(false);
              toast(t('profile.resetToast'), 'info');
            }}
          >
            {t('profile.confirmReset')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
