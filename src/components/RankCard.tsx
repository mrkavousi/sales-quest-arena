import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Leaderboard } from '../api/types';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

/**
 * The player's position in the sales ranking (organizational points, from the server) next to
 * their game XP. The two numbers are labelled separately on purpose.
 */
export function RankCard() {
  const { mode, progress } = useGame();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);
  // Refetch after every change the server could have made to the ranking (XP, missions, quests).
  const refreshKey = `${progress.xp}:${progress.history.length}:${Object.keys(progress.achievements).length}`;

  useEffect(() => {
    if (mode !== 'server') return;
    let alive = true;
    api
      .get<Leaderboard>('/api/v1/leaderboard')
      .then((data) => {
        if (!alive) return;
        setBoard(data);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [mode, refreshKey]);

  if (mode !== 'server') return null;
  const me = board?.rows.find((row) => row.is_me);

  return (
    <section className="panel rank-card" aria-labelledby="rank-title">
      <header className="panel__head">
        <h2 id="rank-title">Your ranking</h2>
        <span className="demo-tag">SAMPLE</span>
      </header>
      {!board && !failed && <p className="rank-card__note">Loading the ranking…</p>}
      {failed && <p className="rank-card__note">The ranking is unavailable right now. Your progress is unaffected.</p>}
      {board && !me && <p className="rank-card__note">You are not on the ranking yet.</p>}
      {board && me && (
        <div className="rank-card__body">
          <div className="rank-card__pos" aria-label={`Rank ${me.rank} of ${board.rows.length}`}>
            <small>Position</small>
            <b>#{me.rank}</b>
            <span>of {board.rows.length}</span>
          </div>
          <dl className="rank-card__stats">
            <div>
              <dt>Org points</dt>
              <dd>{me.org_points}</dd>
            </div>
            <div>
              <dt>Game XP</dt>
              <dd>{me.game_xp}</dd>
            </div>
          </dl>
        </div>
      )}
      <button className="linkbtn rank-card__more" onClick={() => navigate('/board')}>
        Full ranking →
      </button>
    </section>
  );
}
