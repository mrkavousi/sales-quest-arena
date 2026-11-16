import { useMemo, useState } from 'react';
import type { Overview, RepRow } from '../api/types';
import { branchLabel, brandName, jperiod, n, pct } from '../i18n';
import { navigate } from '../router';
import { useDemoSwitch } from './DemoBar';
import { achievementName, levelTitle, questName } from './OverviewPage';
import { jdateTime } from '../i18n';
import { AttainmentBar, Card, DemoBanner, EmptyState, formatMoney, Remoted, Tile, brandColor, useApi } from './ui';

function useOverview() {
  return useApi<Overview>('/api/v1/mgmt/overview');
}

function Page({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="k-stack">
      <DemoBanner />
      <div className="k-toolbar">
        <h1>
          {title} {sub && <small>{sub}</small>}
        </h1>
      </div>
      {children}
    </div>
  );
}

function NoSales() {
  return (
    <Card>
      <EmptyState>هنوز فروش پردازش‌شده‌ای وجود ندارد. از بخش «مرکز ورود و بررسی اطلاعات» فایل نمونه را وارد کنید.</EmptyState>
    </Card>
  );
}

/** ۲ · Organization and branch structure. */
export function OrgPage() {
  const remote = useOverview();
  return (
    <Remoted remote={remote} what="ساختار سازمان">
      {(data) => (
        <Page title="سازمان و ساختار شعب" sub="سازمان نمونهٔ کیلوس">
          {data.branches.length === 0 ? (
            <NoSales />
          ) : (
            <>
              <div className="k-tiles">
                <Tile label="شعبه‌ها" value={n(data.branches.length)} />
                <Tile label="سرپرستان" value={n((data.supervisors ?? []).length)} />
                <Tile label="ویزیتورها" value={n(data.reps.length)} />
                <Tile label="مدیران شعبه" value={n(data.branches.filter((b) => b.manager).length)} />
              </div>
              <div className="adm-cards">
                {data.branches.map((b) => {
                  const sups = (data.supervisors ?? []).filter((s) => s.branch_code === b.code);
                  return (
                    <article key={b.code} className="adm-card" data-testid={`org-${b.code}`}>
                      <header>
                        <h3>{branchLabel(b.code, b.name)}</h3>
                        <span className="k-chip k-chip--sample">نمونه</span>
                      </header>
                      <p className="k-muted">
                        مدیر شعبه: <b dir="auto">{b.manager ?? '—'}</b>
                      </p>
                      <ul className="adm-list">
                        {sups.map((s) => (
                          <li key={s.id ?? 'x'}>
                            <span dir="auto">{s.name}</span>
                            <small>{n(s.reps)} ویزیتور</small>
                          </li>
                        ))}
                      </ul>
                      <div className="adm-card__foot">
                        <AttainmentBar pct={b.attainment_pct} label={`تحقق ${branchLabel(b.code, b.name)}`} />
                        <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/branch/${b.code}`)}>
                          جزئیات شعبه
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </Page>
      )}
    </Remoted>
  );
}

/** ۳ · Users and visitors: list, profiles, and the demo jump into a visitor's game panel. */
export function UsersPage() {
  const remote = useOverview();
  const switchTo = useDemoSwitch();
  const [query, setQuery] = useState('');
  return (
    <Remoted remote={remote} what="ویزیتورها">
      {(data) => {
        const rows = data.reps.filter((r) => `${r.name} ${r.employee_code}`.toLowerCase().includes(query.trim().toLowerCase()));
        return (
          <Page title="کاربران و ویزیتورها" sub={`${n(data.reps.length)} ویزیتور در محدودهٔ شما`}>
            <Card
              title="فهرست ویزیتورها"
              action={<input className="k-search" type="search" placeholder="جستجوی نام یا کد…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="جستجوی ویزیتور" />}
            >
              {rows.length === 0 ? (
                <EmptyState>ویزیتوری با این مشخصات پیدا نشد.</EmptyState>
              ) : (
                <div className="k-scroll">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>ویزیتور</th>
                        <th>شعبه / سرپرست</th>
                        <th>سطح</th>
                        <th className="k-num">امتیاز تجربه</th>
                        <th className="k-num">روز پیاپی</th>
                        <th className="k-num">مأموریت‌ها</th>
                        <th>تحقق هدف</th>
                        <th>اقدام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r: RepRow) => (
                        <tr key={r.id} data-testid={`user-${r.employee_code}`}>
                          <td dir="auto">
                            <button className="k-link" onClick={() => navigate(`/rep/${r.id}`)}>
                              {r.name}
                            </button>
                            <small className="k-muted"> {r.employee_code}</small>
                          </td>
                          <td>
                            {branchLabel(r.branch_code, r.branch_name)}
                            <small className="k-muted" dir="auto"> {r.supervisor}</small>
                          </td>
                          <td>
                            {n(r.game.level)} · {levelTitle(r.game.level)}
                          </td>
                          <td className="k-num">{n(r.game.xp)}</td>
                          <td className="k-num">{n(r.game.streak)}</td>
                          <td className="k-num">{n(r.game.missions_completed)}</td>
                          <td>
                            <AttainmentBar pct={r.attainment_pct} label={`تحقق ${r.name}`} />
                          </td>
                          <td>
                            <button className="btn btn--green btn--sm" onClick={() => void switchTo(r.id)} data-testid={`play-${r.employee_code}`}>
                              ورود به پنل بازی
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </Page>
        );
      }}
    </Remoted>
  );
}

/** ۴ · Teams and supervisors. */
export function TeamsPage() {
  const remote = useOverview();
  return (
    <Remoted remote={remote} what="تیم‌ها">
      {(data) => (
        <Page title="تیم‌ها و سرپرستان" sub="هر تیم زیر نظر یک سرپرست فروش است">
          {(data.supervisors ?? []).length === 0 ? (
            <NoSales />
          ) : (
            <div className="adm-cards">
              {(data.supervisors ?? []).map((s) => {
                const members = data.reps.filter((r) => r.supervisor_id === s.id);
                return (
                  <article key={s.id ?? 'x'} className="adm-card" data-testid={`team-${s.id}`}>
                    <header>
                      <h3 dir="auto">{s.name}</h3>
                      <small>{branchLabel(s.branch_code)}</small>
                    </header>
                    <div className="adm-stats">
                      <span>
                        <b>{n(s.reps)}</b> ویزیتور
                      </span>
                      <span>
                        <b>{formatMoney(s.amount)}</b> فروش
                      </span>
                      <span>
                        <b>{n(s.game_xp)}</b> امتیاز تجربه
                      </span>
                    </div>
                    <AttainmentBar pct={s.attainment_pct} label={`تحقق ${s.name}`} />
                    <ul className="adm-list">
                      {members.map((r) => (
                        <li key={r.id}>
                          <button className="k-link" dir="auto" onClick={() => navigate(`/rep/${r.id}`)}>
                            {r.name}
                          </button>
                          <small>
                            سطح {n(r.game.level)} · {pct(r.attainment_pct)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          )}
        </Page>
      )}
    </Remoted>
  );
}

/** ۶ · Sales performance (real or imported data only; sample data is labelled). */
export function SalesPage() {
  const remote = useOverview();
  return (
    <Remoted remote={remote} what="عملکرد فروش">
      {(data) => (
        <Page title="عملکرد فروش" sub={data.period ? `دورهٔ ${jperiod(data.period)}` : undefined}>
          {data.empty || !data.totals ? (
            <NoSales />
          ) : (
            <>
              <div className="k-tiles">
                <Tile label="فروش پردازش‌شده" value={formatMoney(data.totals.amount)} sub="ریال" />
                <Tile label="هدف" value={formatMoney(data.totals.target)} />
                <Tile label="تحقق کل" value={pct(data.totals.attainment_pct)} tone={(data.totals.attainment_pct ?? 0) >= 100 ? 'good' : 'warn'} />
                <Tile label="ویزیتورهای بالای ۸۰٪" value={n(data.reps.filter((r) => (r.attainment_pct ?? 0) >= 80).length)} sub={`از ${n(data.reps.length)}`} />
              </div>
              <div className="k-grid2">
                <Card title="سهم هر برند">
                  <ul className="adm-bars">
                    {data.brands.map((b) => (
                      <li key={b.brand}>
                        <span>
                          <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                          {brandName(b.brand)}
                        </span>
                        <AttainmentBar pct={b.attainment_pct} />
                        <small>{formatMoney(b.amount)}</small>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card title="تحقق هدف به تفکیک شعبه">
                  <ul className="adm-bars">
                    {data.branches.map((b) => (
                      <li key={b.code}>
                        <span>{branchLabel(b.code, b.name)}</span>
                        <AttainmentBar pct={b.attainment_pct} />
                        <small>{formatMoney(b.amount)}</small>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
              <Card title="ویزیتورها بر اساس تحقق هدف">
                <ul className="adm-bars">
                  {data.reps.map((r) => (
                    <li key={r.id}>
                      <button className="k-link" dir="auto" onClick={() => navigate(`/rep/${r.id}`)}>
                        {r.name}
                      </button>
                      <AttainmentBar pct={r.attainment_pct} />
                      <small>{formatMoney(r.amount)}</small>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </Page>
      )}
    </Remoted>
  );
}

/** ۸ · Points and achievements: XP, levels, organizational points and badges, kept separate. */
export function PointsPage() {
  const remote = useOverview();
  const sorted = useMemo(() => (remote.data ? [...remote.data.reps].sort((a, b) => b.game.xp - a.game.xp) : []), [remote.data]);
  return (
    <Remoted remote={remote} what="امتیازها">
      {(data) => (
        <Page title="امتیازها و دستاوردها" sub="امتیاز تجربه (بازی) و امتیاز سازمانی دو شمارندهٔ جدا هستند">
          <div className="k-tiles">
            <Tile label="مجموع امتیاز تجربه" value={n(data.gamification?.total_xp ?? 0)} sub="اقتصاد بازی" />
            <Tile label="مجموع امتیاز سازمانی" value={n(data.gamification?.org_points ?? 0)} sub="دفتر ثبت سازمانی" />
            <Tile label="مأموریت‌های تکمیل‌شده" value={n(data.gamification?.missions_completed ?? 0)} />
            <Tile label="دستاوردهای کسب‌شده" value={n(sorted.reduce((sum, r) => sum + r.game.achievements, 0))} />
          </div>
          <div className="k-grid2">
            <Card title="سطح و امتیاز ویزیتورها">
              <table className="k-table">
                <thead>
                  <tr>
                    <th>ویزیتور</th>
                    <th>سطح</th>
                    <th className="k-num">امتیاز تجربه</th>
                    <th className="k-num">امتیاز سازمانی</th>
                    <th className="k-num">نشان‌ها</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id}>
                      <td dir="auto">{r.name}</td>
                      <td>
                        {n(r.game.level)} · {levelTitle(r.game.level)}
                      </td>
                      <td className="k-num">{n(r.game.xp)}</td>
                      <td className="k-num">{n(r.org_points)}</td>
                      <td className="k-num">{n(r.game.achievements)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="آخرین دستاوردها و چالش‌ها">
              {!data.command_center || (data.command_center.recent_achievements.length === 0 && data.command_center.recent_claims.length === 0) ? (
                <EmptyState>هنوز دستاوردی ثبت نشده است.</EmptyState>
              ) : (
                <ul className="cc__feed">
                  {data.command_center.recent_achievements.map((a, i) => (
                    <li key={`a${i}`}>
                      <span aria-hidden="true">🏅</span>
                      <b dir="auto">{a.name}</b> · «{achievementName(a.achievement)}» <small>{jdateTime(a.at)}</small>
                    </li>
                  ))}
                  {data.command_center.recent_claims.map((c, i) => (
                    <li key={`c${i}`}>
                      <span aria-hidden="true">🎁</span>
                      <b dir="auto">{c.name}</b> · «{questName(c.quest)}» +{n(c.xp)} <small>{jdateTime(c.at)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </Page>
      )}
    </Remoted>
  );
}
