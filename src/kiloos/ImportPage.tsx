import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ImportRow, ImportSummary } from '../api/types';
import { brandName, n } from '../i18n';
import { navigate } from '../router';
import { Card, DemoBanner, formatDate, formatMoney, Remoted, StatusChip, Tile, brandColor, useApi } from './ui';

const ROW_ERRORS: Record<string, string> = {
  E_USER_MAPPING: 'کد ویزیتور در سیستم یافت نشد',
  E_DATE: 'تاریخ نامعتبر',
  E_FUTURE_DATE: 'تاریخ در آینده',
  E_QUANTITY: 'تعداد نامعتبر',
  E_SKU: 'کد کالا نامعتبر',
  E_BRAND: 'برند نامعتبر',
  E_EXTERNAL_ID: 'شناسهٔ ردیف خالی است',
  E_DUPLICATE_IN_FILE: 'تکراری در همین فایل',
  E_DUPLICATE: 'قبلاً وارد شده است',
};

function RowTable({ rows, empty }: { rows: ImportRow[]; empty: string }) {
  if (rows.length === 0) return <p className="k-muted">{empty}</p>;
  return (
    <div className="k-scroll">
      <table className="k-table k-table--dense">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>شناسه</th>
            <th>ویزیتور</th>
            <th>تاریخ</th>
            <th>برند</th>
            <th className="k-num">مبلغ</th>
            <th>نتیجه</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row_number}>
              <td>{n(r.row_number)}</td>
              <td dir="ltr">{r.external_id || '—'}</td>
              <td dir="ltr">{r.user_external_id}</td>
              <td dir="ltr">{r.sale_date ?? '—'}</td>
              <td>{r.brand_code ? brandName(r.brand_code) : '—'}</td>
              <td className="k-num">{r.amount ? n(Number(r.amount)) : '—'}</td>
              <td>
                <StatusChip status={r.status} /> {r.error && <small className="k-muted">{(r.error_code && ROW_ERRORS[r.error_code]) || r.error}</small>}
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
      setError(err instanceof ApiError ? err.message : 'پردازش ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Remoted remote={remote} what="ورود اطلاعات">
      {(loaded) => {
        const data = override ?? loaded;
        const done = data.status === 'completed';
        return (
          <div className="k-stack">
            <DemoBanner />
            <div className="k-toolbar">
              <div>
                <button className="k-link" onClick={() => navigate('/imports')}>
                  → همهٔ ورودها
                </button>
                <h1>
                  {data.file_name} <StatusChip status={data.status} />
                  {data.is_sample && <span className="k-chip k-chip--sample">داده نمونه</span>}
                </h1>
                <p className="k-muted">بارگذاری‌شده در {formatDate(data.created_at)}</p>
              </div>
            </div>

            <div className="k-tiles" data-testid="import-counts">
              <Tile label="ردیف‌های فایل" value={n(data.counts.total)} />
              <Tile label="ردیف‌های معتبر" value={n(data.counts.valid)} sub={done ? `${n(data.counts.processed)} پردازش‌شده` : `${n(data.counts.pending)} در انتظار تأیید`} tone="good" />
              <Tile label="ردیف‌های ردشده" value={n(data.counts.rejected)} sub="مشکل داده؛ کنار گذاشته شد" tone={data.counts.rejected ? 'bad' : undefined} />
              <Tile label="ردیف‌های تکراری" value={n(data.counts.duplicates)} sub="قبلاً شمرده شده؛ کنار گذاشته شد" tone={data.counts.duplicates ? 'warn' : undefined} />
            </div>

            <div className="k-grid2">
              <Card title="فروش ردیف‌های معتبر">
                <p className="k-bigmoney">
                  {formatMoney(data.totals.amount)} <small>ریال · {n(data.totals.records)} ردیف</small>
                </p>
                <table className="k-table">
                  <thead>
                    <tr>
                      <th>برند</th>
                      <th className="k-num">ردیف</th>
                      <th className="k-num">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.brands.map((b) => (
                      <tr key={b.brand}>
                        <td>
                          <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                          {brandName(b.brand)}
                        </td>
                        <td className="k-num">{n(b.records)}</td>
                        <td className="k-num">{formatMoney(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.targets.rows > 0 && (
                  <p className="k-note">
                    برگهٔ اهداف: {n(data.targets.valid)} معتبر · {n(data.targets.invalid)} ردشده
                    {data.target_issues.map((t) => (
                      <span key={t.row_number} className="k-issue">
                        {' '}
                        ردیف {n(t.row_number)} ({t.user_external_id}/{t.brand_code}): {t.error_message}
                      </span>
                    ))}
                  </p>
                )}
              </Card>

              <Card title="تأیید و پردازش">
                {done ? (
                  <div data-testid="import-done">
                    <p>
                      <b>پردازش شد.</b> {n(data.counts.processed)} ردیف فروش اکنون در داشبوردها شمرده می‌شود
                      {result ? `؛ ${n(result.created)} رویداد امتیاز سازمانی به دفتر ثبت افزوده شد` : ''}.
                    </p>
                    <p className={data.reconciliation.rows_ok && data.reconciliation.points_ok ? 'k-ok' : 'k-bad'}>
                      تطبیق: ردیف‌ها {data.reconciliation.rows_ok ? 'مطابق' : 'مغایر'} · امتیازها {data.reconciliation.points_ok ? 'مطابق' : 'مغایر'} ({n(data.reconciliation.scored_points)} دفتر ثبت / {n(data.reconciliation.points_sum)} فایل)
                    </p>
                    <button className="btn btn--green" onClick={() => navigate('/')}>
                      رفتن به داشبورد مدیریت
                    </button>
                  </div>
                ) : (
                  <>
                    <p>
                      پیش‌نمایش را بررسی کنید. با تأیید، <b>{n(data.counts.pending)}</b> ردیف معتبر شمرده می‌شود، <b>{n(data.targets.valid)}</b> هدف اعمال می‌شود و امتیازهای سازمانی نمونه در دفتر ثبت می‌شود. ردیف‌های ردشده و تکراری هرگز شمرده نمی‌شوند و تأیید دوباره امتیاز را دوبار نمی‌شمارد.
                    </p>
                    <button className="btn btn--yellow btn--lg" disabled={!data.can_process || busy} onClick={() => void process()} data-testid="process-import">
                      {busy ? 'در حال پردازش…' : `تأیید و پردازش ${n(data.counts.pending)} ردیف`}
                    </button>
                    {!data.can_process && <p className="k-muted">چیزی برای پردازش باقی نمانده است.</p>}
                  </>
                )}
                {error && (
                  <div className="k-state k-state--error" role="alert">
                    <p>{error}</p>
                  </div>
                )}
              </Card>
            </div>

            <Card title={`ردیف‌های ردشده و تکراری (${n(data.problem_rows.length)}${data.problem_rows.length >= 60 ? '+' : ''})`}>
              <RowTable rows={data.problem_rows} empty="ردیف ردشده یا تکراری وجود ندارد." />
            </Card>
            <Card title="پیش‌نمایش ردیف‌های معتبر (۱۵ ردیف اول)">
              <RowTable rows={data.sample_rows} empty="ردیف معتبری وجود ندارد." />
            </Card>
          </div>
        );
      }}
    </Remoted>
  );
}
