import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import { Card, formatDate, Remoted, useApi } from '../kiloos/ui';
import { navigate } from '../router';
import { Badge, Legend, Notice } from './badges';
import { ImportTab } from './ImportTab';
import { DecisionsPanel, MappingsPanel, ReconciliationPanel, RulesRunsPanel, SummaryPanel } from './panels';
import type { Inspection, RiBatch, RiMeta, UploadResult } from './types';

const TABS = [
  { key: 'import', label: 'Import & preview' },
  { key: 'mappings', label: 'Mappings' },
  { key: 'rules', label: 'Rules & runs' },
  { key: 'recon', label: 'Reconciliation' },
  { key: 'summary', label: 'Summary' },
  { key: 'decisions', label: 'Decision register' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Real-workbook import prototype (admin only): Import → Validate → Map → Calculate → Reconcile → Summarise. */
export function RiApp({ batchId }: { batchId: string | null }) {
  return batchId ? <Workspace key={batchId} batchId={batchId} /> : <ImportCenter />;
}

function ImportCenter() {
  const meta = useApi<RiMeta>('/api/v1/ri/meta');
  const batches = useApi<{ batches: RiBatch[] }>('/api/v1/ri/batches');
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api.upload<UploadResult>('/api/v1/ri/workbooks', form);
      if (result.replayed) setNote('This exact workbook (same SHA-256) was already uploaded — opening the existing batch, nothing was duplicated.');
      navigate(`/ri/${result.batch.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="k-stack">
      <Remoted remote={meta} what="prototype status">
        {(m) => (
          <>
            <Notice>{m.notice}</Notice>
            <Legend legend={m.status_legend} />
          </>
        )}
      </Remoted>
      <div className="k-toolbar">
        <div>
          <h1>Real workbook import</h1>
          <p className="k-muted">Workbook → Import → Validation → Mapping → Calculation → Reconciliation → Dashboard</p>
        </div>
        <div className="ri-actions">
          <a className="btn btn--ghost" href="/api/v1/ri/synthetic-workbook" download>
            Download synthetic workbook
          </a>
          <button className="btn btn--yellow" disabled={busy} onClick={() => input.current?.click()} data-testid="ri-choose">
            {busy ? 'Uploading and inspecting…' : 'Choose .xlsx workbook'}
          </button>
          <input ref={input} type="file" accept=".xlsx" hidden data-testid="ri-file" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        </div>
      </div>
      <p className="k-note">
        The original file is never modified: it is stored once under its SHA-256 and every step reads that copy. Large workbooks (≈7 MB, 28 000 rows) take a few seconds. Uploading the same file again opens the existing batch.
      </p>
      {note && <div className="k-state" role="status"><p>{note}</p></div>}
      {error && <div className="k-state k-state--error" role="alert"><p>{error}</p></div>}

      <Card title="Import batches">
        <Remoted remote={batches} what="batches">
          {({ batches: list }) =>
            list.length === 0 ? (
              <div className="k-empty">
                <p>No batch yet. Download the synthetic workbook (real layout, fictional data) or choose the real workbook.</p>
              </div>
            ) : (
              <div className="k-scroll">
                <table className="k-table">
                  <thead>
                    <tr><th>File</th><th>Period (Jalali)</th><th>Data</th><th>Status</th><th className="k-num">Rows</th><th>Created</th><th /></tr>
                  </thead>
                  <tbody>
                    {list.map((b) => (
                      <tr key={b.id}>
                        <td>{b.workbook.file_name}</td>
                        <td>{b.period.label} {b.period.year}</td>
                        <td><Badge status={b.data_origin} /></td>
                        <td><Badge status={b.status} /></td>
                        <td className="k-num">{b.counts.sheets?.sales_primary?.rows_read?.toLocaleString('en-US') ?? '—'}</td>
                        <td>{formatDate(b.created_at)}</td>
                        <td><button className="btn btn--ghost btn--sm" onClick={() => navigate(`/ri/${b.id}`)}>Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Remoted>
      </Card>
      <DecisionsPanel />
    </div>
  );
}

function Workspace({ batchId }: { batchId: string }) {
  const remote = useApi<{ batch: RiBatch; inspection: Inspection }>(`/api/v1/ri/batches/${encodeURIComponent(batchId)}`);
  const [tab, setTab] = useState<TabKey>('import');
  return (
    <Remoted remote={remote} what="import batch">
      {({ batch, inspection }) => (
        <div className="k-stack">
          <Notice>
            {batch.data_origin === 'synthetic'
              ? 'SYNTHETIC fixture: fictional people, codes and numbers in the real workbook layout.'
              : 'REAL workbook, pseudonymised: employees (E-…), visitors (V-…) and customers (C-…) are shown as pseudonyms only. All rules PROPOSED, targets and mappings UNCONFIRMED.'}
          </Notice>
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate('/ri')}>← All batches</button>
              <h1>
                {batch.workbook.file_name} <Badge status={batch.status} /> <Badge status={batch.data_origin} />
              </h1>
              <p className="k-muted">
                Period {batch.period.label} {batch.period.year} (Jalali) · SHA-256 <code>{batch.workbook.sha256.slice(0, 12)}…</code> · batch <code>{batch.id.slice(0, 8)}</code>
              </p>
            </div>
          </div>
          <nav className="ri-tabs" aria-label="Batch sections">
            {TABS.map((t) => (
              <button key={t.key} className={`ri-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'page' : undefined}>
                {t.label}
              </button>
            ))}
          </nav>
          {tab === 'import' && <ImportTab batch={batch} inspection={inspection} reload={remote.reload} />}
          {tab === 'mappings' && <MappingsPanel batch={batch} />}
          {tab === 'rules' && <RulesRunsPanel batch={batch} />}
          {tab === 'recon' && <ReconciliationPanel batch={batch} />}
          {tab === 'summary' && <SummaryPanel batch={batch} />}
          {tab === 'decisions' && <DecisionsPanel />}
        </div>
      )}
    </Remoted>
  );
}
