import { useId } from 'react';
import type { AvatarId } from '../../game/types';

interface AvatarSpec {
  name: string;
  bg: [string, string];
  fur: string;
  dark: string;
  light: string;
  ears: 'point' | 'round' | 'long' | 'bulb';
}

export const AVATARS: Record<AvatarId, AvatarSpec> = {
  fox: { name: 'Fox', bg: ['#ffe2b8', '#ffb86b'], fur: '#ff8a3d', dark: '#d9611b', light: '#fff6ea', ears: 'point' },
  bear: { name: 'Bear', bg: ['#d7f0ff', '#8fd0ff'], fur: '#b07a4f', dark: '#8a5a36', light: '#ecd3b8', ears: 'round' },
  cat: { name: 'Cat', bg: ['#ffe0ec', '#ffa6c4'], fur: '#7d86a8', dark: '#5b6388', light: '#eef0fa', ears: 'point' },
  bunny: { name: 'Bunny', bg: ['#e4dcff', '#b9a4ff'], fur: '#fbf7ff', dark: '#d9cdf5', light: '#ffffff', ears: 'long' },
  panda: { name: 'Panda', bg: ['#d9f7e6', '#8fe3b5'], fur: '#ffffff', dark: '#2c2a3a', light: '#ffffff', ears: 'round' },
  frog: { name: 'Frog', bg: ['#fff3c4', '#ffd95e'], fur: '#5ccf6b', dark: '#35a548', light: '#d8f7c8', ears: 'bulb' },
};

interface AvatarProps {
  id: AvatarId;
  size?: number;
  className?: string;
  /** Idle blink animation. */
  animated?: boolean;
}

