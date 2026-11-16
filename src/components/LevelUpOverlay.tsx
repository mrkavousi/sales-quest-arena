import { n } from '../i18n';
import { useEffect, useRef, type CSSProperties } from 'react';
import { getAchievement } from '../game/achievements';
import { getLevelDef } from '../game/levels';
import type { QuestClaim } from '../game/types';
import { Confetti } from './ui/Confetti';
import { buzz } from './ui/motion';

interface LevelUpOverlayProps {
  claim: QuestClaim;
  onClose: () => void;
}

/** Shown when a server-confirmed quest claim raises the player's level. Dismiss with a tap or Esc. */
export function LevelUpOverlay({ claim, onClose }: LevelUpOverlayProps) {
  const level = getLevelDef(claim.level_after);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    buzz([20, 60, 40]);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => closeRef.current(), 7000);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, []);

  const unlocked = claim.achievements_unlocked.map(getAchievement).filter((a) => a !== undefined);

  return (
    <div className="levelup" role="dialog" aria-modal="true" aria-labelledby="levelup-title" onClick={() => onClose()}>
      <Confetti burst={1} count={120} />
      <div className="levelup__card" onClick={(event) => event.stopPropagation()}>
        <span className="levelup__kicker">ارتقای سطح!</span>
        <span className="levelup__badge" style={{ '--lc': level.color } as CSSProperties} aria-hidden="true">
          {n(level.level)}
        </span>
        <h2 id="levelup-title">
          سطح {n(level.level)} · {level.title}
        </h2>
        <p>
          +{n(claim.xp)} امتیاز تجربه از چالش هفتگی · مجموع {n(claim.xp_after)} امتیاز
        </p>
        {unlocked.length > 0 && (
          <ul className="levelup__badges" aria-label="دستاوردهای جدید">
            {unlocked.map((a) => (
              <li key={a.id}>
                <span aria-hidden="true">{a.emoji}</span> {a.title}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn--green" onClick={() => onClose()}>
          ادامه می‌دهم
        </button>
      </div>
    </div>
  );
}
