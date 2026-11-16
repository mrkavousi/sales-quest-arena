import { useState } from 'react';
import type { Leaderboard, LeaderboardRow, LeaderboardScope, LeaderboardWindow } from '../api/types';
import { jdate, jperiod, n } from '../i18n';
import { branchLabel } from '../i18n';
import { DemoBanner, useApi } from './ui';

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: 'individual', label: 'ویزیتورها' },
  { id: 'team', label: 'تیم‌ها' },
  { id: 'branch', label: 'شعبه‌ها' },
];

const WINDOWS: { id: LeaderboardWindow; label: string }[] = [
  { id: 'season', label: 'فصل' },
  { id: 'daily', label: 'امروز' },
  { id: 'weekly', label: 'این هفته' },
  { id: 'monthly', label: 'این ماه' },
];

function MovementChip({ row }: { row: LeaderboardRow }) {
  if (row.movement === 'up') {
    return <span className="lb-move lb-move--up" aria-label={`${n(row.places)} رتبه صعود`}>▲ {n(row.places)}</span>;
  }
  if (row.movement === 'down') {
    return <span className="lb-move lb-move--down" aria-label={`${n(row.places)} رتبه نزول`}>▼ {n(row.places)}</span>;
  }
  if (row.movement === 'same') return <span className="lb-move lb-move--same" aria-label="بدون تغییر">=</span>;
  if (row.movement === 'new') return <span className="lb-move lb-move--new">جدید</span>;
  return <span className="lb-move lb-move--none" aria-hidden="true">–</span>;
}

function whoLine(scope: LeaderboardScope, row: LeaderboardRow): string {
  if (scope === 'individual') return [branchLabel(row.branch_code, row.branch_name), row.employee_code].filter(Boolean).join(' · ');
  if (scope === 'team') return [`${n(row.members)} ویزیتور`, branchLabel(row.branch_code, row.subtitle)].filter(Boolean).join(' · ');
  return [`${n(row.members)} ویزیتور`, branchLabel(row.branch_code, row.branch_name)].filter(Boolean).join(' · ');
}

function windowLabel(board: Leaderboard): string {
  if (!board.period) return '';
  if (board.window === 'daily') return `امروز · ${jdate(board.period.start)}`;
  if (board.window === 'weekly') return `هفتهٔ جاری · ${jdate(board.period.start)} تا ${jdate(board.period.end)}`;
  return `ماه جاری · ${jperiod(board.period.start.slice(0, 7))}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Top three in podium order (2nd, 1st, 3rd). */
function Podium({ rows, onOpenRep }: { rows: LeaderboardRow[]; onOpenRep?: (userId: string) => void }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  const slots = [top[1], top[0], top[2]];
  return (
    <div className="lb-podium" role="list" aria-label="سه نفر برتر">
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
              <b>{n(row.org_points)}</b> <i>امتیاز سازمانی</i>
            </span>
            <span className="lb-step__xp">{n(row.game_xp)} امتیاز تجربه</span>
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
            <h2 id="lb-title">رتبه‌بندی و رقابت</h2>
            <p className="lb-sub">
              {board
                ? board.window === 'season'
                  ? board.competition
                    ? `${board.competition.title} · ${jdate(board.competition.starts_at)} تا ${jdate(board.competition.ends_at)}`
                    : 'رقابت فعالی وجود ندارد'
                  : windowLabel(board)
                : 'در حال بارگذاری رتبه‌بندی…'}
              {board?.window === 'season' && board.competition?.is_sample ? <span className="lb-sample">نمونه</span> : null}
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={remote.reload} aria-label="بازخوانی رتبه‌بندی">
            بازخوانی
          </button>
        </header>

        <div className="lb-controls">
          <div className="lb-seg" role="group" aria-label="نوع رتبه‌بندی">
            {SCOPES.map((item) => (
              <button key={item.id} type="button" aria-pressed={scope === item.id} className={scope === item.id ? 'is-on' : undefined} onClick={() => setScope(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="lb-seg lb-seg--window" role="group" aria-label="بازهٔ زمانی">
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
              تلاش دوباره
            </button>
          </div>
        )}
        {!board && !remote.error && <div className="lb-skeleton" aria-busy="true" aria-label="در حال بارگذاری رتبه‌بندی" />}

        {board && (
          <div className={`lb-body${remote.loading ? ' is-loading' : ''}`} aria-busy={remote.loading}>
            {board.me ? (
              <div className="lb-me" aria-label="جایگاه شما">
                <span className="lb-me__label">جایگاه شما</span>
                <b className="lb-me__rank">{n(board.me.rank)}</b>
                <span className="lb-me__org">
                  <b>{n(board.me.org_points)}</b> امتیاز سازمانی
                </span>
                <span className="lb-me__xp">
                  <b>{n(board.me.game_xp)}</b> امتیاز تجربه
                </span>
                <MovementChip row={board.me} />
              </div>
            ) : (
              <p className="lb-note">{board.scope === 'individual' ? 'شما هنوز در این رتبه‌بندی نیستید.' : 'گروه شما هنوز در این رتبه‌بندی نیست.'}</p>
            )}

            {board.rows.length === 0 ? (
              <div className="lb-state">
                <p>هنوز کسی در این بازه امتیازی کسب نکرده است.</p>
                <p className="lb-note">{board.note}</p>
              </div>
            ) : (
              <>
                <Podium rows={board.rows} onOpenRep={onOpenRep} />
                <div className="lb-colhead" aria-hidden="true">
                  <span>#</span>
                  <span>{board.scope === 'individual' ? 'ویزیتور' : board.scope === 'team' ? 'تیم' : 'شعبه'}</span>
                  <span>تغییر</span>
                  <span className="lb-num">امتیاز سازمانی</span>
                  <span className="lb-num">امتیاز تجربه</span>
                </div>
                <ol className="lb-list" aria-label="رتبه‌بندی">
                  {board.rows.map((row) => {
                    const mine = row.is_me || row.in_my_group;
                    return (
                      <li key={row.id} className={`lb-row${mine ? ' is-me' : ''}`} data-testid={`lb-row-${row.employee_code ?? row.id}`}>
                        <span className="lb-rank">{n(row.rank)}</span>
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
                          {mine && <span className="lb-you">شما</span>}
                        </div>
                        <MovementChip row={row} />
                        <span className="lb-num lb-num--org">
                          <b>{n(row.org_points)}</b>
                        </span>
                        <span className="lb-num lb-num--xp">{n(row.game_xp)}</span>
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