/** Original, parametric animal avatars drawn in SVG. */
export function Avatar({ id, size = 64, className, animated = true }: AvatarProps) {
  const spec = AVATARS[id] ?? AVATARS.fox;
  const gid = useId().replace(/:/g, '');
  const ink = '#2b2140';
  const isFrog = spec.ears === 'bulb';
  const eyeY = isFrog ? 36 : 55;
  const eyeX = isFrog ? 16 : 11.5;

  return (
    <svg className={`avatar ${className ?? ''}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${spec.name} avatar`}>
      <defs>
        <linearGradient id={`bg${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={spec.bg[0]} />
          <stop offset="1" stopColor={spec.bg[1]} />
        </linearGradient>
        <clipPath id={`clip${gid}`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip${gid})`}>
        <rect width="100" height="100" fill={`url(#bg${gid})`} />
        <circle cx="14" cy="18" r="9" fill="#fff" opacity=".35" />
        <circle cx="88" cy="80" r="14" fill="#fff" opacity=".22" />

        {/* body */}
        <ellipse cx="50" cy="104" rx="30" ry="22" fill={id === 'panda' ? spec.dark : spec.fur} />

        {/* ears */}
        {spec.ears === 'point' && (
          <>
            <path d="M22 44L25 13l23 17z" fill={spec.fur} stroke={spec.fur} strokeWidth="4" strokeLinejoin="round" />
            <path d="M78 44L75 13 52 30z" fill={spec.fur} stroke={spec.fur} strokeWidth="4" strokeLinejoin="round" />
            <path d="M28 36l1.5-14 10 8z" fill={id === 'fox' ? ink : '#ffb3c9'} opacity={id === 'fox' ? 0.75 : 1} />
            <path d="M72 36l-1.5-14-10 8z" fill={id === 'fox' ? ink : '#ffb3c9'} opacity={id === 'fox' ? 0.75 : 1} />
          </>
        )}
        {spec.ears === 'round' && (
          <>
            <circle cx="26" cy="31" r="12" fill={id === 'panda' ? spec.dark : spec.fur} />
            <circle cx="74" cy="31" r="12" fill={id === 'panda' ? spec.dark : spec.fur} />
            {id !== 'panda' && (
              <>
                <circle cx="26" cy="31" r="6" fill={spec.light} />
                <circle cx="74" cy="31" r="6" fill={spec.light} />
              </>
            )}
          </>
        )}
        {spec.ears === 'long' && (
          <>
            <ellipse cx="37" cy="21" rx="8" ry="21" fill={spec.fur} transform="rotate(-9 37 21)" />
            <ellipse cx="63" cy="21" rx="8" ry="21" fill={spec.fur} transform="rotate(9 63 21)" />
            <ellipse cx="37" cy="22" rx="3.5" ry="14" fill="#ffb3c9" transform="rotate(-9 37 22)" />
            <ellipse cx="63" cy="22" rx="3.5" ry="14" fill="#ffb3c9" transform="rotate(9 63 22)" />
          </>
        )}
        {isFrog && (
          <>
            <circle cx="34" cy="36" r="13" fill={spec.fur} />
            <circle cx="66" cy="36" r="13" fill={spec.fur} />
            <circle cx="34" cy="36" r="9" fill="#fff" />
            <circle cx="66" cy="36" r="9" fill="#fff" />
          </>
        )}

        {/* head */}
        <ellipse cx="50" cy="58" rx="31" ry="27" fill={spec.fur} />

        {/* face patches */}
        {id === 'fox' && <path d="M19.5 60c6 4 12 3 17-2 4 6 7 9 13.5 9s9.5-3 13.5-9c5 5 11 6 17 2-2 15-14 25-30.5 25S21.5 75 19.5 60z" fill={spec.light} />}
        {(id === 'bear' || id === 'cat' || id === 'frog') && <ellipse cx="50" cy="68" rx="15" ry="11" fill={spec.light} />}
        {id === 'panda' && (
          <>
            <ellipse cx="38" cy="55" rx="8.5" ry="10" fill={spec.dark} transform="rotate(18 38 55)" />
            <ellipse cx="62" cy="55" rx="8.5" ry="10" fill={spec.dark} transform="rotate(-18 62 55)" />
          </>
        )}
        {id === 'cat' && (
          <path d="M22 64h9M22.5 69l8.5-1.5M78 64h-9M77.5 69L69 67.5" stroke={spec.dark} strokeWidth="1.6" strokeLinecap="round" />
        )}

        {/* cheeks */}
        {!isFrog && (
          <>
            <circle cx="29" cy="66" r="5" fill="#ff8fab" opacity=".55" />
            <circle cx="71" cy="66" r="5" fill="#ff8fab" opacity=".55" />
          </>
        )}
        {isFrog && (
          <>
            <circle cx="27" cy="62" r="4.5" fill="#ff8fab" opacity=".6" />
            <circle cx="73" cy="62" r="4.5" fill="#ff8fab" opacity=".6" />
          </>
        )}

        {/* eyes */}
        <g className={animated ? 'avatar__eyes' : undefined}>
          <circle cx={50 - eyeX} cy={eyeY} r="4.6" fill={id === 'panda' ? '#fff' : ink} />
          <circle cx={50 + eyeX} cy={eyeY} r="4.6" fill={id === 'panda' ? '#fff' : ink} />
          {id === 'panda' && (
            <>
              <circle cx={50 - eyeX} cy={eyeY} r="2.8" fill={ink} />
              <circle cx={50 + eyeX} cy={eyeY} r="2.8" fill={ink} />
            </>
          )}
          <circle cx={50 - eyeX + 1.5} cy={eyeY - 1.5} r="1.4" fill="#fff" />
          <circle cx={50 + eyeX + 1.5} cy={eyeY - 1.5} r="1.4" fill="#fff" />
        </g>

        {/* nose + mouth */}
        {!isFrog && <ellipse cx="50" cy="63.5" rx="4" ry="3" fill={id === 'bunny' ? '#ff8fab' : ink} />}
        {isFrog ? (
          <path d="M36 66q14 11 28 0" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
        ) : (
          <path d="M44 69.5q3 3.5 6 0q3 3.5 6 0" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </g>
    </svg>
  );
}
