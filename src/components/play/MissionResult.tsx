import { useEffect, useState, type CSSProperties } from 'react';
import { getLevelDef, getLevelInfo } from '../../game/levels';
import type { HistoryEntry, Mission } from '../../game/types';
import { levelTitle, localizeAchievement, rewardLabel } from '../../i18n/content';
import { useLanguage } from '../../i18n/LanguageContext';
import { navigate } from '../../router';
import { useGame } from '../../state/GameContext';
import { AchievementBadge } from '../AchievementBadge';
import { Confetti } from '../ui/Confetti';
import { CoinIcon, FlameIcon, XpIcon } from '../ui/Icon';
import { buzz, useAnimatedNumber } from '../ui/motion';
import { ProgressBar } from '../ui/Progress';
import { RewardFlyout, RewardHero } from './RewardAnimation';

type Phase = 'start' | 'fill' | 'levelup' | 'snap' | 'final';

function LevelBadge({ level, color, size = 64 }: { level: number; color: string; size?: number }) {
  const { n } = useLanguage();
  return (
    <span className="levelbadge" style={{ '--lc': color, width: size, height: size * 1.1, fontSize: size * 0.42 } as CSSProperties}>
      <svg viewBox="0 0 64 70" aria-hidden="true">
        <path d="M32 3l25 9v22c0 16-10.5 27-25 33C17.5 61 7 50 7 34V12z" fill="rgba(0,0,0,.18)" transform="translate(0 3)" />
        <path d="M32 3l25 9v22c0 16-10.5 27-25 33C17.5 61 7 50 7 34V12z" fill="var(--lc)" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
        <path d="M32 9l19 7v9L32 18 13 25v-9z" fill="#fff" opacity=".28" />
      </svg>
      <b>{n(level)}</b>
    </span>
  );
}

interface MissionResultProps {
  entry: HistoryEntry;
  mission: Mission;
}

