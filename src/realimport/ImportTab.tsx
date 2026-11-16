import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { Card, ErrorState, Remoted, Tile, useApi } from '../kiloos/ui';
import { navigate } from '../router';
import { Badge, fmt } from './badges';
import type { Inspection, Preview, RiBatch } from './types';

const MONTHS = ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'];
const ROLE_NAMES: Record<string, string> = {
  sales_primary: 'Base sales (fractional cartons)',
  sales_derived: 'Derived sales (integer-cast)',
  roster: 'Roster / hierarchy',
  box_conversion: 'Carton factors',
  branch_groups: 'Branch groups',
  customer_groups: 'Customer groups',
  manager_efes: 'EFES branch managers (targets)',
};

/** Inspect → configure period → validate → preview valid/rejected → confirm. */
export function ImportTab({ batch, inspection, reload }: { batch: RiBatch; inspection: Inspection; reload: () => void }) {
  const preview = useApi<Preview>(batch.status === 'inspected' ? null : `/api/v1/ri/batches/${batch.id}/preview`);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(batch.period.year);
  const [month, setMonth] = useState(batch.period.month);

  const act = async (what: 'validate' | 'confirm') => {
    setBusy(what);
    setError(null);
    try {
      await api.post(`/api/v1/ri/batches/${batch.id}/${what}`);
      reload();
      preview.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${what} failed.`);
    } finally {
      setBusy(null);
    }
  };

  const newPeriod = async () => {
    setBusy('period');
    setError(null);
    try {
      const out = await api.post<{ batch: RiBatch }>('/api/v1/ri/batches', { workbook_id: batch.workbook.id, config: { period: { year, month } } });
      navigate(`/ri/${out.batch.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the batch.');
    } finally {
      setBusy(null);
    }
  };

  const sheets = batch.counts.sheets ?? {};
  const primary = sheets.sales_primary;

  return (
    <div className="k-stack">
      <Card title="1 · Inspect the workbook">
        {inspection.problems.length > 0 && <ErrorState message={inspection.problems.join(' ')} />}
        <div className="k-scroll">
          <table className="k-table k-table--dense">
            <thead><tr><th>Role</th><th>Configured sheet</th><th>Found</th><th>Missing columns</th></tr></thead>
            <tbody>
              {Object.entries(inspection.roles).map(([role, r]) => (
                <tr key={role}>
                  <td>{ROLE_NAMES[role] ?? role}</td>
                  <td dir="auto">{r.sheet}</td>
                  <td>{r.found ? <Badge status="CONFIRMED" label="Found" /> : <Badge status="UNCONFIRMED" label="Not in file" />}</td>
                  <td>{r.columns_missing.length ? r.columns_missing.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="k-note">
          {inspection.sheets.length} sheets in the file ({inspection.sheets.filter((s) => s.state !== 'visible').length} hidden). Sheets are matched by name after folding Arabic/Persian letters; the mapping is configuration, not code.
        </p>
      </Card>

      <Card title="2 · Reporting period (explicit import configuration)">
        <div className="ri-form">
          <label>
            Jalali year
            <input type="number" min={1300} max={1500} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </label>
          <label>
            Month
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{i + 1} · {m}</option>
              ))}
            </select>
          </label>
          <button className="btn btn--ghost" disabled={busy !== null || (year === batch.period.year && month === batch.period.month)} onClick={() => void newPeriod()}>
            Create batch for this period
          </button>
        </div>
        <p className="k-note">
          This batch: <b>{batch.period.label} {batch.period.year}</b> (confirmed by the business for this workbook). The sales sheets carry only the month name, so rows whose month label differs from the configured month are rejected, never silently accepted. Carton basis: <b>{batch.config.carton_basis === 'sales_primary' ? 'base sheet (fractional)' : 'derived sheet (integer-cast)'}</b> · duplicate keys: <b>{batch.config.duplicate_key_policy}</b>.
        </p>
      </Card>

      <Card title="3 · Validate, preview and confirm">
        <div className="ri-actions">
          <button className="btn btn--yellow" disabled={batch.status !== 'inspected' || busy !== null} onClick={() => void act('validate')} data-testid="ri-validate">
            {busy === 'validate' ? 'Validating…' : batch.status === 'inspected' ? 'Validate & stage' : 'Validated'}
          </button>
          <button className="btn btn--green" disabled={batch.status !== 'validated' || busy !== null} onClick={() => void act('confirm')} data-testid="ri-confirm">
            {busy === 'confirm' ? 'Confirming…' : batch.status === 'confirmed' ? 'Import confirmed' : 'Confirm import'}
          </button>
        </div>
        <p className="k-note">Validation stores raw rows, normalised facts, mapping issues and targets in the isolated spike database. Confirming makes the batch available to calculations. Repeating either step changes nothing (idempotent).</p>
        {error && <ErrorState message={error} />}
        {batch.status === 'failed' && <ErrorState message={`Validation failed: ${batch.counts.error ?? 'unknown error'}`} />}
      </Card>

      {primary && (
        <>
          <div className="k-tiles" data-testid="ri-counts">
            <Tile label="Rows read (base sheet)" value={primary.rows_read.toLocaleString('en-US')} sub={primary.sheet} />
            <Tile label="Valid rows" value={primary.valid.toLocaleString('en-US')} tone="good" />
            <Tile label="Rejected rows" value={primary.rejected} tone={primary.rejected ? 'bad' : undefined} sub={Object.entries(primary.rejected_by_code).map(([c, n]) => `${c}×${n}`).join(' · ') || 'none'} />
            <Tile label="Duplicate business keys" value={primary.duplicate_keys} tone={primary.duplicate_keys ? 'warn' : undefined} sub={`${primary.duplicate_key_rows} extra rows kept, flagged`} />
          </div>
          <Card title="Sheet totals (cartons — never converted to Rials)">
            <div className="k-scroll">
              <table className="k-table">
                <thead><tr><th>Sheet</th><th className="k-num">Rows</th><th className="k-num">Distinct keys</th><th className="k-num">Gross cartons</th><th className="k-num">Net cartons</th><th className="k-num">Invoices</th></tr></thead>
                <tbody>
                  {Object.entries(sheets).map(([role, s]) => (
                    <tr key={role}>
                      <td dir="auto">{s.sheet}</td>
                      <td className="k-num">{s.rows_read.toLocaleString('en-US')}</td>
                      <td className="k-num">{s.distinct_keys.toLocaleString('en-US')}</td>
                      <td className="k-num">{fmt(s.gross_cartons)}</td>
                      <td className="k-num">{fmt(s.net_cartons)}</td>
                      <td className="k-num">{s.invoice_count.toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {batch.status !== 'inspected' && (
        <Remoted remote={preview} what="preview">
          {(p) => (
            <>
              <Card title="Mapping issues found while validating">
                {p.issues.length === 0 ? <p className="k-muted">None.</p> : (
                  <ul className="ri-issues">
                    {p.issues.map((i) => (
                      <li key={i.type}>
                        <Badge status={i.severity === 'info' ? 'UNCONFIRMED' : 'warning'} label={i.severity} /> {i.label} <b>×{i.entities}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title={`Rejected rows (${p.rejected_rows.length}${p.rejected_rows.length >= 60 ? '+' : ''})`}>
                {p.rejected_rows.length === 0 ? <p className="k-muted">No rejected rows.</p> : (
                  <div className="k-scroll">
                    <table className="k-table k-table--dense">
                      <thead><tr><th>Sheet</th><th>Row</th><th>Reason</th></tr></thead>
                      <tbody>
                        {p.rejected_rows.map((r) => (
                          <tr key={`${r.source_sheet}-${r.row_number}`}>
                            <td dir="auto">{r.source_sheet}</td>
                            <td>{r.row_number}</td>
                            <td>{r.errors.map((e) => `${e.code}: ${e.label}`).join('; ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <Card title={`Preview of normalised rows — ${p.basis_sheet ?? ''} (first ${p.valid_rows.length}, pseudonymised)`}>
                <div className="k-scroll">
                  <table className="k-table k-table--dense">
                    <thead><tr><th>Row</th><th>Branch</th><th>Line</th><th>Brand</th><th>SKU</th><th>Visitor</th><th>Customer</th><th className="k-num">Gross</th><th className="k-num">Net</th><th>Flags</th></tr></thead>
                    <tbody>
                      {p.valid_rows.map((r) => (
                        <tr key={r.row_number}>
                          <td>{r.row_number}</td>
                          <td dir="auto">{r.branch}</td>
                          <td>{r.sales_line}</td>
                          <td>{r.brand}</td>
                          <td>{r.sku}</td>
                          <td><code>{r.visitor}</code></td>
                          <td><code>{r.customer}</code></td>
                          <td className="k-num">{fmt(r.gross_cartons)}</td>
                          <td className="k-num">{fmt(r.net_cartons)}</td>
                          <td>{r.flags.map((f) => <Badge key={f} status="warning" label={f.replace('_', ' ')} />)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </Remoted>
      )}
    </div>
  );
}
