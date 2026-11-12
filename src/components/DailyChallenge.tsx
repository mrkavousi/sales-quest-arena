import { useEffect, useState } from 'react';
import { msUntilMidnight, msUntilServerDayEnds } from '../game/dates';
import { formatCountdown } from '../i18n/locale';
import { useLanguage } from '../i18n/LanguageContext';
import { useGame } from '../state/GameContext';
import { CATEGORY_ICON } from './art/MissionArt';
import { Icon, XpIcon } from './ui/Icon';

function useCountdown(): string {
  const { language } = useLanguage();
  const { mode, todayKey, serverClockOffset } = useGame();
  const remaining = () => mode === 'server'
    ? msUntilServerDayEnds(todayKey, Date.now() + serverClockOffset)
    : msUntilMidnight(new Date());
  const [ms, setMs] = useState(remaining);
  useEffect(() => {
    const update = () => setMs(remaining());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
    // The UTC day is changed only by a fresh server response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, todayKey, serverClockOffset]);
  return formatCountdown(language, ms);
}

export function DailyChallenge({ onOpen }: { onOpen: (missionId: string) => void }) {
  const { missions, categories, config, mode } = useGame();
  const { t } = useLanguage();
  const countdown = useCountdown();
  const mission = missions.find((m) => m.isDaily);
  if (!mission) return null;
  const done = mission.dailyDone;
  const meta = categories[mission.category];

  return (
    <section className={`daily${done ? ' is-done' : ''}`} aria-label={t('daily.title')}>
      <div className="daily__sun" aria-hidden="true">
        <span className="daily__rays" />
        <span className="daily__core" style={{ color: done ? 'var(--green-dark)' : meta.dark }}>
          <Icon name={done ? 'check' : CATEGORY_ICON[mission.category]} size={30} strokeWidth={done ? 3.4 : 2.4} />
        </span>
      </div>
      <div className="daily__body">
        <span className="daily__eyebrow">{t(done ? 'daily.completed' : 'daily.title')}</span>
        <h2 className="daily__title">{mission.title}</h2>
        <div className="daily__meta">
          <span className="daily__bonus">
            <XpIcon size={18} />
            {t(done ? 'daily.bonusCollected' : 'daily.bonusXp', { xp: config.rewards.dailyBonusXp })}
          </span>
          <span className="daily__timer">
            <Icon name="clock" size={15} />
            {t(done ? 'daily.nextIn' : 'daily.timeLeft', { time: countdown })}{mode === 'server' && <> · {t('connection.utc')}</>}
          </span>
        </div>
      </div>
      {!done && (
        <button className="btn btn--white btn--sm daily__cta" onClick={() => onOpen(mission.id)}>
          {t('common.play')}
        </button>
      )}
    </section>
  );
}
