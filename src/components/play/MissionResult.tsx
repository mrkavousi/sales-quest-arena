import { useEffect, useState, type CSSProperties } from 'react';
import { getAchievement } from '../../game/achievements';
import { getLevelDef, getLevelInfo } from '../../game/levels';
import type { HistoryEntry, Mission } from '../../game/types';
import { navigate } from '../../router';
import { AchievementBadge } from '../AchievementBadge';
import { Confetti } from '../ui/Confetti';
import { CoinIcon, FlameIcon, XpIcon } from '../ui/Icon';
import { buzz, useAnimatedNumber } from '../ui/motion';
import { ProgressBar } from '../ui/Progress';
import { RewardFlyout, RewardHero } from './RewardAnimation';

type Phase = 'start' | 'fill' | 'levelup' | 'snap' | 'final';

function LevelBadge({ level, color, size = 64 }: { level: number; color: string; size?: number }) {
  return (
    <span className="levelbadge" style={{ '--lc': color, width: size, height: size * 1.1, fontSize: size * 0.42 } as CSSProperties}>
      <svg viewBox="0 0 64 70" aria-hidden="true">
        <path d="M32 3l25 9v22c0 16-10.5 27-25 33C17.5 61 7 50 7 34V12z" fill="rgba(0,0,0,.18)" transform="translate(0 3)" />
        <path d="M32 3l25 9v22c0 16-10.5 27-25 33C17.5 61 7 50 7 34V12z" fill="var(--lc)" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
        <path d="M32 9l19 7v9L32 18 13 25v-9z" fill="#fff" opacity=".28" />
      </svg>
      <b>{level}</b>
    </span>
  );
}

interface MissionResultProps {
  entry: HistoryEntry;
  mission: Mission;
}

/** Mission completion screen. Everything shown here is derived from the saved history entry. */
export function MissionResult({ entry, mission }: MissionResultProps) {
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
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [leveledUp]);

  useEffect(() => {
    if (phase !== 'snap') return;
    const t = window.setTimeout(() => setPhase('final'), 80);
    return () => window.clearTimeout(t);
  }, [phase]);

  const before = getLevelInfo(entry.xpBefore);
  const after = getLevelInfo(entry.xpAfter);
  const showAfter = !leveledUp || phase === 'snap' || phase === 'final';
  const shown = showAfter ? after : before;
  const barValue = phase === 'start' ? before.progress : !leveledUp ? after.progress : phase === 'snap' ? 0 : phase === 'final' ? after.progress : 1;
  const newLevel = getLevelDef(entry.levelAfter);
  const achievements = entry.achievementsUnlocked.map(getAchievement).filter((a) => a !== undefined);

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
        <RewardHero />

        <h1 className="result__title">Mission Completed!</h1>
        <p className="result__mission">{mission.title}</p>

        <div className="result__rewards">
          <div className="rewardcard rewardcard--xp">
            <XpIcon size={44} />
            <b>+{xpEarned}</b>
            <span>XP earned</span>
          </div>
          <div className="rewardcard rewardcard--coin">
            <CoinIcon size={44} />
            <b>+{coinsEarned}</b>
            <span>Coins earned</span>
          </div>
        </div>

        <ul className="result__lines" aria-label="Reward breakdown">
          {entry.rewards.lines.map((line, i) => (
            <li key={line.ruleId} style={{ '--i': i } as CSSProperties}>
              <span>{line.label}</span>
              <span className="result__line-values">
                {line.xp > 0 && <b className="is-xp">+{line.xp} XP</b>}
                {line.coins > 0 && <b className="is-coin">+{line.coins} coins</b>}
              </span>
            </li>
          ))}
        </ul>

        <div className={`result__level${showAfter && leveledUp ? ' is-new' : ''}`}>
          <LevelBadge key={shown.level} level={shown.level} color={shown.color} />
          <div className="result__level-info">
            <div className="result__level-top">
              <span className="result__level-name">
                Level {shown.level} · {shown.title}
              </span>
              <span className="result__total">
                <b>{totalXp}</b> XP total
              </span>
            </div>
            <ProgressBar value={barValue} tone="yellow" size="lg" instant={phase === 'snap'} label="Level progress" />
            <span className="result__level-hint">
              {shown.isMax ? 'Max level reached — you are a Champion!' : `${Math.max(0, shown.nextMinXp! - totalXp)} XP to ${shown.nextTitle}`}
            </span>
          </div>
        </div>

        {achievements.length > 0 && (
          <div className="result__achievements">
            <h2>{achievements.length > 1 ? 'Achievements unlocked!' : 'Achievement unlocked!'}</h2>
            <ul>
              {achievements.map((a, i) => (
                <li key={a.id} style={{ '--i': i } as CSSProperties}>
                  <AchievementBadge achievement={a} unlocked size="md" showLabel={false} />
                  <div>
                    <b>{a.title}</b>
                    <span>{a.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="result__streak">
          <FlameIcon size={22} />
          <span>
            <b>{entry.streakAfter}-day streak</b> · {entry.streakAfter > 1 ? 'keep it burning!' : 'play again tomorrow'}
          </span>
        </div>
      </div>

      <footer className="result__foot">
        <div className="result__foot-inner">
          <RewardFlyout active={collecting} />
          <button className="btn btn--yellow btn--block btn--lg" onClick={() => collect('/')} disabled={collecting}>
            Collect &amp; continue
          </button>
          <button className="linkbtn linkbtn--light" onClick={() => navigate('/history')} disabled={collecting}>
            View mission history
          </button>
        </div>
      </footer>

      {phase === 'levelup' && (
        <div className="levelup" role="dialog" aria-modal="true" aria-label={`Level up! You reached level ${newLevel.level}`} onClick={() => setPhase('snap')}>
          <span className="levelup__rays" aria-hidden="true" />
          <div className="levelup__card">
            <span className="levelup__eyebrow">Level up!</span>
            <LevelBadge level={newLevel.level} color={newLevel.color} size={130} />
            <h2>{newLevel.title}</h2>
            <p>You reached Level {newLevel.level}. Keep the quests coming!</p>
            <button className="btn btn--yellow btn--block" onClick={() => setPhase('snap')} autoFocus>
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
