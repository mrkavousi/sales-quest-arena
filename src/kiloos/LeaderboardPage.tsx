import type { Leaderboard } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { Card, DemoBanner, formatDate, Remoted, useApi } from './ui';

/** Ranking by organizational points (append-only ledger). Game XP is shown, never ranked on. */
export function LeaderboardPage({ onOpenRep }: { onOpenRep?: (userId: string) => void }) {
  const { t } = useLanguage();
  const remote = useApi<Leaderboard>('/api/v1/leaderboard');
  return (
    <div className="k-stack">
      <DemoBanner />
      <Card
        title={t('k.lb.title')}
        action={
          <button className="btn btn--ghost btn--sm" onClick={remote.reload} aria-label={t('k.lb.refreshAria')}>
            {t('k.refresh')}
          </button>
        }
      >
        <Remoted remote={remote}>
          {(board) => (
            <>
              <p className="k-muted">
                {board.competition
                  ? `${board.competition.title} · ${formatDate(board.competition.starts_at)} → ${formatDate(board.competition.ends_at)}`
                  : t('k.state.noCompetition')}
                {board.competition?.is_sample ? t('k.im.sampleCompetition') : ''}
              </p>
              <table className="k-table k-table--board">
                <thead>
                  <tr>
                    <th>{t('k.th.rank')}</th>
                    <th>{t('k.lb.representative')}</th>
                    <th>{t('k.lb.branch')}</th>
                    <th className="k-num">{t('k.lb.orgPoints')}</th>
                    <th className="k-num">{t('k.lb.gameXp')}</th>
                    <th className="k-num">{t('k.lb.level')}</th>
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
                        {row.is_me && <span className="k-chip k-chip--you">{t('k.lb.youChip')}</span>}
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
