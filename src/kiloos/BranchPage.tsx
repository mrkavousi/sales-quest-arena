import type { BranchDetail } from '../api/types';
import { navigate } from '../router';
import { AttainmentBar, Card, DemoBanner, formatMoney, OriginChips, Remoted, Tile, brandColor, useApi } from './ui';

/** One branch: manager, brand split and each supervisor with their representatives. */
export function BranchPage({ code }: { code: string }) {
  const remote = useApi<BranchDetail>(`/api/v1/mgmt/branches/${encodeURIComponent(code)}`);
  return (
    <Remoted remote={remote} what="branch">
      {(data) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate('/')}>
                ← All branches
              </button>
              <h1>
                {data.branch.name} <small>Manager: <span dir="auto">{data.branch.manager ?? '—'}</span></small>
              </h1>
            </div>
          </div>
          <div className="k-tiles">
            <Tile label={`Sales · ${data.period ?? '—'}`} value={formatMoney(data.totals.amount)} sub="Rials, processed sales" />
            <Tile label="Target" value={formatMoney(data.totals.target)} sub={<AttainmentBar pct={data.totals.attainment_pct} label="Branch attainment" />} />
            <Tile label="Supervisors" value={data.supervisors.length} sub={`${data.totals.reps} representatives`} />
            <Tile label="Org points / game XP" value={`${data.totals.org_points} / ${data.totals.game_xp}`} />
          </div>
          <div className="k-meta">
            <OriginChips origin={data.data_origin} />
          </div>
          <Card title="Brand split">
            <table className="k-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th className="k-num">Sales</th>
                  <th className="k-num">Target</th>
                  <th>Attainment</th>
                </tr>
              </thead>
              <tbody>
                {data.brands.map((b) => (
                  <tr key={b.brand}>
                    <td>
                      <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                      {b.name ?? b.brand}
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
                  Supervisor · {sup.name}
                </span>
              }
              action={<AttainmentBar pct={sup.attainment_pct} label={`${sup.name} attainment`} />}
            >
              <table className="k-table">
                <thead>
                  <tr>
                    <th>Representative</th>
                    <th className="k-num">Sales</th>
                    <th className="k-num">Target</th>
                    <th>Attainment</th>
                    <th className="k-num">Org pts</th>
                    <th className="k-num">Game</th>
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
                        <AttainmentBar pct={r.attainment_pct} label={`${r.name} attainment`} />
                      </td>
                      <td className="k-num">{r.org_points}</td>
                      <td className="k-num">
                        Lv {r.game.level} · {r.game.xp} XP
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
