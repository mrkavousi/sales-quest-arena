import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ImportListItem, ImportSummary } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { Card, DemoBanner, formatDate, Remoted, StatusChip, useApi } from './ui';

/** Admin: upload an Excel workbook (stage 1 of Upload → Validate → Preview → Confirm → Process). */
export function ImportsPage() {
  const { t } = useLanguage();
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
      else setError({ message: t('k.uploadFailed') });
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
          {t('k.im.title')} <small>{t('k.im.steps')}</small>
        </h1>
      </div>

      <Card title={t('k.im.step1')}>
        <p className="k-muted">{t('k.im.uploadNote')}</p>
        <div className="k-upload">
          <input ref={input} id="workbook" type="file" accept=".xlsx" hidden onChange={(e) => void upload(e.target.files?.[0])} data-testid="workbook-input" />
          <button className="btn btn--green" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t('k.im.validating') : t('k.im.choose')}
          </button>
          <a className="btn btn--ghost" href="/api/v1/mgmt/sample-workbook" download>
            {t('k.im.downloadSample')}
          </a>
          <a className="btn btn--ghost" href="/api/v1/mgmt/sample-workbook?variant=overlap" download>
            {t('k.im.downloadOverlap')}
          </a>
        </div>
        {error && (
          <div className="k-state k-state--error" role="alert" data-testid="upload-error">
            <p>{error.message}</p>
            {error.existing && (
              <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/import/${error.existing}`)}>
                {t('k.im.openExisting')}
              </button>
            )}
          </div>
        )}
        <p className="k-note">{t('k.im.sheetsNote')}</p>
      </Card>

      <Card title={t('k.im.history')}>
        <Remoted remote={list}>
          {(data) =>
            data.imports.length === 0 ? (
              <p className="k-muted">{t('k.empty.noImports')}</p>
            ) : (
              <table className="k-table">
                <thead>
                  <tr>
                    <th>{t('k.th.file')}</th>
                    <th>{t('k.th.status')}</th>
                    <th className="k-num">{t('k.th.rows')}</th>
                    <th className="k-num">{t('k.th.processed')}</th>
                    <th className="k-num">{t('k.th.rejected')}</th>
                    <th className="k-num">{t('k.th.duplicates')}</th>
                    <th>{t('k.th.when')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.imports.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button className="k-link" onClick={() => navigate(`/import/${i.id}`)}>
                          {i.file_name}
                        </button>
                        {i.is_sample && <span className="k-chip k-chip--sample">{t('k.sampleBadge')}</span>}
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
