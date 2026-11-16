import type { CSSProperties } from 'react';
import { GAME_CONFIG } from '../game/config';
import { CATEGORIES } from '../game/missions';
import { jperiod, n, pct } from '../i18n';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { MissionArt } from './art/MissionArt';
import { DifficultyDots, Stars, StatusPill } from './MissionBits';
import { CoinIcon, Icon, XpIcon } from './ui/Icon';
import { buzz } from './ui/motion';
import { Sheet } from './ui/Sheet';

interface MissionDetailProps {
  missionId: string | null;
  onClose: () => void;
}

/** Mission introduction: illustration, objective, time, reward preview and the Start button. */
export function MissionDetail({ missionId, onClose }: MissionDetailProps) {
  const { missions, progress } = useGame();
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) return null;

  const meta = CATEGORIES[mission.category];
  const locked = mission.status === 'locked';
  const draft = progress.drafts[mission.id];
  const hasOrderBonus = mission.steps.some((s) => s.type === 'choice' && s.options.some((o) => o.flags?.includes('order_received')));
  const dailyBonus = mission.isDaily && !mission.dailyDone;

  const cta =
    mission.status === 'in_progress'
      ? `ادامه · مرحلهٔ ${n(Math.min(mission.steps.length, (draft?.stepIndex ?? 0) + 1))} از ${n(mission.steps.length)}`
      : mission.status === 'completed'
        ? 'انجام دوباره'
        : 'شروع مأموریت';

  const start = () => {
    buzz(15);
    onClose();
    navigate(`/play/${mission.id}`);
  };

  return (
    <Sheet open onClose={onClose} label={mission.title}>
      <div className="detail" style={{ '--c': meta.color, '--d': meta.dark, '--soft': meta.soft } as CSSProperties}>
        <div className="detail__art">
          <MissionArt category={mission.category} locked={locked} />
          {locked && (
            <span className="detail__lock">
              <Icon name="lock" size={34} />
            </span>
          )}
        </div>

        <div className="detail__body">
          <div className="detail__tags">
            <span className="detail__cat">{meta.label}</span>
            <StatusPill status={mission.status} />
            {dailyBonus && <span className="pill pill--daily">مأموریت روزانه</span>}
          </div>
          <h2 className="detail__title">{mission.title}</h2>
          <p className="detail__desc">
            <b>هدف:</b> {mission.description}
          </p>

          <div className="detail__facts">
            <span><Icon name="clock" size={16} />حدود {n(mission.estimatedMinutes)} دقیقه</span>
            <span><Icon name="steps" size={16} />{n(mission.steps.length)} گام کوتاه</span>
            <DifficultyDots difficulty={mission.difficulty} />
          </div>

          <div className="detail__rewards" aria-label="پاداش">
            <div className="rewardchip rewardchip--xp">
              <XpIcon size={30} />
              <div><b>+{n(mission.xpReward + (dailyBonus ? GAME_CONFIG.rewards.dailyBonusXp : 0))}</b><span>امتیاز تجربه</span></div>
            </div>
            <div className="rewardchip rewardchip--coin">
              <CoinIcon size={30} />
              <div><b>+{n(mission.coinReward)}</b><span>سکه</span></div>
            </div>
          </div>
          {dailyBonus && (
            <p className="detail__hint">
              <span aria-hidden="true">☀️</span> شامل <b>{n(GAME_CONFIG.rewards.dailyBonusXp)} امتیاز جایزهٔ مأموریت روزانه</b>
            </p>
          )}
          {hasOrderBonus && !locked && (
            <p className="detail__hint">
              <span aria-hidden="true">🛒</span> با ثبت سفارش، <b>{n(GAME_CONFIG.rewards.orderBonusXp)} امتیاز اضافه</b> می‌گیرید
            </p>
          )}

          {mission.completions > 0 && (
            <p className="detail__record">
              <b>{n(mission.completions)} بار</b> انجام شده
              {mission.bestRating !== null && <> · بهترین امتیاز <Stars value={mission.bestRating} size={14} /></>}
            </p>
          )}

          {mission.salesGateInfo && (
            <p className="detail__hint" data-testid="sales-gate">
              <span aria-hidden="true">📈</span> بررسی سرور: <b>{pct(mission.salesGateInfo.attainmentPct ?? 0)}</b> از هدف دورهٔ {mission.salesGateInfo.period ? jperiod(mission.salesGateInfo.period) : ''} (حداقل {pct(mission.salesGateInfo.minPct)}) · <em>قاعدهٔ نمایشی ({mission.salesGateInfo.status === 'PROPOSED' ? 'پیشنهادی' : mission.salesGateInfo.status})</em>
            </p>
          )}

          {locked || (mission.status === 'completed' && mission.lockReason) ? (
            <div className="detail__locked">
              <Icon name="lock" size={18} />
              {mission.lockReason}
            </div>
          ) : (
            <button className="btn btn--green btn--block btn--lg detail__cta" onClick={start} data-testid="start-mission">
              {cta}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
