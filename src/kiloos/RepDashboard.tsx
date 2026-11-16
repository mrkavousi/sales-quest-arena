import type { RepDetail } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { AttainmentBar, Card, DailyChart, formatMoney, formatPct, OriginChips, Tile, brandColor } from './ui';

const SOURCE_KEYS: Record<string, MessageKey> = {
  sales_record: 'k.rd.srcSales',
  game_sales_mission: 'k.rd.srcSprint',
  mission_submission: 'k.rd.srcPhoto',
};

/** One representative's performance: used by management drill-down and the employee's own view. */
export function RepDashboard({ detail, isSelf }: { detail: RepDetail; isSelf?: boolean }) {
  const { t } = useLanguage();
  const sourceLabel = (source: string) => (SOURCE_KEYS[source] ? t(SOURCE_KEYS[source]) : source);
  const { rep, rank, org_points: points, mission_gate: gate } = detail;
  const brands = rep.brands.map((b) => b.brand);
  return (
    <div className="k-stack">
      <div className="k-tiles">
        <Tile label={t('k.rd.salesTile', { period: detail.period ?? '—' })} value={`${formatMoney(rep.amount)}`} sub={t('k.rd.rialsOnly')} />
        <Tile label={t('k.ov.target')} value={formatMoney(rep.target)} sub={<AttainmentBar pct={rep.attainment_pct} label={t('k.rd.targetAttain')} />} tone={rep.attainment_pct !== null && rep.attainment_pct >= 80 ? 'good' : 'warn'} />
        <Tile label={t('k.rd.orgPoints')} value={points.total} sub={rank.position ? t('k.rd.rankOf', { position: rank.position, of: rank.of }) : t('k.rd.notRanked')} />
        <Tile label={t('k.rd.gameLevel')} value={t('k.rd.levelTile', { level: rep.game.level })} sub={t('k.rd.xpLine', { xp: rep.game.xp, title: rep.game.level_title })} />
      </div>

      <div className="k-grid2">
        <Card title={t('k.rd.brandBreakdown')} action={<OriginChips origin={detail.data_origin} />}>
          {rep.brands.length === 0 ? (
            <p className="k-muted">{t('k.empty.noBrandTargets')}</p>
          ) : (
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
                {rep.brands.map((b) => (
                  <tr key={b.brand}>
                    <td>
                      <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                      {b.brand}
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
          )}
        </Card>

        <Card title={t('k.rd.dailySales')}>
          <DailyChart days={detail.daily} brands={brands} />
        </Card>
      </div>

      <div className="k-grid2">
        <Card title={t('k.rd.gamification')}>
          <dl className="k-facts">
            <div><dt>{t('k.rd.gameXp')}</dt><dd>{rep.game.xp}</dd></div>
            <div><dt>{t('k.rd.level')}</dt><dd>{rep.game.level} · {rep.game.level_title}</dd></div>
            <div><dt>{t('k.rd.streak')}</dt><dd>{rep.game.streak} {rep.game.streak === 1 ? t('k.rd.dayOne') : t('k.rd.dayMany')}</dd></div>
            <div><dt>{t('k.rd.missionsCompleted')}</dt><dd>{rep.game.missions_completed}</dd></div>
            <div><dt>{t('k.rd.achievements')}</dt><dd>{rep.game.achievements}</dd></div>
            <div><dt>{t('k.rd.coins')}</dt><dd>{rep.game.coins}</dd></div>
          </dl>
          <p className="k-note">{t('k.rd.gameNote')}</p>
        </Card>

        <Card title={t('k.rd.ledger')}>
          <dl className="k-facts">
            {Object.entries(points.by_source).map(([source, value]) => (
              <div key={source}>
                <dt>{sourceLabel(source)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div className="k-facts__total"><dt>{t('k.rd.total')}</dt><dd>{points.total}</dd></div>
          </dl>
          {points.recent.length > 0 && (
            <ul className="k-events">
              {points.recent.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <span>{sourceLabel(e.source_type)}</span>
                  <b>+{e.points}</b>
                  <span className={`k-chip k-chip--${e.status.toLowerCase()}`}>{e.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={t('k.rd.sprintTitle')}>
        <p>
          <span className={`k-chip k-chip--${gate.eligible ? 'completed' : 'rejected'}`}>{gate.eligible ? t('k.status.eligible') : t('k.status.notEligible')}</span>{' '}
          {t('k.rd.sprintRule', { min: gate.minPct, period: gate.period ?? t('k.rd.sprintPeriodFallback') })}
          {gate.attainmentPct !== undefined && gate.attainmentPct !== null && <> {t('k.rd.currentAttain', { pct: formatPct(gate.attainmentPct) })}</>}
        </p>
        <p className="k-note">
          {t('k.rd.proposedNote')}
          {isSelf ? t('k.rd.playHint') : ''}
        </p>
      </Card>
    </div>
  );
}
