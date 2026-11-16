import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ImportListItem, ImportSummary } from '../api/types';
import { n } from '../i18n';
import { navigate } from '../router';
import { Card, DemoBanner, EmptyState, formatDate, Remoted, StatusChip, useApi } from './ui';

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
      else setError({ message: 'بارگذاری فایل ناموفق بود.' });
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
          مرکز ورود و بررسی اطلاعات <small>بارگذاری ← اعتبارسنجی ← پیش‌نمایش ← تأیید ← پردازش</small>
        </h1>
      </div>

      <Card title="۱ · بارگذاری فایل اکسل">
        <p className="k-muted">
          تا زمانی که پیش‌نمایش اعتبارسنجی را بررسی و تأیید نکنید، هیچ ردیفی محاسبه نمی‌شود. بارگذاری دوبارهٔ همان فایل یا ردیف‌های قبلاً واردشده پذیرفته نمی‌شود؛ فروش هرگز دوبار شمرده نمی‌شود.
        </p>
        <div className="k-upload">
          <input ref={input} id="workbook" type="file" accept=".xlsx" hidden onChange={(e) => void upload(e.target.files?.[0])} data-testid="workbook-input" />
          <button className="btn btn--green" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'در حال اعتبارسنجی…' : 'انتخاب فایل اکسل (xlsx)'}
          </button>
          <a className="btn btn--ghost" href="/api/v1/mgmt/sample-workbook" download>
            دریافت فایل نمونه
          </a>
          <a className="btn btn--ghost" href="/api/v1/mgmt/sample-workbook?variant=overlap" download>
            دریافت فایل نمونهٔ هم‌پوشان
          </a>
        </div>
        {error && (
          <div className="k-state k-state--error" role="alert" data-testid="upload-error">
            <p>{error.message}</p>
            {error.existing && (
              <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/import/${error.existing}`)}>
                مشاهدهٔ ورود اطلاعات قبلی
              </button>
            )}
          </div>
        )}
        <p className="k-note">
          برگه‌های خوانده‌شده: <b>SalesData</b> (ردیف‌های فروش) و در صورت وجود <b>Targets</b> (اهداف). اگر نام یک برگه شامل <b>SAMPLE</b> باشد، کل فایل «نمونه» شناخته می‌شود.
        </p>
      </Card>

      <Card title="تاریخچهٔ ورود اطلاعات">
        <Remoted remote={list} what="فهرست ورودها">
          {(data) =>
            data.imports.length === 0 ? (
              <EmptyState>هنوز فایلی وارد نشده است.</EmptyState>
            ) : (
              <table className="k-table">
                <thead>
                  <tr>
                    <th>فایل</th>
                    <th>وضعیت</th>
                    <th className="k-num">ردیف‌ها</th>
                    <th className="k-num">پردازش‌شده</th>
                    <th className="k-num">ردشده</th>
                    <th className="k-num">تکراری</th>
                    <th>زمان</th>
                  </tr>
                </thead>
                <tbody>
                  {data.imports.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button className="k-link" onClick={() => navigate(`/import/${i.id}`)}>
                          {i.file_name}
                        </button>
                        {i.is_sample && <span className="k-chip k-chip--sample">نمونه</span>}
                      </td>
                      <td>
                        <StatusChip status={i.status} />
                      </td>
                      <td className="k-num">{n(i.counts.total)}</td>
                      <td className="k-num">{n(i.counts.processed)}</td>
                      <td className="k-num">{n(i.counts.rejected)}</td>
                      <td className="k-num">{n(i.counts.duplicates)}</td>
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
