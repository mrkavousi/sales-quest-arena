import { Fragment, useState } from 'react';
import { api, ApiError } from '../api/client';
import { AttainmentBar, Card, ErrorState, Remoted, Tile, useApi } from '../kiloos/ui';
import { Badge, fmt, fmtPct } from './badges';
import type { CalcResult, Check, Decision, Mappings, RiBatch, Rule, Run, Summary, TraceInputs } from './types';

/* ----------------------------------------------------------------------------- mappings */
export function MappingsPanel({ batch }: { batch: RiBatch }) {
  const remote = useApi<Mappings>(batch.status === 'inspected' ? null : `/api/v1/ri/batches/${batch.id}/mappings`);
  if (batch.status === 'inspected') return <Card title="Organizational mappings"><p className="k-muted">Validate the batch first.</p></Card>;
  return (
    <Remoted remote={remote} what="mappings">
      {(m) => (
        <div className="k-stack">
          <p className="k-note"><Badge status="UNCONFIRMED" /> {m.status_note}</p>
          <Card title={`Unresolved and informational mappings (${m.issues.length})`}>
            <div className="k-scroll">
              <table className="k-table k-table--dense">
                <thead><tr><th>Severity</th><th>Issue</th><th>Entity (pseudonym / code)</th><th>Detail</th></tr></thead>
                <tbody>
                  {m.issues.map((i) => (
                    <tr key={`${i.type}-${i.entity}`}>
                      <td><Badge status={i.severity === 'info' ? 'UNCONFIRMED' : 'warning'} label={i.severity} /></td>
                      <td>{i.label}</td>
                      <td><code dir="auto">{i.entity}</code></td>
                      <td><small>{Object.entries(i.detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="k-grid2">
            <Card title="Branch-group definitions (all UNCONFIRMED — BD-02)">
              {m.branch_group_schemes.length === 0 ? <p className="k-muted">No branch-group sheet in this workbook.</p> : m.branch_group_schemes.map((s) => (
                <details key={s.code} className="ri-details">
                  <summary>{s.title} <Badge status={s.status} /> <small>{s.members.length} branches</small></summary>
                  <p className="k-note">{s.source}</p>
                  <p dir="auto">{s.members.map((x) => `${x.branch} → ${x.group}`).join(' · ')}</p>
                </details>
              ))}
            </Card>
            <Card title="Customer groups → main group (UNCONFIRMED — BD-14)">
              <table className="k-table k-table--dense">
                <thead><tr><th>Customer group</th><th>Main group</th></tr></thead>
                <tbody>
                  {m.customer_groups.map((g) => (
                    <tr key={g.source_value}><td dir="auto">{g.source_value}</td><td>{g.main_group ?? <Badge status="warning" label="unmapped" />}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
          <Card title="Employees and visitor assignments (separate entities)">
            {m.roster && (
              <p className="k-note">
                {m.roster.assignments} visitor assignments · {m.roster.employees} employees · <b>{m.roster.employees_with_multiple_assignments}</b> employees own several visitor codes · {m.roster.without_employee} assignments without a usable personnel code.
              </p>
            )}
            <div className="k-scroll">
              <table className="k-table k-table--dense">
                <thead><tr><th>Employee</th><th>Visitor assignment</th><th>Type</th><th>Branch</th><th>Line</th></tr></thead>
                <tbody>
                  {m.assignments.slice(0, 60).map((a) => (
                    <tr key={a.visitor}>
                      <td><code>{a.employee ?? '—'}</code></td><td><code>{a.visitor}</code></td><td>{a.seller_type ?? '—'}</td><td dir="auto">{a.branch}</td><td>{a.sales_line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="k-note">First 60 of {m.assignments.length} shown. Personnel codes are not unique per visitor: the visitor assignment is the unit.</p>
          </Card>
        </div>
      )}
    </Remoted>
  );
}

/* ------------------------------------------------------------------------ rules and runs */
export function RulesRunsPanel({ batch }: { batch: RiBatch }) {
  const rules = useApi<{ rules: Rule[]; note: string }>('/api/v1/ri/rules');
  const runs = useApi<{ runs: Run[] }>(batch.status === 'confirmed' ? `/api/v1/ri/batches/${batch.id}/runs` : null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const start = async (ruleId: number) => {
    setBusy(ruleId);
    setError(null);
    try {
      const out = await api.post<{ run: Run; replayed: boolean }>(`/api/v1/ri/batches/${batch.id}/runs`, { rule_set_id: ruleId });
      runs.reload();
      setOpen(out.run.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The run failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="k-stack">
      <Card title="Rule sets (versioned, immutable, never APPROVED here)">
        <Remoted remote={rules} what="rules">
          {({ rules: list, note }) => (
            <>
              <p className="k-note">{note}</p>
              <div className="k-scroll">
                <table className="k-table">
                  <thead><tr><th>Rule</th><th>Level</th><th>Brand</th><th>Status</th><th>Ladder thresholds</th><th /></tr></thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id}>
                        <td><b>{r.code}</b> <small>v{r.version}</small><br /><small className="k-muted">{r.notes}</small></td>
                        <td>{r.org_level.replace('_', ' ')}</td>
                        <td>{r.brand.toUpperCase()}</td>
                        <td><Badge status={r.status} /></td>
                        <td>{r.params.thresholds.map((t) => `≥ ${t}`).join(' · ')}<br /><small className="k-muted">step amounts: from the workbook, per row (UNCONFIRMED)</small></td>
                        <td>
                          <button className="btn btn--yellow btn--sm" disabled={batch.status !== 'confirmed' || busy !== null} onClick={() => void start(r.id)} title={batch.status === 'confirmed' ? '' : 'Confirm the import first'} data-testid={`ri-run-${r.id}`}>
                            {busy === r.id ? 'Calculating…' : 'Run on this batch'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Remoted>
        {error && <ErrorState message={error} />}
      </Card>

      <Card title="Calculation run history">
        {batch.status !== 'confirmed' ? <p className="k-muted">Confirm the import to run calculations.</p> : (
          <Remoted remote={runs} what="runs">
            {({ runs: list }) => list.length === 0 ? <p className="k-muted">No run yet.</p> : (
              <div className="k-scroll">
                <table className="k-table">
                  <thead><tr><th>Run</th><th>Rule</th><th>Brand · level</th><th>Basis</th><th className="k-num">Results</th><th className="k-num">Σ input</th><th className="k-num">Σ target</th><th className="k-num">Σ indicative reward</th><th /></tr></thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className={open === r.id ? 'is-open' : ''}>
                        <td><code>{r.id.slice(0, 8)}</code></td>
                        <td>{r.rule.code} v{r.rule.version} <Badge status={r.rule.status} /></td>
                        <td>{r.brand.toUpperCase()} · {r.org_level.replace('_', ' ')}</td>
                        <td><small>{r.input_basis}</small></td>
                        <td className="k-num">{r.result_count}{r.error_count > 0 && <> <Badge status="calc_error" label={`${r.error_count} error`} /></>}</td>
                        <td className="k-num">{fmt(r.totals.input_cartons)}</td>
                        <td className="k-num">{fmt(r.totals.target_cartons)}</td>
                        <td className="k-num">{fmt(r.totals.indicative_reward_rials, 0)}</td>
                        <td><button className="btn btn--ghost btn--sm" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide' : 'Results & trace'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Remoted>
        )}
      </Card>
      {open && <RunDetail key={open} runId={open} />}
    </div>
  );
}

function RunDetail({ runId }: { runId: string }) {
  const remote = useApi<{ run: Run; results: CalcResult[]; reconciliation: Check[] }>(`/api/v1/ri/runs/${runId}`);
  const [trace, setTrace] = useState<number | null>(null);
  return (
    <Remoted remote={remote} what="run">
      {({ run, results, reconciliation }) => (
        <Card title={`Run ${run.id.slice(0, 8)} — ${run.brand.toUpperCase()} ${run.org_level.replace('_', ' ')} · rule ${run.rule.code} v${run.rule.version}`} action={<Badge status={run.rule.status} title="Rule approval status" />}>
          <p className="k-note">Import batch <code>{run.batch_id.slice(0, 8)}</code> · basis {run.input_basis} · indicative rewards are not payment instructions.</p>
          <div className="k-tiles">
            {reconciliation.map((c) => (
              <Tile key={c.check_code} label={c.check_code} value={<Badge status={c.status} />} sub={`${c.matched ?? 0} matched · ${c.missing ?? 0} missing`} tone={c.status === 'match' ? 'good' : 'warn'} />
            ))}
          </div>
          <div className="k-scroll">
            <table className="k-table k-table--dense">
              <thead><tr><th>Entity (branch · line)</th><th className="k-num">Input cartons</th><th className="k-num">Target</th><th className="k-num">Achievement</th><th className="k-num">Indicative reward</th><th>Status</th><th /></tr></thead>
              <tbody>
                {results.map((r) => (
                  <ResultRow key={r.id} r={r} open={trace === r.id} onToggle={() => setTrace(trace === r.id ? null : r.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Remoted>
  );
}

function ResultRow({ r, open, onToggle }: { r: CalcResult; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr>
        <td dir="auto">{r.entity}</td>
        <td className="k-num">{fmt(r.input_quantity)}</td>
        <td className="k-num">{fmt(r.target)} <Badge status="UNCONFIRMED" label="unconfirmed" title="Target taken from the workbook, owner unknown" /></td>
        <td className="k-num">{fmtPct(r.achievement)}</td>
        <td className="k-num">{fmt(r.reward_rials, 0)}</td>
        <td>{r.result_status === 'error' ? <Badge status="calc_error" title={r.error ?? ''} /> : <Badge status={r.rule_status} />}</td>
        <td><button className="btn btn--ghost btn--sm" onClick={onToggle}>{open ? 'Close' : 'Trace'}</button></td>
      </tr>
      {open && (
        <tr><td colSpan={7}><Trace result={r} /></td></tr>
      )}
    </>
  );
}

function Trace({ result }: { result: CalcResult }) {
  const [offset, setOffset] = useState(0);
  const remote = useApi<TraceInputs>(`/api/v1/ri/results/${result.id}/inputs?limit=25&offset=${offset}`);
  return (
    <div className="ri-trace">
      <p><b>Traceability.</b> Run <code>{result.run_id.slice(0, 8)}</code> · import batch <code>{result.import_batch_id.slice(0, 8)}</code> · rule set {result.rule_set_id} <b>version {result.rule_version}</b> <Badge status={result.rule_status} /> · period {result.period.year}/{String(result.period.month).padStart(2, '0')} (Jalali) · calculated {result.calculated_at}</p>
      {result.error && <ErrorState message={result.error} />}
      <pre className="ri-explain">{JSON.stringify(result.explain, null, 2)}</pre>
      <Remoted remote={remote} what="input records">
        {(t) => (
          <>
            <p className="k-note">{t.total} input records. Showing {t.inputs.length ? t.offset + 1 : 0}–{t.offset + t.inputs.length}.</p>
            <div className="k-scroll">
              <table className="k-table k-table--dense">
                <thead><tr><th>Sheet · row</th><th>Branch</th><th>Line</th><th>SKU</th><th>Visitor</th><th>Customer</th><th className="k-num">Net cartons</th><th>Flags</th></tr></thead>
                <tbody>
                  {t.inputs.map((i) => (
                    <tr key={i.fact_id}>
                      <td dir="auto">{i.source_sheet} · {i.row_number}</td><td dir="auto">{i.branch}</td><td>{i.sales_line}</td><td>{i.sku}</td>
                      <td><code>{i.visitor}</code></td><td><code>{i.customer}</code></td><td className="k-num">{fmt(i.net_cartons)}</td>
                      <td>{i.flags.map((f) => <Badge key={f} status="warning" label={f.replace('_', ' ')} />)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ri-actions">
              <button className="btn btn--ghost btn--sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous</button>
              <button className="btn btn--ghost btn--sm" disabled={offset + 25 >= t.total} onClick={() => setOffset(offset + 25)}>Next</button>
            </div>
          </>
        )}
      </Remoted>
    </div>
  );
}

/* ------------------------------------------------------------------------ reconciliation */
export function ReconciliationPanel({ batch }: { batch: RiBatch }) {
  const remote = useApi<{ checks: Check[]; overall: Check['status']; claim: string }>(batch.status === 'inspected' ? null : `/api/v1/ri/batches/${batch.id}/reconciliation`);
  if (batch.status === 'inspected') return <Card title="Reconciliation"><p className="k-muted">Validate the batch first.</p></Card>;
  return (
    <Remoted remote={remote} what="reconciliation">
      {({ checks, overall, claim }) => (
        <div className="k-stack">
          <div className={`ri-claim ri-claim--${overall}`} role="status">
            <Badge status={overall} /> <span>{claim}</span>
          </div>
          <CheckTable title="Import level — base sheet vs derived sheet, completeness, mappings" checks={checks.filter((c) => c.run_id === null)} />
          <CheckTable title="Calculation level — prototype vs workbook-reported figures" checks={checks.filter((c) => c.run_id !== null)} empty="Run a calculation (Rules & runs tab) to compare with the workbook's reported figures." />
        </div>
      )}
    </Remoted>
  );
}

function CheckTable({ title, checks, empty }: { title: string; checks: Check[]; empty?: string }) {
  return (
    <Card title={title}>
      {checks.length === 0 ? <p className="k-muted">{empty ?? 'No checks.'}</p> : (
        <div className="k-scroll">
          <table className="k-table k-table--dense">
            <thead>
              <tr><th>Check</th><th className="k-num">Workbook reference</th><th className="k-num">Prototype</th><th className="k-num">Abs. variance</th><th className="k-num">% variance</th><th className="k-num">Matched</th><th className="k-num">Missing</th><th className="k-num">Duplicates</th><th className="k-num">Unresolved</th><th>Status</th></tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <Fragment key={`${c.run_id}-${c.check_code}`}>
                  <tr>
                    <td><b>{c.check_code}</b><br /><small>{c.title}</small></td>
                    <td className="k-num">{fmt(c.reference_value)}</td>
                    <td className="k-num">{fmt(c.prototype_value)}</td>
                    <td className="k-num">{fmt(c.abs_variance)}</td>
                    <td className="k-num">{c.pct_variance === null ? '—' : `${fmt(c.pct_variance, 4)}%`}</td>
                    <td className="k-num">{c.matched ?? '—'}</td>
                    <td className="k-num">{c.missing ?? '—'}</td>
                    <td className="k-num">{c.duplicates ?? '—'}</td>
                    <td className="k-num">{c.unresolved ?? '—'}</td>
                    <td><Badge status={c.status} /></td>
                  </tr>
                  <tr className="ri-why">
                    <td colSpan={10}>
                      <small>{c.explanation}</small>
                      {c.check_code === 'IMP-NET' && <small> · {String(c.detail.differing_keys)} business keys differ, {String(c.detail.explained_by_rounding)} verified as rounding ({String(c.detail.rounding_mode).replace(/_/g, ' ')}), {String(c.detail.unexplained)} unexplained.</small>}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------------------------- summary */
export function SummaryPanel({ batch }: { batch: RiBatch }) {
  const remote = useApi<Summary>(batch.status === 'inspected' ? null : `/api/v1/ri/batches/${batch.id}/summary`);
  if (batch.status === 'inspected') return <Card title="Summary"><p className="k-muted">Validate the batch first.</p></Card>;
  return (
    <Remoted remote={remote} what="summary">
      {(s) => (
        <div className="k-stack">
          <p className="k-note">Net cartons on <b>{s.basis}</b>. Cartons are never converted to Rials. Rewards are indicative, PROPOSED, and not paid.</p>
          {s.brands.map((b) => (
            <Card key={b.brand} title={`${b.brand.toUpperCase()} — ${fmt(b.net_cartons)} net cartons · ${b.rows.toLocaleString('en-US')} rows`}>
              {b.levels.length === 0 ? <p className="k-muted">No calculation for this brand yet (Rules & runs tab).</p> : (
                <div className="k-scroll">
                  <table className="k-table">
                    <thead><tr><th>Organizational level</th><th>Rule</th><th className="k-num">Entities</th><th className="k-num">Σ input</th><th className="k-num">Σ target</th><th>Achievement</th><th className="k-num">Σ indicative reward</th></tr></thead>
                    <tbody>
                      {b.levels.map((l) => {
                        const input = Number(l.input_cartons);
                        const target = Number(l.target_cartons);
                        return (
                          <tr key={l.run_id}>
                            <td>{l.org_level.replace('_', ' ')}</td>
                            <td>{l.rule.code} v{l.rule.version} <Badge status={l.rule.status} /></td>
                            <td className="k-num">{l.results}{l.errors > 0 && <> <Badge status="calc_error" label={`${l.errors} error`} /></>}</td>
                            <td className="k-num">{fmt(l.input_cartons)}</td>
                            <td className="k-num">{fmt(l.target_cartons)} <Badge status="UNCONFIRMED" label="unconfirmed" /></td>
                            <td><AttainmentBar pct={target > 0 ? (input / target) * 100 : null} /></td>
                            <td className="k-num">{fmt(l.indicative_reward_rials, 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Remoted>
  );
}

/* --------------------------------------------------------------------------- decisions */
export function DecisionsPanel() {
  const remote = useApi<{ decisions: Decision[]; note: string }>('/api/v1/ri/decisions');
  return (
    <Card title="Business Decision Register">
      <Remoted remote={remote} what="decision register">
        {({ decisions, note }) => (
          <>
            <p className="k-note">{note}</p>
            <div className="k-scroll">
              <table className="k-table k-table--dense">
                <thead><tr><th>ID</th><th>Question</th><th>Current assumption</th><th>Impact</th><th>Status</th><th>Required approver</th></tr></thead>
                <tbody>
                  {decisions.map((d) => (
                    <tr key={d.id}>
                      <td><b>{d.id}</b></td><td>{d.question}</td><td>{d.assumption ?? '—'}</td><td>{d.impact}</td><td><Badge status={d.status} /></td><td>{d.approver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Remoted>
    </Card>
  );
}
