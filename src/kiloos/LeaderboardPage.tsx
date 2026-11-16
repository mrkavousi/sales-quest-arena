import type { Leaderboard } from '../api/types';
import { Card, DemoBanner, formatDate, Remoted, useApi } from './ui';

/** Ranking by organizational points (append-only ledger). Game XP is shown, never ranked on. */
export function LeaderboardPage({ onOpenRep }: { onOpenRep?: (userId: string) => void }) {
  const remote = useApi<Leaderboard>('/api/v1/leaderboard');
  return (
    <div className="k-stack">
      <DemoBanner />
      <Card
        title="Leaderboard"
        action={
          <button className="btn btn--ghost btn--sm" onClick={remote.reload} aria-label="Refresh leaderboard">
            Refresh
          </button>
        }
      >
        <Remoted remote={remote} what="leaderboard">
          {(board) => (
            <>
              <p className="k-muted">
                {board.competition ? `${board.competition.title} · ${formatDate(board.competition.starts_at)} → ${formatDate(board.competition.ends_at)}` : 'No active competition'}
                {board.competition?.is_sample ? ' · SAMPLE competition' : ''}
              </p>
              <table className="k-table k-table--board">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Representative</th>
                    <th>Branch</th>
                    <th className="k-num">Org points</th>
                    <th className="k-num">Game XP</th>
                    <th className="k-num">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {board.rows.map((row) => (
                    <tr key={row.user_id} className={row.is_me ? 'is-me' : undefined} data-testid={`board-${row.employee_code ?? row.user_id}`}>
                      <td>
                        <b>{row.rank}</b>
                      </td>
                      <td dir="auto">
                        {onOpenRep ? (
                          <button className="k-link" onClick={() => onOpenRep(row.user_id)}>
                            {row.name}
                          </button>
                        ) : (
                          row.name
                        )}
                        {row.is_me && <span className="k-chip k-chip--you">you</span>}
                        <small className="k-muted"> {row.employee_code}</small>
                      </td>
                      <td>{row.branch_code ?? '—'}</td>
                      <td className="k-num">
                        <b>{row.org_points}</b>
                      </td>
                      <td className="k-num">{row.game_xp}</td>
                      <td className="k-num">{row.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="k-note">{board.note}</p>
            </>
          )}
        </Remoted>
      </Card>
    </div>
  );
}
