import type { ReactNode } from 'react';

export type IconName =
  | 'shield' | 'target' | 'scroll' | 'user' | 'close' | 'back' | 'arrow' | 'lock' | 'check' | 'clock'
  | 'globe' | 'pencil' | 'store' | 'userPlus' | 'trophy' | 'box' | 'chat' | 'search' | 'play' | 'refresh' | 'trash' | 'steps';

const PATHS: Record<IconName, ReactNode> = {
  shield: <><path d="M12 3l8 3v6c0 4.6-3.3 7.9-8 9-4.7-1.1-8-4.4-8-9V6l8-3z" /><path d="M12 8.2l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6L8.2 11l2.6-.4L12 8.2z" fill="currentColor" stroke="none" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>,
  scroll: <><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M9 8.5h6M9 12.5h6M9 16.5h3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c0-4 3.3-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  pencil: <><path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" /><path d="M14.5 6l3 3" /></>,
  store: <><path d="M4.5 10.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-8.5" /><path d="M3 7.5L5 3.5h14l2 4a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" /><path d="M10 20.5V15h4v5.5" /></>,
  userPlus: <><circle cx="9.5" cy="8" r="3.8" /><path d="M2.5 20.5c0-3.8 3-6.2 7-6.2s7 2.4 7 6.2" /><path d="M19 6.5v6M16 9.5h6" /></>,
  trophy: <><path d="M8 3.5h8V9a4 4 0 0 1-8 0V3.5z" /><path d="M8 5.5H4.5c0 2.6 1.4 4 3.6 4.2M16 5.5h3.5c0 2.6-1.4 4-3.6 4.2" /><path d="M12 13v4M8 20.5h8M9.5 17h5" /></>,
  box: <><path d="M12 3l8 4.3v9.4L12 21l-8-4.3V7.3L12 3z" /><path d="M4.3 7.5L12 11.8l7.7-4.3M12 11.8V21" /></>,
  chat: <><path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v8a2.5 2.5 0 0 1-2.5 2.5h-6.5L8 21v-3.5H5A2.5 2.5 0 0 1 2.5 15V7A2.5 2.5 0 0 1 5 4.5z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.700l11-6.8a.8.800 0 0 0 0-1.4l-11-6.8A.8.800 0 0 0 8 5.2z" fill="currentColor" stroke="none" />,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>,
  trash: <><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></>,
  steps: <><path d="M4 18h5v-5h5V8h6" /></>,
};

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 24, strokeWidth = 2.4, className }: IconProps) {
  return (
    <svg
      className={[className, name === 'back' || name === 'arrow' ? 'icon--directional' : ''].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/* ---------- Colorful "gem" icons used for game currencies ---------- */

interface GemProps {
  size?: number;
  className?: string;
}

export function CoinIcon({ size = 24, className }: GemProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13" r="10" fill="#d98a00" />
      <circle cx="12" cy="11.5" r="10" fill="#ffc93c" />
      <circle cx="12" cy="11.5" r="7" fill="#ffdd73" stroke="#f0a800" strokeWidth="1.2" />
      <path d="M12 6.8l1.4 2.9 3.2.400-2.3 2.2.600 3.2-2.9-1.6-2.9 1.6.600-3.2-2.3-2.2 3.2-.4L12 6.8z" fill="#f0a800" />
      <path d="M5.5 8.5a7.5 7.5 0 0 1 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8" />
    </svg>
  );
}

export function XpIcon({ size = 24, className }: GemProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l8.2 4.7v9.6L12 21.5l-8.2-4.7V7.2L12 2.5z" fill="#1581d6" transform="translate(0 1)" />
      <path d="M12 1.5l8.2 4.7v9.6L12 20.5l-8.2-4.7V6.2L12 1.5z" fill="#3fb4ff" />
      <path d="M12 3.8l6.2 3.6v3.1L12 7 5.8 10.5V7.4L12 3.8z" fill="#8fd6ff" opacity=".7" />
      <path d="M13.3 5.5L8 12.2h3.4l-.9 5.3 5.5-7h-3.5l.8-5z" fill="#fff" />
    </svg>
  );
}

export function FlameIcon({ size = 24, className, dim = false }: GemProps & { dim?: boolean }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.6 1.8c.5 3 2.3 4.7 3.9 6.6 1.4 1.7 2.5 3.6 2.5 6.2a7 7 0 0 1-14 0c0-2.2.900-4 2.1-5.5.200 1.5.800 2.5 1.8 3.1.100-3.7 1.4-7.6 3.7-10.4z"
        fill={dim ? '#b9b3d6' : '#ff7a2f'}
      />
      <path
        d="M12 21.6a3.8 3.8 0 0 1-3.8-3.8c0-1.9 1.4-3.1 2.4-4.7.500 1 .9 1.5 1.6 1.9.400-.9.600-1.7.600-2.7 1.7 1.4 3 3.3 3 5.5a3.8 3.8 0 0 1-3.8 3.8z"
        fill={dim ? '#dcd8ee' : '#ffd23c'}
      />
    </svg>
  );
}

export function StarIcon({ size = 24, className, filled = true }: GemProps & { filled?: boolean }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.2l3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.5l-6 3.2 1.2-6.7L2.3 9.3l6.7-1 3-6.1z"
        fill={filled ? '#ffc93c' : '#e6e0f8'}
        stroke={filled ? '#e6a100' : '#cfc7ee'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {filled && <path d="M8.5 9.5l1.5-3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />}
    </svg>
  );
}
