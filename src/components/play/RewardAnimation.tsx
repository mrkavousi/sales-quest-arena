import type { CSSProperties } from 'react';
import { Mascot } from '../art/Mascot';
import { TrophyArt } from '../art/Scenery';
import { CoinIcon, XpIcon } from '../ui/Icon';

/** Glowing trophy with spinning rays — the centerpiece of the completion screen. */
export function RewardHero() {
  return (
    <div className="reward-hero" aria-hidden="true">
      <span className="reward-hero__rays" />
      <span className="reward-hero__glow" />
      <span className="reward-hero__trophy">
        <TrophyArt size={150} />
      </span>
      <span className="reward-hero__mascot">
        <Mascot size={70} mood="cheer" />
      </span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="reward-hero__spark" style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}

/** Coins and XP gems that fly up when the player collects the rewards. */
export function RewardFlyout({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flyout" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="flyout__item" style={{ '--i': i, '--x': `${(i % 6) * 22 - 55}px` } as CSSProperties}>
          {i % 3 === 0 ? <XpIcon size={30} /> : <CoinIcon size={30} />}
        </span>
      ))}
    </div>
  );
}
