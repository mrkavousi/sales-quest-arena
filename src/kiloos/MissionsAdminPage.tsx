import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { n } from '../i18n';
import { Card, DemoBanner, EmptyState, Remoted, useApi } from './ui';

interface AdminMission {
  id: string;
  title: string;
  description: string;
  category: string;
  kind: string | null;
  xp_reward: number;
  is_custom: boolean;
  is_sales: boolean;
  status: 'active' | 'inactive';
  scope: 'all' | 'branch' | 'team' | 'user';
  scope_value: string | null;
  players_completed: number;
  completions: number;
}

interface MissionsResponse {
  missions: AdminMission[];
  branches: { code: string; name: string }[];
  teams: { id: string; name: string }[];
  visitors: { id: string; name: string; code: string }[];
  categories: Record<string, string>;
  kinds: string[];
}

const KIND_FA: Record<string, string> = {
  daily: 'مأموریت روزانه',
  weekly: 'مأموریت هفتگی',
  sales: 'چالش فروش',
  product: 'چالش معرفی محصول',
  coverage: 'چالش پوشش مشتری',
  streak: 'چالش استمرار فعالیت',
  team: 'چالش تیمی',
};
const SCOPE_FA: Record<string, string> = { all: 'همهٔ ویزیتورها', branch: 'یک شعبه', team: 'یک تیم', user: 'یک ویزیتور' };
const BRANCH_FA: Record<string, string> = { 'BR-TEH': 'شعبه تهران', 'BR-ISF': 'شعبه اصفهان' };

function scopeOptions(data: MissionsResponse, scope: string): { value: string; label: string }[] {
  if (scope === 'branch') return data.branches.map((b) => ({ value: b.code, label: BRANCH_FA[b.code] ?? b.name }));
  if (scope === 'team') return data.teams.map((t) => ({ value: t.id, label: `تیم ${t.name}` }));
  if (scope === 'user') return data.visitors.map((v) => ({ value: v.id, label: `${v.name} · ${v.code}` }));
  return [];
}

/** ۵ · Missions and challenges: activate, assign and create. The server decides what visitors see. */
export function MissionsAdminPage() {
  const remote = useApi<MissionsResponse>('/api/v1/mgmt/missions');
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'customer_visit', kind: 'daily', xp_reward: 80, scope: 'all', scope_value: '' });

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'ok', text: success });
      remote.reload();
    } catch (err) {
      setMessage({ tone: 'bad', text: err instanceof ApiError ? err.message : 'عملیات انجام نشد.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Remoted remote={remote} what="مأموریت‌ها">
      {(data) => {
        const options = scopeOptions(data, form.scope);
        return (
          <div className="k-stack">
            <DemoBanner />
            <div className="k-toolbar">
              <h1>
                مأموریت‌ها و چالش‌ها <small>فعال‌سازی، اختصاص و ساخت مأموریت</small>
              </h1>
            </div>
            {message && (
              <div className={`k-state ${message.tone === 'bad' ? 'k-state--error' : 'k-state--ok'}`} role={message.tone === 'bad' ? 'alert' : 'status'} data-testid="mission-message">
                <p>{message.text}</p>
              </div>
            )}

            <Card title="ساخت مأموریت جدید">
              <form
                className="adm-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      api.post('/api/v1/mgmt/missions', {
                        ...form,
                        scope_value: form.scope === 'all' ? null : form.scope_value,
                      }),
                    'مأموریت ساخته و برای ویزیتورها فعال شد.',
                  ).then(() => setForm((f) => ({ ...f, title: '', description: '' })));
                }}
              >
                <label>
                  عنوان
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} maxLength={60} data-testid="new-title" />
                </label>
                <label className="adm-form__wide">
                  شرح
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={5} maxLength={240} data-testid="new-description" />
                </label>
                <label>
                  نوع
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    {data.kinds.map((k) => (
                      <option key={k} value={k}>
                        {KIND_FA[k] ?? k}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  دسته
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(data.categories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  امتیاز تجربه
                  <input type="number" min={10} max={500} value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })} />
                </label>
                <label>
                  اختصاص به
                  <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value, scope_value: '' })} data-testid="new-scope">
                    {Object.entries(SCOPE_FA).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {form.scope !== 'all' && (
                  <label>
                    مقصد
                    <select value={form.scope_value} onChange={(e) => setForm({ ...form, scope_value: e.target.value })} required data-testid="new-scope-value">
                      <option value="">انتخاب کنید…</option>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="adm-form__actions">
                  <button className="btn btn--green" type="submit" disabled={busy} data-testid="create-mission">
                    ساخت و فعال‌سازی
                  </button>
                  <small className="k-muted">پاداش فقط امتیاز تجربهٔ بازی است؛ هیچ پاداش مالی یا امتیاز سازمانی ثبت نمی‌شود.</small>
                </div>
              </form>
            </Card>

            <Card title="مأموریت‌ها و چالش‌های موجود">
              {data.missions.length === 0 ? (
                <EmptyState>مأموریتی ثبت نشده است.</EmptyState>
              ) : (
                <div className="k-scroll">
                  <table className="k-table" data-testid="missions-table">
                    <thead>
                      <tr>
                        <th>مأموریت</th>
                        <th>نوع / دسته</th>
                        <th className="k-num">پاداش</th>
                        <th>اختصاص</th>
                        <th className="k-num">پیشرفت</th>
                        <th>وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.missions.map((m) => (
                        <tr key={m.id} data-testid={`mission-${m.id}`}>
                          <td>
                            <b>{m.title}</b>
                            {m.is_custom && <span className="k-chip k-chip--sample">جدید</span>}
                            <small className="k-muted">{m.description}</small>
                          </td>
                          <td>
                            {m.kind ? KIND_FA[m.kind] : m.is_sales ? KIND_FA.sales : 'مأموریت پایه'}
                            <small className="k-muted">{data.categories[m.category] ?? m.category}</small>
                          </td>
                          <td className="k-num">{n(m.xp_reward)} امتیاز</td>
                          <td>
                            <select
                              value={m.scope}
                              disabled={busy || m.is_sales}
                              aria-label={`اختصاص ${m.title}`}
                              onChange={(e) => {
                                const scope = e.target.value;
                                if (scope === 'all') void run(() => api.patch(`/api/v1/mgmt/missions/${m.id}`, { scope, scope_value: null }), 'اختصاص به‌روز شد.');
                                else setForm({ ...form, scope });
                              }}
                            >
                              {Object.entries(SCOPE_FA).map(([key, label]) => (
                                <option key={key} value={key} disabled={key !== 'all' && key !== m.scope}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="k-num">
                            {n(m.players_completed)} ویزیتور · {n(m.completions)} بار
                          </td>
                          <td>
                            <button
                              className={`btn btn--sm ${m.status === 'active' ? 'btn--green' : 'btn--ghost'}`}
                              disabled={busy}
                              aria-pressed={m.status === 'active'}
                              data-testid={`toggle-${m.id}`}
                              onClick={() => void run(() => api.patch(`/api/v1/mgmt/missions/${m.id}`, { status: m.status === 'active' ? 'inactive' : 'active' }), m.status === 'active' ? 'مأموریت غیرفعال شد.' : 'مأموریت فعال شد.')}
                            >
                              {m.status === 'active' ? 'فعال' : 'غیرفعال'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="k-note">تغییرات بلافاصله در پنل بازی ویزیتورها اعمال می‌شود. مأموریت غیرفعال یا اختصاص‌نیافته را سرور نمی‌پذیرد، حتی اگر مرورگر درخواست بفرستد.</p>
            </Card>
          </div>
        );
      }}
    </Remoted>
  );
}
