import type { BranchDetail } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { AttainmentBar, Card, DemoBanner, formatMoney, OriginChips, Remoted, Tile, brandColor, useApi } from './ui';

/** One branch: manager, brand split and each supervisor with their representatives. */
export function BranchPage({ code }: { code: string }) {
  const { t } = useLanguage();
  const remote = useApi<BranchDetail>(`/api/v1/mgmt/branches/${encodeURIComponent(code)}`);
  return (
    <Remoted remote={remote}>
      {(data) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate('/')}>
                {t('k.br.back')}
              </button>
              <h1>
                {data.branch.name} <small>{t('k.br.manager')} <span dir="auto">{data.branch.manager ?? '—'}</span></small>
              </h1>
            </div>
          </div>
          <div className="k-tiles">
            <Tile label={t('k.br.salesTile', { period: data.period ?? '—' })} value={formatMoney(data.totals.amount)} sub={t('k.ov.rialsProcessed')} />
            <Tile label={t('k.ov.target')} value={formatMoney(data.totals.target)} sub={<AttainmentBar pct={data.totals.attainment_pct} label={t('k.att.branch')} />} />
            <Tile label={t('k.br.supervisorsTile')} value={data.supervisors.length} sub={t('k.br.repsCount', { count: data.totals.reps })} />
            <Tile label={t('k.ov.orgGame')} value={`${data.totals.org_points} / ${data.totals.game_xp}`} />
          </div>
          <div className="k-meta">
            <OriginChips origin={data.data_origin} />
          </div>
          <Card title={t('k.br.brandSplit')}>
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
                  {t('k.br.supervisorTitle', { name: sup.name })}
                </span>
              }
              action={<AttainmentBar pct={sup.attainment_pct} label={t('k.att.of', { name: sup.name })} />}
            >
              <table className="k-table">
                <thead>
                  <tr>
                    <th>{t('k.th.rep')}</th>
                    <th className="k-num">{t('k.th.sales')}</th>
                    <th className="k-num">{t('k.th.target')}</th>
                    <th>{t('k.th.attainment')}</th>
                    <th className="k-num">{t('k.th.orgPts')}</th>
                    <th className="k-num">{t('k.th.game')}</th>
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
                        <AttainmentBar pct={r.attainment_pct} label={t('k.att.of', { name: r.name })} />
                      </td>
                      <td className="k-num">{r.org_points}</td>
                      <td className="k-num">{t('k.br.game', { level: r.game.level, xp: r.game.xp })}</td>
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
