import { useEffect } from 'react';
import { getLevelInfo } from '../game/levels';
import { isStreakSafeToday } from '../game/progress';
import { levelTitle } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { Avatar } from './art/Avatar';
import { CoinIcon, FlameIcon } from './ui/Icon';
import { useAnimatedNumber } from './ui/motion';
import { ProgressBar, ProgressRing } from './ui/Progress';

/** Totals last shown to the player in this session — lets the HUD count up after a mission. */
let lastShown: { owner: string; xp: number; coins: number } | null = null;

export function resetHeaderMemory(): void {
  lastShown = null;
}

export function PlayerHeader() {
  const { progress, stats, todayKey, config, mode, account } = useGame();
  const { language, t, n } = useLanguage();
  const owner = mode === 'server' ? `server:${account?.id ?? ''}` : 'local';
  const from = lastShown?.owner === owner ? lastShown : { xp: progress.xp, coins: progress.coins };
  const xp = useAnimatedNumber(progress.xp, { from: Math.min(from.xp, progress.xp), duration: 1300, delay: 450 });
  const coins = useAnimatedNumber(progress.coins, { from: Math.min(from.coins, progress.coins), duration: 1100, delay: 450 });

  useEffect(() => {
    lastShown = { owner, xp: progress.xp, coins: progress.coins };
  }, [owner, progress.xp, progress.coins]);

  // The whole HUD follows the animated XP, so the bar and level title "catch up" together.
  const level = getLevelInfo(xp, config.levels);
  const counting = xp !== progress.xp || coins !== progress.coins;
  const streakSafe = isStreakSafeToday(progress, todayKey);

  return (
    <header className="hud">
      <span className="hud__deco hud__deco--a" aria-hidden="true" />
      <span className="hud__deco hud__deco--b" aria-hidden="true" />

      <div className="hud__row">
        <button className="hud__avatar" onClick={() => navigate('/profile')} aria-label={t('hud.openProfile')}>
          <ProgressRing value={level.progress} size={76} stroke={6} color="var(--yellow)">
            <Avatar id={progress.player.avatar} size={58} />
          </ProgressRing>
          <span className="hud__lv" style={{ background: level.color }}>{n(level.level)}</span>
        </button>

        <div className="hud__id">
          <span className="hud__hello">{t('hud.welcomeBack')}</span>
          <span className="hud__name"><bdi>{progress.player.name}</bdi></span>
          <span className="hud__title">
            {t('common.levelTitle', { level: level.level, title: levelTitle(level.level, language, config.levels) })}
          </span>
        </div>

        <div className="hud__chips">
          <span className={`chip chip--glass${streakSafe ? ' is-lit' : ''}`} title={t(streakSafe ? 'hud.streakSafe' : 'hud.streakPrompt')}>
            <FlameIcon size={22} dim={stats.streak === 0} />
            <b>{n(stats.streak)}</b>
          </span>
          <span className={`chip chip--glass${counting ? ' is-bumping' : ''}`} title={t('common.coins')}>
            <CoinIcon size={22} />
            <b>{n(coins)}</b>
          </span>
        </div>
      </div>

      <div className="hud__xp">
        <div className="hud__xp-top">
          <span className="hud__xp-label">{level.isMax ? t('common.maxLevel') : t('common.xpToNext', { xp: level.nextMinXp! - xp, title: levelTitle(level.level + 1, language, config.levels) })}</span>
          <span className="hud__xp-num">
            <bdi dir="ltr"><b>{n(xp)}</b>{level.isMax ? '' : ` / ${n(level.nextMinXp!)}`}</bdi> {t('common.xp')}
          </span>
        </div>
        <ProgressBar value={level.progress} tone="yellow" size="lg" instant={counting} label={t('hud.xpProgress')} />
      </div>
    </header>
  );
}
