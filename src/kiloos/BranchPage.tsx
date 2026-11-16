import type { BranchDetail } from '../api/types';
import { branchLabel, brandName, jperiod, n } from '../i18n';
import { navigate } from '../router';
import { AttainmentBar, Card, DemoBanner, formatMoney, OriginChips, Remoted, Tile, brandColor, useApi } from './ui';

/** One branch: manager, brand split and each supervisor with their representatives. */
export function BranchPage({ code }: { code: string }) {
  const remote = useApi<BranchDetail>(`/api/v1/mgmt/branches/${encodeURIComponent(code)}`);
  return (
    <Remoted remote={remote} what="شعبه">
      {(data) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate('/org')}>
                → همه شعبه‌ها
              </button>
              <h1>
                {branchLabel(data.branch.code, data.branch.name)} <small>مدیر شعبه: <span dir="auto">{data.branch.manager ?? '—'}</span></small>
              </h1>
            </div>
          </div>
          <div className="k-tiles">
            <Tile label={`فروش · ${jperiod(data.period)}`} value={formatMoney(data.totals.amount)} sub="ریال، فروش پردازش‌شده" />
            <Tile label="هدف فروش" value={formatMoney(data.totals.target)} sub={<AttainmentBar pct={data.totals.attainment_pct} label="تحقق شعبه" />} />
            <Tile label="سرپرستان" value={n(data.supervisors.length)} sub={`${n(data.totals.reps)} ویزیتور`} />
            <Tile label="امتیاز سازمانی / امتیاز تجربه" value={`${n(data.totals.org_points)} / ${n(data.totals.game_xp)}`} />
          </div>
          <div className="k-meta">
            <OriginChips origin={data.data_origin} />
          </div>
          <Card title="سهم برندها">
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
                  <tr key={b.brand}>
                    <td>
                      <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                      {brandName(b.brand)}
                    </td>
                    <td className="k-num">{formatMoney(b.amount)}</td>
                    <td className="k-num">{formatMoney(b.target)}</td>
                    <td>
                      <AttainmentBar pct={b.attainment_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {data.supervisors.map((sup) => (
            <Card
              key={sup.id ?? 'none'}
              title={
                <span dir="auto" data-testid={`supervisor-${sup.name}`}>
                  سرپرست · {sup.name}
                </span>
              }
              action={<AttainmentBar pct={sup.attainment_pct} label={`تحقق ${sup.name}`} />}
            >
              <table className="k-table">
                <thead>
                  <tr>
                    <th>ویزیتور</th>
                    <th className="k-num">فروش</th>
                    <th className="k-num">هدف</th>
                    <th>تحقق</th>
                    <th className="k-num">امتیاز سازمانی</th>
                    <th className="k-num">بازی</th>
                  </tr>
                </thead>
                <tbody>
                  {sup.reps.map((r) => (
                    <tr key={r.id} data-testid={`rep-${r.employee_code}`}>
                      <td dir="auto">
                        <button className="k-link" onClick={() => navigate(`/rep/${r.id}`)}>
                          {r.name}
                        </button>
                        <small className="k-muted"> {r.employee_code}</small>
                      </td>
                      <td className="k-num">{formatMoney(r.amount)}</td>
                      <td className="k-num">{formatMoney(r.target)}</td>
                      <td>
                        <AttainmentBar pct={r.attainment_pct} label={`تحقق ${r.name}`} />
                      </td>
                      <td className="k-num">{n(r.org_points)}</td>
                      <td className="k-num">
                        سطح {n(r.game.level)} · {n(r.game.xp)} امتیاز
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </Remoted>
  );
}
