import { useState } from 'react';
import type { Overview } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { AttainmentBar, Card, DemoBanner, formatDate, formatMoney, OriginChips, Remoted, StatusChip, Tile, brandColor, useApi } from './ui';

/** Management dashboard: totals, brand split, branches, supervisors and representatives. */
export function OverviewPage() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const query = new URLSearchParams();
  if (period) query.set('period', period);
  if (brand) query.set('brand', brand);
  if (branch) query.set('branch', branch);
  const remote = useApi<Overview>(`/api/v1/mgmt/overview${query.toString() ? `?${query.toString()}` : ''}`);

  return (
    <Remoted remote={remote}>
      {(data) => (
        <div className="k-stack">
          <DemoBanner notice={data.notice} />
          <div className="k-toolbar">
            <h1>
              {t('k.ov.title')} <small>{data.viewer.title}{data.viewer.branch_name ? ` · ${data.viewer.branch_name}` : ''}</small>
            </h1>
            <div className="k-filters">
              <label>
                {t('k.ov.period')}
                <select value={period || data.period || ''} onChange={(e) => setPeriod(e.target.value)} disabled={data.periods.length === 0} aria-label={t('k.ov.periodAria')}>
                  {data.periods.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('k.ov.brand')}
                <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label={t('k.ov.brandAria')}>
                  <option value="">{t('k.ov.allBrands')}</option>
                  <option>EFES</option>
                  <option>MATADOR</option>
                </select>
              </label>
              <label>
                {t('k.ov.branch')}
                <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label={t('k.ov.branchAria')}>
                  <option value="">{t('k.ov.allBranches')}</option>
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
                <h2>{t('k.ov.noSalesTitle')}</h2>
                <p>{t('k.ov.noSalesText')}</p>
                {data.viewer.position === 'admin' ? (
                  <button className="btn btn--green" onClick={() => navigate('/imports')}>
                    {t('k.ov.goImport')}
                  </button>
                ) : (
                  <p className="k-muted">{t('k.ov.askAdmin')}</p>
                )}
              </div>
            </Card>
          ) : (
            <>
              <div className="k-tiles">
                <Tile label={t('k.ov.salesTile', { period: data.period ?? '' })} value={formatMoney(data.totals.amount)} sub={t('k.ov.rialsProcessed')} />
                <Tile label={t('k.ov.target')} value={formatMoney(data.totals.target)} sub={<AttainmentBar pct={data.totals.attainment_pct} label={t('k.att.total')} />} />
                <Tile label={t('k.ov.reps')} value={data.totals.reps} sub={t('k.ov.playing', { count: data.gamification?.players ?? 0 })} />
                <Tile label={t('k.ov.orgGame')} value={`${data.totals.org_points} / ${data.totals.game_xp}`} sub={t('k.ov.missionsDone', { count: data.gamification?.missions_completed ?? 0 })} />
              </div>
              <div className="k-meta">
                <OriginChips origin={data.data_origin} />
                {data.last_import && (
                  <span className="k-muted">
                    {t('k.ov.lastImport', { file: data.last_import.file_name })} <StatusChip status={data.last_import.status} /> · {formatDate(data.last_import.created_at)}
                  </span>
                )}
              </div>

              <div className="k-grid2">
                <Card title={t('k.ov.brandComparison')}>
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>{t('k.th.brand')}</th>
                        <th className="k-num">{t('k.th.sales')}</th>
                        <th className="k-num">{t('k.th.target')}</th>
                        <th>{t('k.th.attainment')}</th>
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
                            <AttainmentBar pct={b.attainment_pct} label={t('k.att.brandOf', { brand: b.brand })} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title={t('k.ov.branches')}>
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>{t('k.th.branch')}</th>
                        <th className="k-num">{t('k.th.sales')}</th>
                        <th>{t('k.th.attainment')}</th>
                        <th className="k-num">{t('k.th.orgPts')}</th>
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
                            <AttainmentBar pct={b.attainment_pct} label={t('k.att.of', { name: b.name })} />
                          </td>
                          <td className="k-num">{b.org_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div className="k-grid2">
                <Card title={t('k.ov.supervisors')}>
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>{t('k.th.supervisor')}</th>
                        <th className="k-num">{t('k.th.reps')}</th>
                        <th className="k-num">{t('k.th.sales')}</th>
                        <th>{t('k.th.attainment')}</th>
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
                            <AttainmentBar pct={s.attainment_pct} label={t('k.att.of', { name: s.name })} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title={t('k.ov.representatives')}>
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>{t('k.th.rep')}</th>
                        <th>{t('k.th.attainment')}</th>
                        <th className="k-num">{t('k.th.orgPts')}</th>
                        <th className="k-num">{t('k.th.xp')}</th>
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
                            <AttainmentBar pct={r.attainment_pct} label={t('k.att.of', { name: r.name })} />
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
