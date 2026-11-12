import { useId, type ReactNode } from 'react';
import { CATEGORIES } from '../../game/missions';
import type { MissionCategory } from '../../game/types';
import type { IconName } from '../ui/Icon';

export const CATEGORY_ICON: Record<MissionCategory, IconName> = {
  customer_visit: 'store',
  product_intro: 'box',
  follow_up: 'chat',
  new_customer: 'userPlus',
  market_research: 'search',
  sales_achievement: 'trophy',
};

const Sparkle = ({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) => (
  <path
    className="art-sparkle"
    style={{ animationDelay: `${delay}s` }}
    d="M0-9C1-3 3-1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill="#fff"
  />
);

/** One small original scene per mission category. */
const SCENES: Record<MissionCategory, (c: { color: string; dark: string }) => ReactNode> = {
  customer_visit: ({ dark }) => (
    <>
      {/* storefront */}
      <rect x="104" y="82" width="112" height="72" rx="8" fill="#fff" />
      <rect x="104" y="82" width="112" height="72" rx="8" fill={dark} opacity=".08" />
      <rect x="120" y="106" width="34" height="30" rx="5" fill="#bfe6ff" />
      <path d="M120 121h34M137 106v30" stroke="#fff" strokeWidth="3" />
      <rect x="170" y="104" width="30" height="50" rx="5" fill={dark} />
      <circle cx="193" cy="130" r="2.5" fill="#ffc93c" />
      {/* awning */}
      <path d="M96 62h128l8 24H88z" fill="#ff6b8e" />
      <path d="M112 62h16l-2 24h-18zM144 62h16l2 24h-20zM176 62h16l6 24h-18zM208 62h16l8 24h-18z" fill="#fff" />
      <path d="M88 86a9 9 0 0 0 18 0 9 9 0 0 0 18 0 9 9 0 0 0 18 0 9 9 0 0 0 18 0 9 9 0 0 0 18 0 9 9 0 0 0 18 0 9 9 0 0 0 18 0 9 9 0 0 0 18 0z" fill="#ff6b8e" />
      <rect x="132" y="42" width="56" height="20" rx="6" fill="#ffc93c" />
      <path d="M143 52h34" stroke="#e09200" strokeWidth="4" strokeLinecap="round" />
      {/* map pin */}
      <g className="art-float">
        <path d="M246 44c0 14-16 30-16 30s-16-16-16-30a16 16 0 0 1 32 0z" fill="#ffc93c" stroke="#e09200" strokeWidth="3" />
        <circle cx="230" cy="44" r="6" fill="#fff" />
      </g>
      {/* bush */}
      <circle cx="78" cy="146" r="14" fill="#2fbf71" />
      <circle cx="94" cy="150" r="10" fill="#49d38a" />
      <circle cx="240" cy="150" r="11" fill="#2fbf71" />
    </>
  ),
  product_intro: ({ dark }) => (
    <>
      <g className="art-float">
        <path d="M160 26l8 16 18 2.6-13 12.7 3 17.7L160 66.6 144 75l3-17.7-13-12.7 18-2.6z" fill="#ffc93c" stroke="#e09200" strokeWidth="3" strokeLinejoin="round" />
      </g>
      {/* open box */}
      <path d="M108 100l52 18v40l-52-18z" fill="#f3b877" />
      <path d="M212 100l-52 18v40l52-18z" fill="#dc9a55" />
      <path d="M108 100l52-16 52 16-52 18z" fill={dark} opacity=".55" />
      <path d="M108 100l-16-18 52-14 16 16z" fill="#ffd9a8" />
      <path d="M212 100l16-18-52-14-16 16z" fill="#f7c58d" />
      <path d="M134 109v40M186 109v40" stroke="#fff" strokeWidth="5" opacity=".5" />
      <circle cx="118" cy="56" r="6" fill="#ff6b8e" />
      <circle cx="204" cy="50" r="5" fill="#2ea8ff" />
      <rect x="222" y="66" width="10" height="10" rx="2" fill="#2fbf71" transform="rotate(20 227 71)" />
    </>
  ),
  follow_up: ({ dark }) => (
    <>
      {/* phone */}
      <rect x="128" y="34" width="64" height="118" rx="14" fill={dark} />
      <rect x="134" y="44" width="52" height="92" rx="6" fill="#fff" />
      <circle cx="160" cy="144" r="3.5" fill="#fff" opacity=".7" />
      <rect x="140" y="52" width="30" height="12" rx="6" fill="#dcf8f3" />
      <rect x="150" y="70" width="30" height="12" rx="6" fill="#19c9b2" />
      <rect x="140" y="88" width="24" height="12" rx="6" fill="#dcf8f3" />
      {/* bubbles */}
      <g className="art-float">
        <path d="M206 50h44a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10h-26l-12 10v-10h-6a10 10 0 0 1-10-10V60a10 10 0 0 1 10-10z" fill="#fff" />
        <circle cx="216" cy="70" r="4" fill="#19c9b2" />
        <circle cx="230" cy="70" r="4" fill="#19c9b2" />
        <circle cx="244" cy="70" r="4" fill="#19c9b2" />
      </g>
      <g className="art-float art-float--b">
        <path d="M70 84h40a9 9 0 0 1 9 9v16a9 9 0 0 1-9 9h-4v9l-11-9H70a9 9 0 0 1-9-9V93a9 9 0 0 1 9-9z" fill="#ffc93c" />
        <path d="M80 104.5l6 6 12-13" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </>
  ),
  new_customer: () => (
    <>
      {/* target */}
      <rect x="154" y="120" width="12" height="36" rx="4" fill="#b07a4f" />
      <circle cx="160" cy="88" r="52" fill="#fff" />
      <circle cx="160" cy="88" r="40" fill="#ff6b8e" />
      <circle cx="160" cy="88" r="27" fill="#fff" />
      <circle cx="160" cy="88" r="14" fill="#ff6b8e" />
      {/* arrow */}
      <g className="art-float">
        <path d="M160 88l62-44" stroke="#3a2a7a" strokeWidth="6" strokeLinecap="round" />
        <path d="M222 44l4-17 13 8-3 2 15 4-12 9-2-3z" fill="#ffc93c" stroke="#e09200" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <circle cx="160" cy="88" r="5" fill="#3a2a7a" />
      {/* flag */}
      <path d="M78 150V84" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M80 86l30 10-30 12z" fill="#ffc93c" />
    </>
  ),
  market_research: ({ dark }) => (
    <>
      {/* chart */}
      <rect x="92" y="50" width="120" height="96" rx="12" fill="#fff" />
      <rect x="108" y="108" width="16" height="26" rx="4" fill="#ffd0a8" />
      <rect x="132" y="92" width="16" height="42" rx="4" fill="#ff8f3d" />
      <rect x="156" y="76" width="16" height="58" rx="4" fill="#2ea8ff" />
      <rect x="180" y="64" width="16" height="70" rx="4" fill="#2fbf71" />
      {/* magnifier */}
      <g className="art-float">
        <path d="M222 122l24 26" stroke={dark} strokeWidth="12" strokeLinecap="round" />
        <circle cx="204" cy="100" r="30" fill="#e8f6ff" opacity=".7" stroke="#fff" strokeWidth="9" />
        <circle cx="204" cy="100" r="30" fill="none" stroke={dark} strokeWidth="5" />
        <path d="M188 92a18 18 0 0 1 12-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    </>
  ),
  sales_achievement: () => (
    <>
      {/* podium */}
      <rect x="112" y="136" width="96" height="20" rx="6" fill="#fff" opacity=".9" />
      <rect x="136" y="124" width="48" height="14" rx="4" fill="#8a5a36" />
      <g className="art-float">
        <path d="M128 44h64v30a32 32 0 0 1-64 0z" fill="#ffc93c" stroke="#e09200" strokeWidth="4" strokeLinejoin="round" />
        <path d="M128 54h-16c0 18 8 28 20 30M192 54h16c0 18-8 28-20 30" stroke="#e09200" strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="152" y="104" width="16" height="22" fill="#e09200" />
        <path d="M160 54l5 10 11 1.6-8 7.8 1.9 11L160 79.2l-9.9 5.2 1.9-11-8-7.8 11-1.6z" fill="#fff" />
        <path d="M138 52v20" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".6" />
      </g>
      {/* coins */}
      <ellipse cx="84" cy="148" rx="16" ry="7" fill="#e09200" />
      <ellipse cx="84" cy="143" rx="16" ry="7" fill="#ffc93c" />
      <ellipse cx="84" cy="136" rx="16" ry="7" fill="#e09200" />
      <ellipse cx="84" cy="131" rx="16" ry="7" fill="#ffd95e" />
      <ellipse cx="238" cy="150" rx="14" ry="6" fill="#e09200" />
      <ellipse cx="238" cy="145" rx="14" ry="6" fill="#ffd95e" />
    </>
  ),
};

interface MissionArtProps {
  category: MissionCategory;
  className?: string;
  locked?: boolean;
}

export function MissionArt({ category, className, locked = false }: MissionArtProps) {
  const meta = CATEGORIES[category];
  const gid = useId().replace(/:/g, '');
  return (
    <svg className={`mission-art ${locked ? 'is-locked' : ''} ${className ?? ''}`} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={meta.color} />
          <stop offset="1" stopColor={meta.dark} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#g${gid})`} />
      <circle cx="40" cy="30" r="46" fill="#fff" opacity=".12" />
      <circle cx="292" cy="150" r="62" fill="#fff" opacity=".1" />
      <ellipse cx="160" cy="166" rx="150" ry="22" fill="#fff" opacity=".16" />
      {/* clouds */}
      <g fill="#fff" opacity=".55">
        <path d="M34 78a10 10 0 0 1 10-10 13 13 0 0 1 24 3 9 9 0 0 1 2 17H42a9 9 0 0 1-8-10z" />
        <path d="M262 36a8 8 0 0 1 8-8 10 10 0 0 1 19 2 7 7 0 0 1 2 14h-22a7 7 0 0 1-7-8z" />
      </g>
      {SCENES[category](meta)}
      <Sparkle x={62} y={48} s={0.9} />
      <Sparkle x={276} y={92} s={0.7} delay={0.6} />
      <Sparkle x={196} y={24} s={0.5} delay={1.1} />
    </svg>
  );
}