/** Mission completion screen. Everything shown here is derived from the saved history entry. */
export function MissionResult({ entry, mission }: MissionResultProps) {
  const { language, t, n } = useLanguage();
  const { mode, persistence, contractError, refresh, config, achievements: achievementCatalog } = useGame();
  const leveledUp = entry.levelAfter > entry.levelBefore;
  const [phase, setPhase] = useState<Phase>('start');
  const [burst, setBurst] = useState(0);
  const [collecting, setCollecting] = useState(false);

  const xpEarned = useAnimatedNumber(entry.rewards.xp, { from: 0, duration: 1000, delay: 750 });
  const coinsEarned = useAnimatedNumber(entry.rewards.coins, { from: 0, duration: 800, delay: 950 });
  const totalXp = useAnimatedNumber(phase === 'start' ? entry.xpBefore : entry.xpAfter, { from: entry.xpBefore, duration: 1100 });

  // Scripted level-bar sequence.
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(leveledUp ? 'fill' : 'final'), 1900),
      ...(leveledUp ? [window.setTimeout(() => { setPhase('levelup'); setBurst((b) => b + 1); buzz([20, 60, 40]); }, 2850)] : []),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [leveledUp]);

  useEffect(() => {
    if (phase !== 'snap') return;
    const timer = window.setTimeout(() => setPhase('final'), 80);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const before = getLevelInfo(entry.xpBefore, config.levels);
  const after = getLevelInfo(entry.xpAfter, config.levels);
  const showAfter = !leveledUp || phase === 'snap' || phase === 'final';
  const shown = showAfter ? after : before;
  const barValue = phase === 'start' ? before.progress : !leveledUp ? after.progress : phase === 'snap' ? 0 : phase === 'final' ? after.progress : 1;
  const newLevel = getLevelDef(entry.levelAfter, config.levels);
  const achievements = entry.achievementsUnlocked.map((id) => achievementCatalog.find((item) => item.id === id)).filter((a) => a !== undefined);

  const collect = (to: string) => {
    if (collecting) return;
    buzz(15);
    setCollecting(true);
    window.setTimeout(() => navigate(to), 750);
  };

  return (
    <div className="result">
      <Confetti burst={burst} />
      <div className="result__stage">
        {mode === 'server' && (persistence === 'error' || contractError) && (
          <div className="result__sync" role="alert">
            <p>{t('connection.resultRefreshWarning')}</p>
            {contractError && <p>{t(contractError === 'UNSUPPORTED_VERSION' ? 'connection.errorVersion' : 'connection.errorResponse')} {t('connection.compatibilityPaused')}</p>}
            <button className="linkbtn" onClick={() => void refresh()}>{t('connection.retry')}</button>
          </div>
        )}
        <RewardHero />

        <h1 className="result__title">{t('result.completed')}</h1>
        <p className="result__mission">{mission.title}</p>

        <div className="result__rewards">
          <div className="rewardcard rewardcard--xp">
            <XpIcon size={44} />
            <b><bdi dir="ltr">+{n(xpEarned)}</bdi></b>
            <span>{t('history.xpEarned')}</span>
          </div>
          <div className="rewardcard rewardcard--coin">
            <CoinIcon size={44} />
            <b><bdi dir="ltr">+{n(coinsEarned)}</bdi></b>
            <span>{t('result.coinsEarned')}</span>
          </div>
        </div>

        <ul className="result__lines" aria-label={t('result.breakdown')}>
          {entry.rewards.lines.map((line, i) => (
            <li key={line.ruleId} style={{ '--i': i } as CSSProperties}>
              <span>{rewardLabel(line, language)}</span>
              <span className="result__line-values">
                {line.xp > 0 && <b className="is-xp"><bdi dir="ltr">+{n(line.xp)}</bdi> {t('common.xp')}</b>}
                {line.coins > 0 && <b className="is-coin"><bdi dir="ltr">+{n(line.coins)}</bdi> {t('result.coinsUnit')}</b>}
              </span>
            </li>
          ))}
        </ul>

        <div className={`result__level${showAfter && leveledUp ? ' is-new' : ''}`}>
          <LevelBadge key={shown.level} level={shown.level} color={shown.color} />
          <div className="result__level-info">
            <div className="result__level-top">
              <span className="result__level-name">
                {t('common.levelTitle', { level: shown.level, title: levelTitle(shown.level, language, config.levels) })}
              </span>
              <span className="result__total">
                <b>{n(totalXp)}</b> {t(mode === 'server' ? 'result.xpAfterMission' : 'result.xpTotalUnit')}
              </span>
            </div>
            <ProgressBar value={barValue} tone="yellow" size="lg" instant={phase === 'snap'} label={t('common.levelProgress')} />
            <span className="result__level-hint">
              {shown.isMax ? t('result.maxLevel') : t('common.xpToNext', { xp: Math.max(0, shown.nextMinXp! - totalXp), title: levelTitle(shown.level + 1, language, config.levels) })}
            </span>
          </div>
        </div>

        {achievements.length > 0 && (
          <div className="result__achievements">
            <h2>{t(achievements.length > 1 ? 'result.achievementMany' : 'result.achievementOne')}</h2>
            <ul>
              {achievements.map((a, i) => {
                const text = localizeAchievement(a, language);
                return (
                  <li key={a.id} style={{ '--i': i } as CSSProperties}>
                    <AchievementBadge achievement={a} unlocked size="md" showLabel={false} />
                    <div>
                      <b>{text.title}</b>
                      <span>{text.description}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="result__streak">
          <FlameIcon size={22} />
          <span>
            <b>{t('result.streak', { days: entry.streakAfter })}</b> · {t(entry.streakAfter > 1 ? 'result.keepBurning' : 'result.tomorrow')}
          </span>
        </div>
      </div>

      <footer className="result__foot">
        <div className="result__foot-inner">
          <RewardFlyout active={collecting} />
          <button className="btn btn--yellow btn--block btn--lg" onClick={() => collect('/')} disabled={collecting}>
            {t('result.collect')}
          </button>
          <button className="linkbtn linkbtn--light" onClick={() => navigate('/history')} disabled={collecting}>
            {t('result.viewHistory')}
          </button>
        </div>
      </footer>

      {phase === 'levelup' && (
        <div className="levelup" role="dialog" aria-modal="true" aria-label={t('result.levelUpLabel', { level: newLevel.level })} onClick={() => setPhase('snap')}>
          <span className="levelup__rays" aria-hidden="true" />
          <div className="levelup__card">
            <span className="levelup__eyebrow">{t('result.levelUp')}</span>
            <LevelBadge level={newLevel.level} color={newLevel.color} size={130} />
            <h2>{levelTitle(newLevel.level, language, config.levels)}</h2>
            <p>{t('result.levelUpDescription', { level: newLevel.level })}</p>
            <button className="btn btn--yellow btn--block" onClick={() => setPhase('snap')} autoFocus>
              {t('result.awesome')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
