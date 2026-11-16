import { n } from '../i18n';
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
  const { mode, progress, level, stats, persistence, updatePlayer, resetProgress, toast } = useGame();
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
        <button className="profile__avatar" onClick={() => setPickerOpen(true)} aria-label="تغییر آواتار">
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
              aria-label="نام بازیکن"
            />
            <button className="btn btn--yellow btn--sm" type="button" onClick={saveName}>ذخیره</button>
          </div>
        ) : (
          <button className="profile__name" onClick={() => { setName(progress.player.name); setEditing(true); }} aria-label="ویرایش نام بازیکن">
            {progress.player.name}
            <Icon name="pencil" size={16} />
          </button>
        )}
        <span className="profile__title" style={{ '--lc': level.color } as CSSProperties}>
          Level {level.level} · {level.title}
        </span>
        <div className="profile__xp">
          <ProgressBar value={level.progress} tone="yellow" size="md" label="XP progress" />
          <span>{level.isMax ? `${n(progress.xp)} امتیاز · بالاترین سطح` : `${n(progress.xp)} / ${n(level.nextMinXp)} امتیاز`}</span>
        </div>
      </section>

      <section className="statgrid" aria-label="آمار">
        <div className="statgrid__item"><XpIcon size={28} /><b>{n(stats.totalXp)}</b><span>امتیاز تجربه</span></div>
        <div className="statgrid__item"><CoinIcon size={28} /><b>{n(stats.coins)}</b><span>سکه</span></div>
        <div className="statgrid__item"><FlameIcon size={28} dim={stats.streak === 0} /><b>{n(stats.streak)}</b><span>روز پیاپی</span></div>
        <div className="statgrid__item"><span className="statgrid__check"><Icon name="check" size={16} strokeWidth={4} /></span><b>{n(stats.missionsCompleted)}</b><span>مأموریت</span></div>
      </section>

      <section className="panel">
        <header className="panel__head"><h2>مسیر سطح‌ها</h2></header>
        <ol className="levels">
          {LEVELS.map((l) => {
            const state = l.level < level.level ? 'done' : l.level === level.level ? 'current' : 'next';
            return (
              <li key={l.level} className={`levels__item is-${state}`} style={{ '--lc': l.color } as CSSProperties}>
                <span className="levels__dot">{state === 'done' ? <Icon name="check" size={16} strokeWidth={4} /> : l.level}</span>
                <span className="levels__name">{l.title}</span>
                <span className="levels__xp">{state === 'current' ? 'شما اینجا هستید' : `${n(l.minXp)} امتیاز`}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2>دستاوردها <span className="panel__count">{n(stats.achievements)}/{n(ACHIEVEMENTS.length)}</span></h2>
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
                  {!unlocked && p && <em>{n(Math.min(p.current, p.target))}/{n(p.target)}</em>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel panel--quiet">
        <header className="panel__head"><h2>ذخیرهٔ اطلاعات</h2></header>
        <p className={`savestate savestate--${persistence}`}>
          <i />
          {mode === 'server'
            ? 'پیشرفت شما روی سرور کیلوس ذخیره و تأیید می‌شود (داده نمایشی).'
            : persistence === 'saved'
              ? 'پیشرفت روی همین دستگاه ذخیره می‌شود.'
              : 'پیشرفت در این مرورگر ذخیره نمی‌شود.'}
        </p>
        {mode === 'local' && (
          <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setResetOpen(true)}>
            <Icon name="trash" size={16} /> بازنشانی همهٔ پیشرفت
          </button>
        )}
      </section>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} label="قهرمان خود را انتخاب کنید" size="sm">
        <div className="confirm">
          <h2>قهرمان خود را انتخاب کنید</h2>
          <div className="avatar-picker avatar-picker--lg" role="radiogroup" aria-label="آواتار">
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
          <button className="btn btn--green btn--block" onClick={() => setPickerOpen(false)}>تأیید</button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} label="بازنشانی پیشرفت" size="sm" hideClose>
        <div className="confirm">
          <h2>همه چیز بازنشانی شود؟</h2>
          <p>سطح، سکه‌ها، نشان‌ها و تاریخچهٔ مأموریت‌ها روی این دستگاه برای همیشه حذف می‌شود.</p>
          <button className="btn btn--ghost btn--block" onClick={() => setResetOpen(false)}>پیشرفتم بماند</button>
          <button
            className="btn btn--coral btn--block"
            onClick={() => {
              resetHeaderMemory();
              resetProgress();
              setResetOpen(false);
              toast('پیشرفت بازنشانی شد. ماجراجویی تازه‌ای در راه است!', 'info');
            }}
          >
            بله، بازنشانی
          </button>
        </div>
      </Sheet>
    </div>
  );
}
