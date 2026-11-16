import { useState } from 'react';
import type { CommandCenter, Overview } from '../api/types';
import { branchLabel, brandName, jdateTime, jperiod, n } from '../i18n';
import { navigate } from '../router';
import { AttainmentBar, Card, DemoBanner, formatMoney, OriginChips, Remoted, StatusChip, Tile, brandColor, useApi } from './ui';

/** Engagement command center: the game's health across the representatives the viewer may see. */
export function CommandCenterBand({ center }: { center: CommandCenter }) {
  const maxReps = Math.max(...center.xp_distribution.map((l) => l.reps), 1);
  return (
    <section className="cc" aria-label="مرکز فرماندهی مشارکت">
      <div className="cc__kpis">
        <div className="cc__kpi">
          <span>بازیکنان فعال ({n(center.window_days)} روز اخیر)</span>
          <b>
            {n(center.active_players)} <small>از {n(center.reps)}</small>
          </b>
        </div>
        <div className="cc__kpi">
          <span>نرخ تکمیل مأموریت‌ها</span>
          <b>{n(center.mission_completion.pct)}٪</b>
          <i style={{ width: `${center.mission_completion.pct}%` }} />
        </div>
        <div className="cc__kpi">
          <span>بازیکنانی که تجربه بازی داشته‌اند</span>
          <b>{n(center.players)}</b>
        </div>
      </div>
      <div className="cc__grid">
        <div className="cc__panel">
          <h3>توزیع سطح بازیکنان</h3>
          <ul className="cc__bars">
            {center.xp_distribution.map((level) => (
              <li key={level.level}>
                <span>
                  سطح {n(level.level)} · {levelTitle(level.level)}
                </span>
                <span className="cc__bar">
                  <i style={{ width: `${(level.reps / maxReps) * 100}%` }} />
                </span>
                <b>{n(level.reps)}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="cc__panel">
          <h3>آخرین دستاوردها</h3>
          {center.recent_achievements.length === 0 && center.recent_claims.length === 0 ? (
            <p className="k-muted">هنوز دستاوردی ثبت نشده است. وقتی ویزیتورها مأموریت انجام دهند اینجا دیده می‌شود.</p>
          ) : (
            <ul className="cc__feed">
              {center.recent_achievements.slice(0, 4).map((a, i) => (
                <li key={`a${i}`}>
                  <span aria-hidden="true">🏅</span>
                  <b dir="auto">{a.name}</b> نشان «{achievementName(a.achievement)}» را گرفت <small>{jdateTime(a.at)}</small>
                </li>
              ))}
              {center.recent_claims.slice(0, 3).map((c, i) => (
                <li key={`c${i}`}>
                  <span aria-hidden="true">🎁</span>
                  <b dir="auto">{c.name}</b> چالش هفتگی «{questName(c.quest)}» را دریافت کرد (+{n(c.xp)} امتیاز تجربه) <small>{jdateTime(c.at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="k-note">{COMMAND_NOTE}</p>
    </section>
  );
}

const COMMAND_NOTE = 'شاخص‌های مشارکت ویزیتورهای در دسترس شما، بر پایه داده‌های نمایشی بازی. این ارقام شاخص فروش نیستند و هیچ پاداشی از آن‌ها محاسبه نمی‌شود.';
const LEVELS_FA: Record<number, string> = { 1: 'تازه‌کار', 2: 'کاوشگر', 3: 'رقابت‌جو', 4: 'حرفه‌ای', 5: 'قهرمان' };
export const levelTitle = (level: number): string => LEVELS_FA[level] ?? '';
const ACHIEVEMENTS_FA: Record<string, string> = {
  'First Steps': 'اولین قدم‌ها',
  'Deal Maker': 'عقد‌کننده قرارداد',
  'Five-Star Rep': 'ویزیتور پنج‌ستاره',
  'Daily Hero': 'قهرمان روزانه',
  Storyteller: 'قصه‌گو',
  'High Five': 'پنج‌تایی',
  'On Fire': 'در اوج',
  'Rising Explorer': 'کاوشگر در حال رشد',
  Trailblazer: 'راه‌گشا',
  Champion: 'قهرمان',
};
export const achievementName = (title: string): string => ACHIEVEMENTS_FA[title] ?? title;
const QUESTS_FA: Record<string, string> = {
  'Weekly Momentum': 'شتاب هفتگی',
  'Product Champion': 'قهرمان محصول',
  'Customer Coverage': 'پوشش مشتری',
  'Consistency Streak': 'استمرار فعالیت',
};
export const questName = (title: string): string => QUESTS_FA[title] ?? title;

/** Management dashboard: totals, brand split, branches, supervisors, representatives and engagement. */
export function OverviewPage() {
  const [period, setPeriod] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const query = new URLSearchParams();
  if (period) query.set('period', period);
  if (brand) query.set('brand', brand);
  if (branch) query.set('branch', branch);
  const remote = useApi<Overview>(`/api/v1/mgmt/overview${query.toString() ? `?${query.toString()}` : ''}`);

  return (
    <Remoted remote={remote} what="داشبورد">
      {(data) => (
        <div className="k-stack">
          <DemoBanner notice={data.notice} />
          <div className="k-toolbar">
            <h1>
              داشبورد مدیریت <small>{data.viewer.branch_name ? branchLabel(data.viewer.branch_code, data.viewer.branch_name) : 'کل سازمان'}</small>
            </h1>
            <div className="k-filters">
              <label>
                دوره
                <select value={period || data.period || ''} onChange={(e) => setPeriod(e.target.value)} disabled={data.periods.length === 0} aria-label="دوره">
                  {data.periods.map((p) => (
                    <option key={p} value={p}>
                      {jperiod(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                برند
                <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="برند">
                  <option value="">همه برندها</option>
                  <option value="EFES">افس</option>
                  <option value="MATADOR">ماتادور</option>
                </select>
              </label>
              <label>
                شعبه
                <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="شعبه">
                  <option value="">همه شعبه‌های قابل مشاهده</option>
                  {data.branches.map((b) => (
                    <option key={b.code} value={b.code}>
                      {branchLabel(b.code, b.name)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {data.empty || !data.totals ? (
            <Card>
              <div className="k-empty">
                <h2>هنوز فروش پردازش‌شده‌ای وجود ندارد</h2>
                <p>فایل اکسل فروش را بارگذاری و پردازش کنید تا داشبوردها پر شوند.</p>
                {data.viewer.position === 'admin' ? (
                  <button className="btn btn--green" onClick={() => navigate('/imports')}>
                    رفتن به مرکز ورود اطلاعات
                  </button>
                ) : (
                  <p className="k-muted">از مدیر کل بخواهید فایل فروش را وارد کند.</p>
                )}
              </div>
            </Card>
          ) : (
            <>
              {data.command_center && <CommandCenterBand center={data.command_center} />}
              <div className="k-tiles">
                <Tile label={`فروش · ${jperiod(data.period)}`} value={formatMoney(data.totals.amount)} sub="ریال، فروش پردازش‌شده" />
                <Tile label="هدف فروش" value={formatMoney(data.totals.target)} sub={<AttainmentBar pct={data.totals.attainment_pct} label="تحقق کل" />} />
                <Tile label="ویزیتورها" value={n(data.totals.reps)} sub={`${n(data.command_center?.players ?? 0)} نفر تجربه بازی داشته‌اند`} />
                <Tile label="امتیاز سازمانی / امتیاز تجربه" value={`${n(data.totals.org_points)} / ${n(data.totals.game_xp)}`} sub={`${n(data.gamification?.missions_completed ?? 0)} مأموریت تکمیل‌شده`} />
              </div>
              <div className="k-meta">
                <OriginChips origin={data.data_origin} />
                {data.last_import && (
                  <span className="k-muted">
                    آخرین ورود اطلاعات: {data.last_import.file_name} <StatusChip status={data.last_import.status} /> · {jdateTime(data.last_import.created_at)}
                  </span>
                )}
              </div>

              <div className="k-grid2">
                <Card title="مقایسه برندها">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>برند</th>
                        <th className="k-num">فروش</th>
                        <th className="k-num">هدف</th>
                        <th>تحقق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.brands.map((b) => (
                        <tr key={b.brand} data-testid={`brand-${b.brand}`}>
                          <td>
                            <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                            {brandName(b.brand)}
                          </td>
                          <td className="k-num">{formatMoney(b.amount)}</td>
                          <td className="k-num">{formatMoney(b.target)}</td>
                          <td>
                            <AttainmentBar pct={b.attainment_pct} label={`تحقق ${brandName(b.brand)}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title="مقایسه شعبه‌ها">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>شعبه</th>
                        <th className="k-num">فروش</th>
                        <th>تحقق</th>
                        <th className="k-num">امتیاز سازمانی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branches.map((b) => (
                        <tr key={b.code} data-testid={`branch-${b.code}`}>
                          <td>
                            <button className="k-link" onClick={() => navigate(`/branch/${b.code}`)}>
                              {branchLabel(b.code, b.name)}
                            </button>
                            <small className="k-muted" dir="auto"> {b.manager}</small>
                          </td>
                          <td className="k-num">{formatMoney(b.amount)}</td>
                          <td>
                            <AttainmentBar pct={b.attainment_pct} label={`تحقق ${branchLabel(b.code, b.name)}`} />
                          </td>
                          <td className="k-num">{n(b.org_points)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div className="k-grid2">
                <Card title="عملکرد تیم‌ها">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>سرپرست</th>
                        <th className="k-num">ویزیتور</th>
                        <th className="k-num">فروش</th>
                        <th>تحقق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.supervisors ?? []).map((s) => (
                        <tr key={s.id ?? 'none'}>
                          <td dir="auto">
                            {s.name} <small className="k-muted">{branchLabel(s.branch_code)}</small>
                          </td>
                          <td className="k-num">{n(s.reps)}</td>
                          <td className="k-num">{formatMoney(s.amount)}</td>
                          <td>
                            <AttainmentBar pct={s.attainment_pct} label={`تحقق ${s.name}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title="رتبه‌بندی ویزیتورها">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>ویزیتور</th>
                        <th>تحقق</th>
                        <th className="k-num">امتیاز سازمانی</th>
                        <th className="k-num">تجربه</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reps.map((r) => (
                        <tr key={r.id} data-testid={`rep-${r.employee_code}`}>
                          <td dir="auto">
                            <button className="k-link" onClick={() => navigate(`/rep/${r.id}`)}>
                              {r.name}
                            </button>
                            <small className="k-muted"> {r.employee_code}</small>
                          </td>
                          <td>
                            <AttainmentBar pct={r.attainment_pct} label={`تحقق ${r.name}`} />
                          </td>
                          <td className="k-num">{n(r.org_points)}</td>
                          <td className="k-num">{n(r.game.xp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </Remoted>
  );
}
