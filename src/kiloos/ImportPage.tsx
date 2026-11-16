import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ImportRow, ImportSummary } from '../api/types';
import { navigate } from '../router';
import { Card, DemoBanner, formatDate, formatMoney, Remoted, StatusChip, Tile, brandColor, useApi } from './ui';

function RowTable({ rows, empty }: { rows: ImportRow[]; empty: string }) {
  if (rows.length === 0) return <p className="k-muted">{empty}</p>;
  return (
    <div className="k-scroll">
      <table className="k-table k-table--dense">
        <thead>
          <tr>
            <th>Row</th>
            <th>ID</th>
            <th>Rep</th>
            <th>Date</th>
            <th>Brand</th>
            <th className="k-num">Amount</th>
            <th>Result</th>
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
      setError(err instanceof ApiError ? err.message : 'Processing failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Remoted remote={remote} what="import">
      {(loaded) => {
        const data = override ?? loaded;
        const done = data.status === 'completed';
        return (
          <div className="k-stack">
            <DemoBanner />
            <div className="k-toolbar">
              <div>
                <button className="k-link" onClick={() => navigate('/imports')}>
                  ← All imports
                </button>
                <h1>
                  {data.file_name} <StatusChip status={data.status} />
                  {data.is_sample && <span className="k-chip k-chip--sample">SAMPLE data</span>}
                </h1>
                <p className="k-muted">Uploaded {formatDate(data.created_at)}</p>
              </div>
            </div>

            <div className="k-tiles" data-testid="import-counts">
              <Tile label="Rows in file" value={data.counts.total} />
              <Tile label="Valid rows" value={data.counts.valid} sub={done ? `${data.counts.processed} processed` : `${data.counts.pending} waiting for confirmation`} tone="good" />
              <Tile label="Rejected rows" value={data.counts.rejected} sub="data problems, excluded" tone={data.counts.rejected ? 'bad' : undefined} />
              <Tile label="Duplicate rows" value={data.counts.duplicates} sub="already counted, excluded" tone={data.counts.duplicates ? 'warn' : undefined} />
            </div>

            <div className="k-grid2">
              <Card title="Sales in valid rows">
                <p className="k-bigmoney">
                  {formatMoney(data.totals.amount)} <small>Rials · {data.totals.records} rows</small>
                </p>
                <table className="k-table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th className="k-num">Rows</th>
                      <th className="k-num">Amount</th>
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
                    Targets sheet: {data.targets.valid} valid · {data.targets.invalid} rejected
                    {data.target_issues.map((t) => (
                      <span key={t.row_number} className="k-issue">
                        {' '}
                        row {t.row_number} ({t.user_external_id}/{t.brand_code}): {t.error_message}
                      </span>
                    ))}
                  </p>
                )}
              </Card>

              <Card title="Confirm and process">
                {done ? (
                  <div data-testid="import-done">
                    <p>
                      <b>Processed.</b> {data.counts.processed} sales rows now count in the dashboards
                      {result ? `; ${result.created} organizational point events were added to the ledger` : ''}.
                    </p>
                    <p className={data.reconciliation.rows_ok && data.reconciliation.points_ok ? 'k-ok' : 'k-bad'}>
                      Reconciliation: rows {data.reconciliation.rows_ok ? 'OK' : 'MISMATCH'} · points {data.reconciliation.points_ok ? 'OK' : 'MISMATCH'} ({data.reconciliation.scored_points} ledger / {data.reconciliation.points_sum} import)
                    </p>
                    <button className="btn btn--green" onClick={() => navigate('/')}>
                      Open the management dashboard
                    </button>
                  </div>
                ) : (
                  <>
                    <p>
                      Review the preview. Confirming counts <b>{data.counts.pending}</b> valid rows, applies <b>{data.targets.valid}</b> targets and writes sample organizational points to the ledger. Rejected and duplicate rows are never counted. Confirming twice cannot double count.
                    </p>
                    <button className="btn btn--yellow btn--lg" disabled={!data.can_process || busy} onClick={() => void process()} data-testid="process-import">
                      {busy ? 'Processing…' : `Confirm & process ${data.counts.pending} rows`}
                    </button>
                    {!data.can_process && <p className="k-muted">Nothing left to process.</p>}
                  </>
                )}
                {error && (
                  <div className="k-state k-state--error" role="alert">
                    <p>{error}</p>
                  </div>
                )}
              </Card>
            </div>

            <Card title={`Rejected & duplicate rows (${data.problem_rows.length}${data.problem_rows.length >= 60 ? '+' : ''})`}>
              <RowTable rows={data.problem_rows} empty="No rejected or duplicate rows." />
            </Card>
            <Card title="Preview of valid rows (first 15)">
              <RowTable rows={data.sample_rows} empty="No valid rows." />
            </Card>
          </div>
        );
      }}
    </Remoted>
  );
}
