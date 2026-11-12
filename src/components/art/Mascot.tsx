import { useId } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export type MascotMood = 'idle' | 'happy' | 'cheer' | 'think' | 'sad';

interface MascotProps {
  size?: number;
  mood?: MascotMood;
  className?: string;
}

/**
 * "Pip" — the arena guide. An original character: a round purple sprite
 * with a star antenna. Moods change eyes, mouth and arms.
 */
export function Mascot({ size = 96, mood = 'idle', className }: MascotProps) {
  const { t } = useLanguage();
  const gid = useId().replace(/:/g, '');
  const ink = '#221556';
  const smiling = mood === 'happy' || mood === 'cheer';
  return (
    <svg
      className={`mascot mascot--${mood} ${className ?? ''}`}
      width={size}
      height={size * (130 / 120)}
      viewBox="0 0 120 130"
      role="img"
      aria-label={t('mascot.description')}
    >
      <defs>
        <linearGradient id={`body${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9d86ff" />
          <stop offset="1" stopColor="#5b3df5" />
        </linearGradient>
      </defs>
      <ellipse className="mascot__shadow" cx="60" cy="124" rx="30" ry="5" fill="#2a1a78" opacity=".18" />
      <g className="mascot__body">
        {/* antenna */}
        <g className="mascot__antenna">
          <path d="M60 24V13" stroke="#4326c9" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 1l2.9 5.8 6.4.900-4.6 4.5 1.1 6.4L60 15.6l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9L60 1z" fill="#ffc93c" stroke="#e6a100" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
        {/* feet */}
        <ellipse cx="45" cy="116" rx="11" ry="6.5" fill="#4326c9" />
        <ellipse cx="75" cy="116" rx="11" ry="6.5" fill="#4326c9" />
        {/* arms */}
        {mood === 'cheer' ? (
          <>
            <ellipse cx="17" cy="52" rx="7" ry="12" fill="#6f52f7" transform="rotate(-32 17 52)" />
            <ellipse cx="103" cy="52" rx="7" ry="12" fill="#6f52f7" transform="rotate(32 103 52)" />
          </>
        ) : mood === 'think' ? (
          <>
            <ellipse cx="17" cy="86" rx="7" ry="11" fill="#6f52f7" transform="rotate(18 17 86)" />
            <ellipse cx="94" cy="92" rx="7" ry="11" fill="#6f52f7" transform="rotate(62 94 92)" />
          </>
        ) : (
          <>
            <ellipse cx="17" cy="86" rx="7" ry="11" fill="#6f52f7" transform="rotate(18 17 86)" />
            <ellipse className="mascot__wave" cx="103" cy="86" rx="7" ry="11" fill="#6f52f7" transform="rotate(-18 103 86)" />
          </>
        )}
        {/* body */}
        <path d="M60 22c30 0 42 26 42 53 0 28-18 41-42 41S18 103 18 75c0-27 12-53 42-53z" fill={`url(#body${gid})`} />
        <ellipse cx="60" cy="92" rx="25" ry="19" fill="#d6caff" opacity=".5" />
        <path d="M33 44c4-9 11-14 20-15" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".45" fill="none" />
        {/* cheeks */}
        <ellipse cx="31" cy="79" rx="6" ry="4" fill="#ff8fab" opacity=".7" />
        <ellipse cx="89" cy="79" rx="6" ry="4" fill="#ff8fab" opacity=".7" />
        {/* eyes */}
        {smiling ? (
          <>
            <path d="M35 66q10-13 20 0" stroke={ink} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M65 66q10-13 20 0" stroke={ink} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <g className="mascot__eyes">
            <ellipse cx="45" cy="62" rx="11" ry="12.5" fill="#fff" />
            <ellipse cx="75" cy="62" rx="11" ry="12.5" fill="#fff" />
            <circle cx={mood === 'think' ? 48 : 46.5} cy={mood === 'think' ? 58 : mood === 'sad' ? 66 : 63.5} r="5.8" fill={ink} />
            <circle cx={mood === 'think' ? 78 : 73.5} cy={mood === 'think' ? 58 : mood === 'sad' ? 66 : 63.5} r="5.8" fill={ink} />
            <circle cx={mood === 'think' ? 50 : 48.5} cy={mood === 'think' ? 56 : mood === 'sad' ? 64 : 61} r="2" fill="#fff" />
            <circle cx={mood === 'think' ? 80 : 75.5} cy={mood === 'think' ? 56 : mood === 'sad' ? 64 : 61} r="2" fill="#fff" />
          </g>
        )}
        {/* mouth */}
        {mood === 'cheer' && <path d="M49 79q11 17 22 0z" fill={ink} stroke={ink} strokeWidth="3" strokeLinejoin="round" />}
        {mood === 'cheer' && <path d="M55 87.5q5-3.5 10 0-5 4.5-10 0z" fill="#ff7a9a" />}
        {mood === 'happy' && <path d="M50 80q10 10 20 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />}
        {mood === 'idle' && <path d="M52 82q8 7 16 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />}
        {mood === 'think' && <path d="M54 84h10" stroke={ink} strokeWidth="4" strokeLinecap="round" />}
        {mood === 'sad' && <path d="M52 87q8-7 16 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />}
      </g>
    </svg>
  );
}
