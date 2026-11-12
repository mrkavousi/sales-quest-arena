import type { CSSProperties } from 'react';
import { GAME_CONFIG } from '../game/config';
import { CATEGORIES } from '../game/missions';
import { categoryLabel } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
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

/** Mission introduction: illustration, description, time, reward preview and the Start button. */
export function MissionDetail({ missionId, onClose }: MissionDetailProps) {
  const { missions, progress } = useGame();
  const { language, t, n } = useLanguage();
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) return null;

  const meta = CATEGORIES[mission.category];
  const locked = mission.status === 'locked';
  const draft = progress.drafts[mission.id];
  const hasOrderBonus = mission.steps.some((s) => s.type === 'choice' && s.options.some((o) => o.flags?.includes('order_received')));
  const dailyBonus = mission.isDaily && !mission.dailyDone;

  const cta = mission.status === 'in_progress'
    ? t('detail.continueStep', { step: Math.min(mission.steps.length, (draft?.stepIndex ?? 0) + 1), total: mission.steps.length })
    : t(mission.status === 'completed' ? 'common.playAgain' : 'detail.start');

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
            <span className="detail__cat">{categoryLabel(mission.category, language)}</span>
            <StatusPill status={mission.status} />
            {dailyBonus && <span className="pill pill--daily">{t('daily.title')}</span>}
          </div>
          <h2 className="detail__title">{mission.title}</h2>
          <p className="detail__desc">{mission.description}</p>

          <div className="detail__facts">
            <span><Icon name="clock" size={16} />{t('missions.aboutMinutes', { minutes: mission.estimatedMinutes })}</span>
            <span><Icon name="steps" size={16} />{t('missions.quickChallenges', { count: mission.steps.length })}</span>
            <DifficultyDots difficulty={mission.difficulty} />
          </div>

          <div className="detail__rewards" aria-label={t('detail.rewardPreview')}>
            <div className="rewardchip rewardchip--xp">
              <XpIcon size={30} />
              <div><b><bdi dir="ltr">+{n(mission.xpReward + (dailyBonus ? GAME_CONFIG.rewards.dailyBonusXp : 0))}</bdi></b><span>{t('common.xp')}</span></div>
            </div>
            <div className="rewardchip rewardchip--coin">
              <CoinIcon size={30} />
              <div><b><bdi dir="ltr">+{n(mission.coinReward)}</bdi></b><span>{t('common.coins')}</span></div>
            </div>
          </div>
          {dailyBonus && (
            <p className="detail__hint">
              <span aria-hidden="true">☀️</span> {t('detail.dailyHint', { xp: GAME_CONFIG.rewards.dailyBonusXp })}
            </p>
          )}
          {hasOrderBonus && !locked && (
            <p className="detail__hint">
              <span aria-hidden="true">🛒</span> {t('detail.orderHint', { xp: GAME_CONFIG.rewards.orderBonusXp })}
            </p>
          )}

          {mission.completions > 0 && (
            <p className="detail__record">
              {t('detail.completedTimes', { count: mission.completions })}
              {mission.bestRating !== null && <> · {t('detail.best')} <Stars value={mission.bestRating} size={14} /></>}
            </p>
          )}

          {locked ? (
            <div className="detail__locked">
              <Icon name="lock" size={18} />
              {mission.lockReason}
            </div>
          ) : (
            <button className="btn btn--green btn--block btn--lg detail__cta" onClick={start}>
              {cta}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
