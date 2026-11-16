import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ImportListItem, ImportSummary } from '../api/types';
import { navigate } from '../router';
import { Card, DemoBanner, formatDate, Remoted, StatusChip, useApi } from './ui';

/** Admin: upload an Excel workbook (stage 1 of Upload → Validate → Preview → Confirm → Process). */
export function ImportsPage() {
  const list = useApi<{ imports: ImportListItem[] }>('/api/v1/mgmt/imports');
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; existing?: string } | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const summary = await api.upload<ImportSummary>('/api/v1/mgmt/imports', form);
      navigate(`/import/${summary.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError({ message: err.message, existing: err.extra.existing_import_id as string | undefined });
      else setError({ message: 'Upload failed.' });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="k-stack">
      <DemoBanner />
      <div className="k-toolbar">
        <h1>
          Excel import <small>Upload → Validate → Preview → Confirm → Process</small>
        </h1>
      </div>

      <Card title="1 · Upload workbook">
        <p className="k-muted">
          Nothing is counted until you review the validation preview and confirm. Re-uploading the same file, or rows already imported, is refused — sales are never counted twice.
        </p>
        <div className="k-upload">
          <input ref={input} id="workbook" type="file" accept=".xlsx" hidden onChange={(e) => void upload(e.target.files?.[0])} data-testid="workbook-input" />
          <button className="btn btn--green" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Validating…' : 'Choose .xlsx workbook'}
          </button>
          <a className="btn btn--ghost" href="/api/v1/mgmt/sample-workbook" download>
            Download SAMPLE workbook
          </a>
          <a className="btn btn--ghost" href="/api/v1/mgmt/sample-workbook?variant=overlap" download>
            Download SAMPLE overlap file
          </a>
        </div>
        {error && (
          <div className="k-state k-state--error" role="alert" data-testid="upload-error">
            <p>{error.message}</p>
            {error.existing && (
              <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/import/${error.existing}`)}>
                Open the existing import
              </button>
            )}
          </div>
        )}
        <p className="k-note">
          Sheets read: <b>SalesData</b> (rows) and optional <b>Targets</b>. A sheet whose name contains <b>SAMPLE</b> marks the whole file as sample data; the real operational workbook is mapped through header aliases without changing the pipeline.
        </p>
      </Card>

      <Card title="Import history">
        <Remoted remote={list} what="imports">
          {(data) =>
            data.imports.length === 0 ? (
              <p className="k-muted">No imports yet.</p>
            ) : (
              <table className="k-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Status</th>
                    <th className="k-num">Rows</th>
                    <th className="k-num">Processed</th>
                    <th className="k-num">Rejected</th>
                    <th className="k-num">Duplicates</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.imports.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button className="k-link" onClick={() => navigate(`/import/${i.id}`)}>
                          {i.file_name}
                        </button>
                        {i.is_sample && <span className="k-chip k-chip--sample">SAMPLE</span>}
                      </td>
                      <td>
                        <StatusChip status={i.status} />
                      </td>
                      <td className="k-num">{i.counts.total}</td>
                      <td className="k-num">{i.counts.processed}</td>
                      <td className="k-num">{i.counts.rejected}</td>
                      <td className="k-num">{i.counts.duplicates}</td>
                      <td>{formatDate(i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Remoted>
      </Card>
    </div>
  );
}
