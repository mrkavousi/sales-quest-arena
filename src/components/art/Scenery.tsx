/** Small decorative SVG props for the mission map and reward screens. */

export type SceneryKind = 'tree' | 'pine' | 'bush' | 'rock' | 'cloud' | 'flowers' | 'tent' | 'sign';

export function Scenery({ kind, size = 56 }: { kind: SceneryKind; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true } as const;
  switch (kind) {
    case 'tree':
      return (
        <svg {...common}>
          <ellipse cx="32" cy="59" rx="16" ry="3.5" fill="#2a1a78" opacity=".12" />
          <rect x="28" y="38" width="8" height="20" rx="3" fill="#a9744a" />
          <circle cx="32" cy="26" r="18" fill="#3fcb82" />
          <circle cx="21" cy="33" r="11" fill="#2fbf71" />
          <circle cx="43" cy="33" r="11" fill="#2fbf71" />
          <circle cx="27" cy="19" r="5" fill="#8ee6b4" opacity=".7" />
        </svg>
      );
    case 'pine':
      return (
        <svg {...common}>
          <ellipse cx="32" cy="59" rx="14" ry="3.5" fill="#2a1a78" opacity=".12" />
          <rect x="28.5" y="44" width="7" height="14" rx="3" fill="#a9744a" />
          <path d="M32 6l15 20H17z" fill="#49d38a" />
          <path d="M32 18l18 22H14z" fill="#2fbf71" />
          <path d="M32 30l20 20H12z" fill="#22a862" />
        </svg>
      );
    case 'bush':
      return (
        <svg {...common}>
          <ellipse cx="32" cy="56" rx="22" ry="4" fill="#2a1a78" opacity=".1" />
          <circle cx="20" cy="44" r="12" fill="#2fbf71" />
          <circle cx="34" cy="38" r="15" fill="#3fcb82" />
          <circle cx="47" cy="46" r="10" fill="#2fbf71" />
          <circle cx="30" cy="36" r="3" fill="#ff8fab" />
          <circle cx="42" cy="42" r="2.5" fill="#ffc93c" />
        </svg>
      );
    case 'rock':
      return (
        <svg {...common}>
          <ellipse cx="32" cy="55" rx="20" ry="4" fill="#2a1a78" opacity=".1" />
          <path d="M12 52c0-10 6-20 16-20 6 0 9 4 12 4 8 0 13 7 13 16z" fill="#c3bce3" />
          <path d="M20 44c1-5 4-8 9-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
        </svg>
      );
    case 'cloud':
      return (
        <svg {...common} viewBox="0 0 96 48" width={size * 1.5} height={size * 0.75}>
          <path d="M14 34a12 12 0 0 1 12-14 18 18 0 0 1 34-2 13 13 0 0 1 22 12 10 10 0 0 1-4 14H22a10 10 0 0 1-8-10z" fill="#fff" />
        </svg>
      );
    case 'flowers':
      return (
        <svg {...common}>
          <path d="M20 58V42M44 58V46M32 58V36" stroke="#2fbf71" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="38" r="6" fill="#ff8fab" /><circle cx="20" cy="38" r="2.5" fill="#ffc93c" />
          <circle cx="44" cy="42" r="6" fill="#8fd6ff" /><circle cx="44" cy="42" r="2.5" fill="#fff" />
          <circle cx="32" cy="31" r="7" fill="#ffc93c" /><circle cx="32" cy="31" r="3" fill="#ff8f3d" />
        </svg>
      );
    case 'tent':
      return (
        <svg {...common}>
          <ellipse cx="32" cy="57" rx="24" ry="4" fill="#2a1a78" opacity=".1" />
          <path d="M32 12L8 56h48z" fill="#ff8f3d" />
          <path d="M32 12L20 56h24z" fill="#ffc93c" />
          <path d="M32 30l-7 26h14z" fill="#5b3df5" />
          <path d="M32 12V5l8 3.5-8 3.5" fill="#ff6b8e" stroke="#ff6b8e" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'sign':
      return (
        <svg {...common}>
          <rect x="29" y="26" width="6" height="32" rx="2" fill="#a9744a" />
          <path d="M12 12h34l8 9-8 9H12z" fill="#ffd95e" stroke="#e09200" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M20 21h20" stroke="#e09200" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}

export function TreasureChest({ size = 96, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 120 108" aria-hidden="true">
      <ellipse cx="60" cy="100" rx="46" ry="6" fill="#2a1a78" opacity=".14" />
      {open && (
        <g>
          <ellipse cx="60" cy="48" rx="36" ry="12" fill="#fff3c4" />
          <circle cx="46" cy="44" r="8" fill="#ffc93c" stroke="#e09200" strokeWidth="2" />
          <circle cx="72" cy="42" r="9" fill="#ffd95e" stroke="#e09200" strokeWidth="2" />
          <circle cx="60" cy="38" r="8" fill="#ffc93c" stroke="#e09200" strokeWidth="2" />
        </g>
      )}
      <rect x="18" y="50" width="84" height="46" rx="8" fill="#b9733a" />
      <rect x="18" y="50" width="84" height="12" fill="#8f5324" opacity=".5" />
      <path d={open ? 'M20 30q40-34 80 0l2 8H18z' : 'M18 52V40a22 22 0 0 1 22-22h40a22 22 0 0 1 22 22v12z'} fill="#d08a4a" />
      <path d={open ? 'M20 34h80' : 'M18 50h84'} stroke="#ffc93c" strokeWidth="6" />
      <rect x="30" y="50" width="8" height="46" fill="#ffc93c" />
      <rect x="82" y="50" width="8" height="46" fill="#ffc93c" />
      <rect x="51" y="54" width="18" height="20" rx="5" fill="#ffc93c" stroke="#e09200" strokeWidth="2.5" />
      <circle cx="60" cy="62" r="3" fill="#8f5324" />
      <path d="M60 63v6" stroke="#8f5324" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" aria-hidden="true">
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset=".55" stopColor="#ffc93c" />
          <stop offset="1" stopColor="#f0a200" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="148" rx="42" ry="6" fill="#1b0f4d" opacity=".25" />
      <rect x="50" y="128" width="60" height="16" rx="6" fill="#4326c9" />
      <rect x="58" y="116" width="44" height="14" rx="5" fill="#6f52f7" />
      <rect x="71" y="96" width="18" height="22" fill="#e09200" />
      <path d="M44 34H26c0 22 9 34 24 37M116 34h18c0 22-9 34-24 37" stroke="#f0a200" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M40 20h80v36a40 40 0 0 1-80 0z" fill="url(#trophyGold)" stroke="#e09200" strokeWidth="4" strokeLinejoin="round" />
      <path d="M52 28v30" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".65" />
      <path d="M80 32l7.6 15.4 17 2.5-12.3 12 2.9 16.9L80 70.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" fill="#fff" stroke="#f0a200" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
