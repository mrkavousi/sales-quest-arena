import type { CSSProperties } from 'react';
import { CATEGORIES } from '../game/missions';
import type { MissionView } from '../game/types';
import { Mascot } from './art/Mascot';
import { CATEGORY_ICON } from './art/MissionArt';
import { Scenery, TreasureChest, type SceneryKind } from './art/Scenery';
import { Icon, StarIcon } from './ui/Icon';
import { ProgressRing } from './ui/Progress';

/* Map geometry (px, inside a fixed-width trail that is centered in the card). */
const TRAIL_W = 320;
const ROW_H = 172;
const TOP = 118;
const XS = [160, 92, 160, 228, 160, 92];
const DECOR: SceneryKind[] = ['tree', 'tent', 'bush', 'pine', 'rock', 'flowers', 'tree', 'sign'];

const nodeX = (i: number) => XS[i % XS.length];
const nodeY = (i: number) => TOP + i * ROW_H;

function segmentPath(i: number): string {
  const x0 = nodeX(i), y0 = nodeY(i), x1 = nodeX(i + 1), y1 = nodeY(i + 1);
  const mid = (y1 - y0) / 2;
  return `M${x0} ${y0} C${x0} ${y0 + mid}, ${x1} ${y1 - mid}, ${x1} ${y1}`;
}

interface MissionMapProps {
  missions: MissionView[];
  activeId: string | null;
  onSelect: (missionId: string) => void;
}

export function MissionMap({ missions, activeId, onSelect }: MissionMapProps) {
  const done = missions.filter((m) => m.completions > 0).length;
  const chestY = nodeY(missions.length - 1) + ROW_H - 6;
  const height = chestY + 130;
  const allDone = done === missions.length;

  return (
    <section className="map" aria-label="Mission map">
      <div className="map__sky" aria-hidden="true">
        <span className="map__cloud map__cloud--a"><Scenery kind="cloud" size={64} /></span>
        <span className="map__cloud map__cloud--b"><Scenery kind="cloud" size={44} /></span>
        <span className="map__cloud map__cloud--c"><Scenery kind="cloud" size={54} /></span>
      </div>

      <header className="map__head">
        <div className="map__ribbon">
          <span className="map__world">World 1</span>
          <h2>Quest Island</h2>
        </div>
        <div className="map__count" aria-label={`${done} of ${missions.length} missions completed`}>
          <Icon name="check" size={14} strokeWidth={3.4} />
          {done}/{missions.length}
        </div>
      </header>

      <div className="map__trail" style={{ width: TRAIL_W, height }}>
        <svg className="map__path" width={TRAIL_W} height={height} viewBox={`0 0 ${TRAIL_W} ${height}`} aria-hidden="true">
          {missions.slice(0, -1).map((m, i) => (
            <g key={m.id}>
              <path d={segmentPath(i)} className="map__road" />
              <path d={segmentPath(i)} className={`map__dash${m.completions > 0 ? ' is-done' : ''}`} />
            </g>
          ))}
          <path
            d={`M${nodeX(missions.length - 1)} ${nodeY(missions.length - 1)} C${nodeX(missions.length - 1)} ${chestY - 40}, 160 ${chestY - 60}, 160 ${chestY}`}
            className="map__road"
          />
          <path
            d={`M${nodeX(missions.length - 1)} ${nodeY(missions.length - 1)} C${nodeX(missions.length - 1)} ${chestY - 40}, 160 ${chestY - 60}, 160 ${chestY}`}
            className={`map__dash${allDone ? ' is-done' : ''}`}
          />
        </svg>

        {/* scenery: always on the side the guide mascot does not use */}
        {missions.map((m, i) => {
          const x = nodeX(i);
          const centered = x === 160;
          return (
            <span key={`decor-${m.id}`} aria-hidden="true">
              <span className="map__decor" style={{ left: x >= 160 ? 30 : TRAIL_W - 30, top: nodeY(i) + (centered ? 6 : 70) }}>
                <Scenery kind={DECOR[i % DECOR.length]} size={56} />
              </span>
              {centered && (
                <span className="map__decor map__decor--sm" style={{ left: TRAIL_W - 22, top: nodeY(i) + 92 }}>
                  <Scenery kind={DECOR[(i + 5) % DECOR.length]} size={40} />
                </span>
              )}
            </span>
          );
        })}

        {missions.map((m, i) => {
          const meta = CATEGORIES[m.category];
          const isActive = m.id === activeId;
          const x = nodeX(i);
          const mascotRight = x <= 160;
          const cta = m.status === 'in_progress' ? 'Continue' : m.status === 'completed' ? 'Play again' : 'Start';
          return (
            <div
              key={m.id}
              className={`node node--${m.status}${isActive ? ' is-active' : ''}`}
              style={{ left: x, top: nodeY(i), '--c': meta.color, '--d': meta.dark, '--i': i } as CSSProperties}
            >
              {isActive && (
                <>
                  <span className="node__cta" aria-hidden="true">{cta}</span>
                  <span className={`node__mascot${mascotRight ? ' is-right' : ' is-left'}`} aria-hidden="true">
                    <Mascot size={62} mood="happy" />
                  </span>
                </>
              )}
              <button
                className="node__btn"
                onClick={() => onSelect(m.id)}
                aria-label={`${m.title} — ${m.status.replace('_', ' ')}${m.isDaily && !m.dailyDone ? ', daily challenge' : ''}`}
              >
                {isActive && <span className="node__pulse" aria-hidden="true" />}
                {m.status === 'in_progress' && (
                  <ProgressRing className="node__ring" value={Math.max(0.08, m.draftProgress)} size={98} stroke={7} color="var(--yellow)" track="rgba(91,61,245,.16)" />
                )}
                <span className="node__disc">
                  <Icon name={m.status === 'locked' ? 'lock' : CATEGORY_ICON[m.category]} size={34} strokeWidth={2.3} />
                </span>
                {m.status === 'completed' && (
                  <span className="node__check" aria-hidden="true">
                    <Icon name="check" size={15} strokeWidth={4} />
                  </span>
                )}
                {m.isDaily && !m.dailyDone && m.status !== 'locked' && <span className="node__daily" aria-hidden="true">Daily</span>}
              </button>
              <div className="node__label">
                <span className="node__title">
                  {m.shortTitle}
                  {m.completions > 0 && m.bestRating !== null && (
                    <span className="node__rating" aria-label={`best rating ${m.bestRating} of 5`}>
                      <StarIcon size={13} />
                      {m.bestRating}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}

        <div className={`map__chest${allDone ? ' is-open' : ''}`} style={{ top: chestY }}>
          <TreasureChest size={86} open={allDone} />
          <span className="map__chest-label">{allDone ? 'Island cleared! World 2 is on the way' : 'Clear the island — more worlds coming soon'}</span>
        </div>
      </div>
    </section>
  );
}
