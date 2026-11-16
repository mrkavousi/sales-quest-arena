import { useState } from 'react';
import type { Overview } from '../api/types';
import { navigate } from '../router';
import { AttainmentBar, Card, DemoBanner, formatDate, formatMoney, OriginChips, Remoted, StatusChip, Tile, brandColor, useApi } from './ui';

/** Management dashboard: totals, brand split, branches, supervisors and representatives. */
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
    <Remoted remote={remote} what="dashboard">
      {(data) => (
        <div className="k-stack">
          <DemoBanner notice={data.notice} />
          <div className="k-toolbar">
            <h1>
              Sales performance <small>{data.viewer.title}{data.viewer.branch_name ? ` · ${data.viewer.branch_name}` : ''}</small>
            </h1>
            <div className="k-filters">
              <label>
                Period
                <select value={period || data.period || ''} onChange={(e) => setPeriod(e.target.value)} disabled={data.periods.length === 0} aria-label="Period">
                  {data.periods.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Brand
                <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
                  <option value="">All brands</option>
                  <option>EFES</option>
                  <option>MATADOR</option>
                </select>
              </label>
              <label>
                Branch
                <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch">
                  <option value="">All visible branches</option>
                  {data.branches.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {data.empty || !data.totals ? (
            <Card>
              <div className="k-empty">
                <h2>No processed sales yet</h2>
                <p>Upload and process the Excel workbook to fill the dashboards.</p>
                {data.viewer.position === 'admin' ? (
                  <button className="btn btn--green" onClick={() => navigate('/imports')}>
                    Go to Excel import
                  </button>
                ) : (
                  <p className="k-muted">Ask an administrator to import the sales workbook.</p>
                )}
              </div>
            </Card>
          ) : (
            <>
              <div className="k-tiles">
                <Tile label={`Sales · ${data.period}`} value={formatMoney(data.totals.amount)} sub="Rials, processed sales" />
                <Tile label="Target" value={formatMoney(data.totals.target)} sub={<AttainmentBar pct={data.totals.attainment_pct} label="Total attainment" />} />
                <Tile label="Representatives" value={data.totals.reps} sub={`${data.gamification?.players ?? 0} playing the game`} />
                <Tile label="Org points / game XP" value={`${data.totals.org_points} / ${data.totals.game_xp}`} sub={`${data.gamification?.missions_completed ?? 0} missions completed`} />
              </div>
              <div className="k-meta">
                <OriginChips origin={data.data_origin} />
                {data.last_import && (
                  <span className="k-muted">
                    Last import: {data.last_import.file_name} <StatusChip status={data.last_import.status} /> · {formatDate(data.last_import.created_at)}
                  </span>
                )}
              </div>

              <div className="k-grid2">
                <Card title="Brand comparison">
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
                        <tr key={b.brand} data-testid={`brand-${b.brand}`}>
                          <td>
                            <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                            {b.name ?? b.brand}
                          </td>
                          <td className="k-num">{formatMoney(b.amount)}</td>
                          <td className="k-num">{formatMoney(b.target)}</td>
                          <td>
                            <AttainmentBar pct={b.attainment_pct} label={`${b.brand} attainment`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title="Branches">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th className="k-num">Sales</th>
                        <th>Attainment</th>
                        <th className="k-num">Org pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branches.map((b) => (
                        <tr key={b.code} data-testid={`branch-${b.code}`}>
                          <td>
                            <button className="k-link" onClick={() => navigate(`/branch/${b.code}`)}>
                              {b.name}
                            </button>
                            <small className="k-muted" dir="auto"> {b.manager}</small>
                          </td>
                          <td className="k-num">{formatMoney(b.amount)}</td>
                          <td>
                            <AttainmentBar pct={b.attainment_pct} label={`${b.name} attainment`} />
                          </td>
                          <td className="k-num">{b.org_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div className="k-grid2">
                <Card title="Supervisors">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>Supervisor</th>
                        <th className="k-num">Reps</th>
                        <th className="k-num">Sales</th>
                        <th>Attainment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.supervisors ?? []).map((s) => (
                        <tr key={s.id ?? 'none'}>
                          <td dir="auto">
                            {s.name} <small className="k-muted">{s.branch_code}</small>
                          </td>
                          <td className="k-num">{s.reps}</td>
                          <td className="k-num">{formatMoney(s.amount)}</td>
                          <td>
                            <AttainmentBar pct={s.attainment_pct} label={`${s.name} attainment`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title="Representatives">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>Representative</th>
                        <th>Attainment</th>
                        <th className="k-num">Org pts</th>
                        <th className="k-num">XP</th>
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
                            <AttainmentBar pct={r.attainment_pct} label={`${r.name} attainment`} />
                          </td>
                          <td className="k-num">{r.org_points}</td>
                          <td className="k-num">{r.game.xp}</td>
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
