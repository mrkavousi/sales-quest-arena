import { useState } from 'react';
import type { Leaderboard, LeaderboardRow, LeaderboardScope, LeaderboardWindow } from '../api/types';
import { formatDate, DemoBanner, useApi } from './ui';

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: 'individual', label: 'Individuals' },
  { id: 'team', label: 'Teams' },
  { id: 'branch', label: 'Branches' },
];

const WINDOWS: { id: LeaderboardWindow; label: string }[] = [
  { id: 'season', label: 'Season' },
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This week' },
  { id: 'monthly', label: 'This month' },
];

function MovementChip({ row }: { row: LeaderboardRow }) {
  if (row.movement === 'up') {
    return <span className="lb-move lb-move--up" aria-label={`Up ${row.places} places`}>▲ {row.places}</span>;
  }
  if (row.movement === 'down') {
    return <span className="lb-move lb-move--down" aria-label={`Down ${row.places} places`}>▼ {row.places}</span>;
  }
  if (row.movement === 'same') return <span className="lb-move lb-move--same" aria-label="Same place">=</span>;
  if (row.movement === 'new') return <span className="lb-move lb-move--new">New</span>;
  return <span className="lb-move lb-move--none" aria-hidden="true">–</span>;
}

function whoLine(scope: LeaderboardScope, row: LeaderboardRow): string {
  if (scope === 'individual') return [row.branch_name ?? row.branch_code, row.employee_code].filter(Boolean).join(' · ');
  if (scope === 'team') return [`${row.members} representatives`, row.subtitle].filter(Boolean).join(' · ');
  return [`${row.members} representatives`, row.branch_code].filter(Boolean).join(' · ');
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Top three in podium order (2nd, 1st, 3rd). */
function Podium({ rows, onOpenRep }: { rows: LeaderboardRow[]; onOpenRep?: (userId: string) => void }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  const slots = [top[1], top[0], top[2]];
  return (
    <div className="lb-podium" role="list" aria-label="Top three">
      {slots.map((row, index) =>
        row ? (
          <div key={row.id} role="listitem" className={`lb-step lb-step--${row.rank}${row.is_me || row.in_my_group ? ' is-me' : ''}`}>
            <span className="lb-step__medal" aria-hidden="true">
              {MEDALS[row.rank - 1]}
            </span>
            {onOpenRep && row.user_id ? (
              <button className="lb-step__name lb-link" onClick={() => onOpenRep(row.user_id!)}>
                {row.name}
              </button>
            ) : (
              <b className="lb-step__name" dir="auto">
                {row.name}
              </b>
            )}
            <span className="lb-step__org">
              <b>{row.org_points}</b> <i>org pts</i>
            </span>
            <span className="lb-step__xp">{row.game_xp} XP</span>
          </div>
        ) : (
          <div key={`empty-${index}`} className="lb-step lb-step--empty" aria-hidden="true" />
        ),
      )}
    </div>
  );
}

interface LeaderboardPageProps {
  onOpenRep?: (userId: string) => void;
}

/**
 * Ranking for players and managers. Scope (individuals, teams, branches) and window (season,
 * today, this week, this month) come from the server. Organizational points and game XP are
 * always shown as two separate numbers, and movement compares with the previous window.
 */
export function LeaderboardPage({ onOpenRep }: LeaderboardPageProps) {
  const [scope, setScope] = useState<LeaderboardScope>('individual');
  const [windowId, setWindowId] = useState<LeaderboardWindow>('season');
  const remote = useApi<Leaderboard>(`/api/v1/leaderboard?scope=${scope}&window=${windowId}`);
  const board = remote.data;

  return (
    <div className="k-stack lb">
      <DemoBanner />
      <section className="lb-card" aria-labelledby="lb-title">
        <header className="lb-head">
          <div>
            <h2 id="lb-title">Ranking</h2>
            <p className="lb-sub">
              {board
                ? board.window === 'season'
                  ? board.competition
                    ? `${board.competition.title} · ${formatDate(board.competition.starts_at)} → ${formatDate(board.competition.ends_at)}`
                    : 'No active competition'
                  : board.window_label
                : 'Loading the ranking…'}
              {board?.window === 'season' && board.competition?.is_sample ? <span className="lb-sample">SAMPLE</span> : null}
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={remote.reload} aria-label="Refresh ranking">
            Refresh
          </button>
        </header>

        <div className="lb-controls">
          <div className="lb-seg" role="group" aria-label="Ranking scope">
            {SCOPES.map((item) => (
              <button key={item.id} type="button" aria-pressed={scope === item.id} className={scope === item.id ? 'is-on' : undefined} onClick={() => setScope(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="lb-seg lb-seg--window" role="group" aria-label="Ranking window">
            {WINDOWS.map((item) => (
              <button key={item.id} type="button" aria-pressed={windowId === item.id} className={windowId === item.id ? 'is-on' : undefined} onClick={() => setWindowId(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {remote.error && !board && (
          <div className="lb-state" role="alert">
            <p>{remote.error}</p>
            <button className="btn btn--green btn--sm" onClick={remote.reload}>
              Try again
            </button>
          </div>
        )}
        {!board && !remote.error && <div className="lb-skeleton" aria-busy="true" aria-label="Loading ranking" />}

        {board && (
          <div className={`lb-body${remote.loading ? ' is-loading' : ''}`} aria-busy={remote.loading}>
            {board.me ? (
              <div className="lb-me" aria-label="Your position">
                <span className="lb-me__label">Your position</span>
                <b className="lb-me__rank">#{board.me.rank}</b>
                <span className="lb-me__org">
                  <b>{board.me.org_points}</b> org pts
                </span>
                <span className="lb-me__xp">
                  <b>{board.me.game_xp}</b> XP
                </span>
                <MovementChip row={board.me} />
              </div>
            ) : (
              <p className="lb-note">{board.scope === 'individual' ? 'You are not on this ranking yet.' : 'Your group is not on this ranking yet.'}</p>
            )}

            {board.rows.length === 0 ? (
              <div className="lb-state">
                <p>No one has earned points in this window yet.</p>
                <p className="lb-note">{board.note}</p>
              </div>
            ) : (
              <>
                <Podium rows={board.rows} onOpenRep={onOpenRep} />
                <div className="lb-colhead" aria-hidden="true">
                  <span>#</span>
                  <span>{board.scope === 'individual' ? 'Representative' : board.scope === 'team' ? 'Team' : 'Branch'}</span>
                  <span>Move</span>
                  <span className="lb-num">Org points</span>
                  <span className="lb-num">Game XP</span>
                </div>
                <ol className="lb-list" aria-label="Ranking">
                  {board.rows.map((row) => {
                    const mine = row.is_me || row.in_my_group;
                    return (
                      <li key={row.id} className={`lb-row${mine ? ' is-me' : ''}`} data-testid={`lb-row-${row.employee_code ?? row.id}`}>
                        <span className="lb-rank">{row.rank}</span>
                        <div className="lb-who">
                          {onOpenRep && row.user_id ? (
                            <button className="lb-name lb-link" onClick={() => onOpenRep(row.user_id!)}>
                              {row.name}
                            </button>
                          ) : (
                            <b className="lb-name" dir="auto">
                              {row.name}
                            </b>
                          )}
                          <small dir="auto">{whoLine(board.scope, row)}</small>
                          {mine && <span className="lb-you">You</span>}
                        </div>
                        <MovementChip row={row} />
                        <span className="lb-num lb-num--org">
                          <b>{row.org_points}</b>
                        </span>
                        <span className="lb-num lb-num--xp">{row.game_xp}</span>
                      </li>
                    );
                  })}
                </ol>
                <p className="lb-note">{board.note}</p>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
