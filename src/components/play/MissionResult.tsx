import { jperiod, n } from '../../i18n';
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

        <h1 className="result__title">مأموریت تکمیل شد!</h1>
        <p className="result__mission">{mission.title}</p>

        <div className="result__rewards">
          <div className="rewardcard rewardcard--xp">
            <XpIcon size={44} />
            <b>+{n(xpEarned)}</b>
            <span>امتیاز تجربه</span>
          </div>
          <div className="rewardcard rewardcard--coin">
            <CoinIcon size={44} />
            <b>+{n(coinsEarned)}</b>
            <span>سکه</span>
          </div>
        </div>

        {entry.orgPoints && (
          <div className="result__org" role="note" data-testid="org-points">
            <b>+{n(entry.orgPoints.points)} امتیاز سازمانی</b>
            <span>
              تأییدشده توسط سرور بر پایهٔ فروش پردازش‌شدهٔ دورهٔ {jperiod(entry.orgPoints.period)} · ثبت‌شده در دفتر امتیاز ·{' '}
              <em>قاعدهٔ نمایشی ({entry.orgPoints.approvalStatus === 'PROPOSED' ? 'پیشنهادی' : entry.orgPoints.approvalStatus}) — نیازمند تأیید کسب‌وکار است و پاداش مالی نیست</em>
            </span>
          </div>
        )}

        <ul className="result__lines" aria-label="جزئیات پاداش">
          {entry.rewards.lines.map((line, i) => (
            <li key={line.ruleId} style={{ '--i': i } as CSSProperties}>
              <span>{line.label}</span>
              <span className="result__line-values">
                {line.xp > 0 && <b className="is-xp">+{n(line.xp)} امتیاز</b>}
                {line.coins > 0 && <b className="is-coin">+{n(line.coins)} سکه</b>}
              </span>
            </li>
          ))}
        </ul>

        <div className={`result__level${showAfter && leveledUp ? ' is-new' : ''}`}>
          <LevelBadge key={shown.level} level={shown.level} color={shown.color} />
          <div className="result__level-info">
            <div className="result__level-top">
              <span className="result__level-name">
                سطح {n(shown.level)} · {shown.title}
              </span>
              <span className="result__total">
                <b>{n(totalXp)}</b> امتیاز کل
              </span>
            </div>
            <ProgressBar value={barValue} tone="yellow" size="lg" instant={phase === 'snap'} label="پیشرفت سطح" />
            <span className="result__level-hint">
              {shown.isMax ? 'به بالاترین سطح رسیدید — شما قهرمان هستید!' : `${n(Math.max(0, shown.nextMinXp! - totalXp))} امتیاز تا «${shown.nextTitle}»`}
            </span>
          </div>
        </div>

        {achievements.length > 0 && (
          <div className="result__achievements">
            <h2>{achievements.length > 1 ? 'دستاوردهای جدید!' : 'دستاورد جدید!'}</h2>
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
            <b>{n(entry.streakAfter)} روز پیاپی</b> · {entry.streakAfter > 1 ? 'ادامه بدهید!' : 'فردا دوباره بازی کنید'}
          </span>
        </div>
      </div>

      <footer className="result__foot">
        <div className="result__foot-inner">
          <RewardFlyout active={collecting} />
          <button className="btn btn--yellow btn--block btn--lg" onClick={() => collect('/')} disabled={collecting}>
            دریافت و ادامه
          </button>
          <button className="linkbtn linkbtn--light" onClick={() => navigate('/history')} disabled={collecting}>
            مشاهدهٔ تاریخچهٔ مأموریت‌ها
          </button>
        </div>
      </footer>

      {phase === 'levelup' && (
        <div className="levelup" role="dialog" aria-modal="true" aria-label={`ارتقای سطح! به سطح ${n(newLevel.level)} رسیدید`} onClick={() => setPhase('snap')}>
          <span className="levelup__rays" aria-hidden="true" />
          <div className="levelup__card">
            <span className="levelup__eyebrow">ارتقای سطح!</span>
            <LevelBadge level={newLevel.level} color={newLevel.color} size={130} />
            <h2>{newLevel.title}</h2>
            <p>به سطح {n(newLevel.level)} رسیدید. مأموریت‌ها را ادامه دهید!</p>
            <button className="btn btn--yellow btn--block" onClick={() => setPhase('snap')} autoFocus>
              عالی!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
