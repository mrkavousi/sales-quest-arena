import { useEffect } from 'react';
import { n } from '../i18n';
import { getLevelInfo } from '../game/levels';
import { isStreakSafeToday } from '../game/progress';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { Avatar } from './art/Avatar';
import { CoinIcon, FlameIcon } from './ui/Icon';
import { useAnimatedNumber } from './ui/motion';
import { ProgressBar, ProgressRing } from './ui/Progress';

/** Totals last shown to the player in this session — lets the HUD count up after a mission. */
let lastShown: { xp: number; coins: number } | null = null;

export function resetHeaderMemory(): void {
  lastShown = null;
}

export function PlayerHeader() {
  const { progress, stats, todayKey } = useGame();
  const from = lastShown ?? { xp: progress.xp, coins: progress.coins };
  const xp = useAnimatedNumber(progress.xp, { from: Math.min(from.xp, progress.xp), duration: 1300, delay: 450 });
  const coins = useAnimatedNumber(progress.coins, { from: Math.min(from.coins, progress.coins), duration: 1100, delay: 450 });

  useEffect(() => {
    lastShown = { xp: progress.xp, coins: progress.coins };
  }, [progress.xp, progress.coins]);

  // The whole HUD follows the animated XP, so the bar and level title "catch up" together.
  const level = getLevelInfo(xp);
  const counting = xp !== progress.xp || coins !== progress.coins;
  const streakSafe = isStreakSafeToday(progress, todayKey);

  return (
    <header className="hud">
      <span className="hud__deco hud__deco--a" aria-hidden="true" />
      <span className="hud__deco hud__deco--b" aria-hidden="true" />

      <div className="hud__row">
        <button className="hud__avatar" onClick={() => navigate('/profile')} aria-label="باز کردن پروفایل">
          <ProgressRing value={level.progress} size={76} stroke={6} color="var(--yellow)">
            <Avatar id={progress.player.avatar} size={58} />
          </ProgressRing>
          <span className="hud__lv" style={{ background: level.color }}>{n(level.level)}</span>
        </button>

        <div className="hud__id">
          <span className="hud__hello">خوش آمدی</span>
          <span className="hud__name" dir="auto">{progress.player.name}</span>
          <span className="hud__title">
            سطح {n(level.level)} · {level.title}
          </span>
        </div>

        <div className="hud__chips">
          <span className={`chip chip--glass${streakSafe ? ' is-lit' : ''}`} title={streakSafe ? 'امروز روزهای پیاپی شما حفظ شده است' : 'برای افزایش روزهای پیاپی، امروز یک مأموریت انجام دهید'}>
            <FlameIcon size={22} dim={stats.streak === 0} />
            <b>{n(stats.streak)}</b>
            <small className="chip__unit">روز</small>
          </span>
          <span className={`chip chip--glass${counting ? ' is-bumping' : ''}`} title="سکه‌ها">
            <CoinIcon size={22} />
            <b>{n(coins)}</b>
          </span>
        </div>
      </div>

      <div className="hud__xp">
        <div className="hud__xp-top">
          <span className="hud__xp-label">{level.isMax ? 'به بالاترین سطح رسیده‌اید' : `${n(level.nextMinXp! - xp)} امتیاز تا «${level.nextTitle}»`}</span>
          <span className="hud__xp-num">
            <b>{n(xp)}</b>
            {level.isMax ? ' امتیاز' : ` / ${n(level.nextMinXp)} امتیاز`}
          </span>
        </div>
        <ProgressBar value={level.progress} tone="yellow" size="lg" instant={counting} label="پیشرفت امتیاز تجربه تا سطح بعد" />
      </div>
    </header>
  );
}
