import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ImportRow, ImportSummary } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { Card, DemoBanner, formatDate, formatMoney, Remoted, StatusChip, Tile, brandColor, useApi } from './ui';

function RowTable({ rows, empty }: { rows: ImportRow[]; empty: string }) {
  const { t } = useLanguage();
  if (rows.length === 0) return <p className="k-muted">{empty}</p>;
  return (
    <div className="k-scroll">
      <table className="k-table k-table--dense">
        <thead>
          <tr>
            <th>{t('k.th.row')}</th>
            <th>{t('k.th.id')}</th>
            <th>{t('k.th.rep')}</th>
            <th>{t('k.th.date')}</th>
            <th>{t('k.th.brand')}</th>
            <th className="k-num">{t('k.th.amount')}</th>
            <th>{t('k.th.result')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row_number}>
              <td>{r.row_number}</td>
              <td>{r.external_id || '—'}</td>
              <td>{r.user_external_id}</td>
              <td>{r.sale_date ?? '—'}</td>
              <td>{r.brand_code ?? '—'}</td>
              <td className="k-num">{r.amount ? Number(r.amount).toLocaleString('en-US') : '—'}</td>
              <td>
                <StatusChip status={r.status} /> {r.error && <small className="k-muted">{r.error}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Validation preview + explicit confirmation. Processing is what makes sales count. */
export function ImportPage({ importId }: { importId: string }) {
  const { t } = useLanguage();
  const remote = useApi<ImportSummary>(`/api/v1/mgmt/imports/${encodeURIComponent(importId)}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; points: number; targets_applied: number } | null>(null);
  const [override, setOverride] = useState<ImportSummary | null>(null);

  const process = async () => {
    setBusy(true);
    setError(null);
    try {
      const done = await api.post<{ result: { created: number; points: number; targets_applied: number }; import: ImportSummary }>(`/api/v1/mgmt/imports/${importId}/process`);
      setResult(done.result);
      setOverride(done.import);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('k.processFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Remoted remote={remote}>
      {(loaded) => {
        const data = override ?? loaded;
        const done = data.status === 'completed';
        return (
          <div className="k-stack">
            <DemoBanner />
            <div className="k-toolbar">
              <div>
                <button className="k-link" onClick={() => navigate('/imports')}>
                  {t('k.im.detailBack')}
                </button>
                <h1>
                  {data.file_name} <StatusChip status={data.status} />
                  {data.is_sample && <span className="k-chip k-chip--sample">{t('k.sampleData')}</span>}
                </h1>
                <p className="k-muted">{t('k.im.uploadedAt', { date: formatDate(data.created_at) })}</p>
              </div>
            </div>

            <div className="k-tiles" data-testid="import-counts">
              <Tile label={t('k.im.rowsInFile')} value={data.counts.total} />
              <Tile label={t('k.im.validRows')} value={data.counts.valid} sub={done ? t('k.im.processedSub', { count: data.counts.processed }) : t('k.im.waitingSub', { count: data.counts.pending })} tone="good" />
              <Tile label={t('k.im.rejectedRows')} value={data.counts.rejected} sub={t('k.im.rejectedSub')} tone={data.counts.rejected ? 'bad' : undefined} />
              <Tile label={t('k.im.duplicateRows')} value={data.counts.duplicates} sub={t('k.im.duplicateSub')} tone={data.counts.duplicates ? 'warn' : undefined} />
            </div>

            <div className="k-grid2">
              <Card title={t('k.im.salesValid')}>
                <p className="k-bigmoney">
                  {formatMoney(data.totals.amount)} <small>{t('k.im.rialsRows', { count: data.totals.records })}</small>
                </p>
                <table className="k-table">
                  <thead>
                    <tr>
                      <th>{t('k.th.brand')}</th>
                      <th className="k-num">{t('k.th.rows')}</th>
                      <th className="k-num">{t('k.th.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.brands.map((b) => (
                      <tr key={b.brand}>
                        <td>
                          <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                          {b.brand}
                        </td>
                        <td className="k-num">{b.records}</td>
                        <td className="k-num">{formatMoney(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.targets.rows > 0 && (
                  <p className="k-note">
                    {t('k.im.targetsSheet', { valid: data.targets.valid, invalid: data.targets.invalid })}
                    {data.target_issues.map((issue) => (
                      <span key={issue.row_number} className="k-issue">
                        {' '}
                        {t('k.im.targetIssue', { row: issue.row_number, user: issue.user_external_id, brand: issue.brand_code, error: issue.error_message })}
                      </span>
                    ))}
                  </p>
                )}
              </Card>

              <Card title={t('k.im.confirmTitle')}>
                {done ? (
                  <div data-testid="import-done">
                    <p>
                      <b>{t('k.im.processedDone')}</b> {t('k.im.processedRows', { count: data.counts.processed })}
                      {result ? t('k.im.ledgerAdded', { count: result.created }) : ''}.
                    </p>
                    <p className={data.reconciliation.rows_ok && data.reconciliation.points_ok ? 'k-ok' : 'k-bad'}>
                      {t('k.im.reconcile', {
                        rows: data.reconciliation.rows_ok ? t('k.im.ok') : t('k.im.mismatch'),
                        points: data.reconciliation.points_ok ? t('k.im.ok') : t('k.im.mismatch'),
                        ledger: data.reconciliation.scored_points,
                        imported: data.reconciliation.points_sum,
                      })}
                    </p>
                    <button className="btn btn--green" onClick={() => navigate('/')}>
                      {t('k.im.openDashboard')}
                    </button>
                  </div>
                ) : (
                  <>
                    <p>
                      {t('k.im.reviewNote', { count: data.counts.pending, targets: data.targets.valid })}
                    </p>
                    <button className="btn btn--yellow btn--lg" disabled={!data.can_process || busy} onClick={() => void process()} data-testid="process-import">
                      {busy ? t('k.im.processing') : t('k.im.confirmProcess', { count: data.counts.pending })}
                    </button>
                    {!data.can_process && <p className="k-muted">{t('k.im.nothingLeft')}</p>}
                  </>
                )}
                {error && (
                  <div className="k-state k-state--error" role="alert">
                    <p>{error}</p>
                  </div>
                )}
              </Card>
            </div>

            <Card title={t('k.im.problemRows', { count: data.problem_rows.length, plus: data.problem_rows.length >= 60 ? '+' : '' })}>
              <RowTable rows={data.problem_rows} empty={t('k.empty.noRejected')} />
            </Card>
            <Card title={t('k.im.previewRows')}>
              <RowTable rows={data.sample_rows} empty={t('k.empty.noValid')} />
            </Card>
          </div>
        );
      }}
    </Remoted>
  );
}
