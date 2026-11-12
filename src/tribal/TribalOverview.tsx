import { formatNumber, translate, type Language } from '../i18n/locale';
import type { TribalOverviewProps, TribalPlayerView, TribalUnitView, TribalVisibility } from './view';

function hasVisibleValue(player: TribalPlayerView, visibility: TribalVisibility): boolean {
  return (visibility.name === true && player.name != null) ||
    (visibility.avatar === true && player.avatar != null) ||
    (visibility.points === true && player.points != null) ||
    (visibility.rank === true && player.rank != null);
}

function PlayerRow({ player, visibility, language }: { player: TribalPlayerView; visibility: TribalVisibility; language: Language }) {
  return (
    <li className="tribal-player">
      <dl className="tribal-player__fields">
        {visibility.name === true && player.name != null && (
          <div><dt>{translate(language, 'tribal.name')}</dt><dd><bdi>{player.name}</bdi></dd></div>
        )}
        {visibility.avatar === true && player.avatar != null && (
          <div><dt>{translate(language, 'tribal.avatar')}</dt><dd><img className="tribal-player__avatar" src={player.avatar.src} alt={translate(language, 'tribal.avatar')} /></dd></div>
        )}
        {visibility.points === true && player.points != null && (
          <div><dt>{translate(language, 'tribal.points')}</dt><dd><bdi>{formatNumber(language, player.points)}</bdi></dd></div>
        )}
        {visibility.rank === true && player.rank != null && (
          <div><dt>{translate(language, 'tribal.rank')}</dt><dd><bdi>{typeof player.rank === 'number' ? formatNumber(language, player.rank) : player.rank}</bdi></dd></div>
        )}
      </dl>
    </li>
  );
}

// Cap indentation, not hierarchy: every level remains in the semantic nested
// list. This keeps very deep trees usable on narrow screens.
const MAX_INDENTED_DEPTH = 8;
function UnitList({ units, visibility, language, depth = 0 }: { units: readonly TribalUnitView[]; visibility: TribalVisibility; language: Language; depth?: number }) {
  return (
    <ul className={`tribal-tree${depth >= MAX_INDENTED_DEPTH ? ' tribal-tree--flush' : ''}`}>
      {units.map((unit) => {
        const players = (unit.players ?? []).filter((player) => hasVisibleValue(player, visibility));
        return (
          <li className="tribal-tree__unit" key={unit.id}>
            <div className="tribal-tree__label"><bdi>{unit.label}</bdi></div>
            {players.length > 0 && (
              <ul className="tribal-players">
                {players.map((player) => <PlayerRow key={player.id} player={player} visibility={visibility} language={language} />)}
              </ul>
            )}
            {unit.children && unit.children.length > 0 && <UnitList units={unit.children} visibility={visibility} language={language} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Read-only rendering of supplied view data. No source or sample data is bundled here. */
export function TribalOverview({ view, language }: TribalOverviewProps) {
  if (view === null) {
    return (
      <section className="panel tribal-overview__state" role="status">
        <h2>{translate(language, 'tribal.unavailableTitle')}</h2>
        <p>{translate(language, 'tribal.unavailable')}</p>
      </section>
    );
  }

  return (
    <section className="panel tribal-overview" aria-labelledby="tribal-organization-heading">
      <h2 id="tribal-organization-heading">{translate(language, 'tribal.organization')}</h2>
      {view.units.length === 0 ? (
        <p role="status" className="tribal-overview__empty">{translate(language, 'tribal.empty')}</p>
      ) : (
        <UnitList units={view.units} visibility={view.visibility ?? {}} language={language} />
      )}
    </section>
  );
}
