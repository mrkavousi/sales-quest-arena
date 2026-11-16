import type { RepDetail } from '../api/types';
import { AttainmentBar, Card, DailyChart, formatMoney, formatPct, OriginChips, Tile, brandColor } from './ui';

const SOURCE_LABELS: Record<string, string> = {
  sales_record: 'Processed sales (SAMPLE rule)',
  game_sales_mission: 'Target Sprint mission (PROPOSED rule)',
  mission_submission: 'Photo missions (SAMPLE rule)',
};

/** One representative's performance: used by management drill-down and the employee's own view. */
export function RepDashboard({ detail, isSelf }: { detail: RepDetail; isSelf?: boolean }) {
  const { rep, rank, org_points: points, mission_gate: gate } = detail;
  const brands = rep.brands.map((b) => b.brand);
  return (
    <div className="k-stack">
      <div className="k-tiles">
        <Tile label={`Sales · ${detail.period ?? '—'}`} value={`${formatMoney(rep.amount)}`} sub="Rials, processed sales only" />
        <Tile label="Target" value={formatMoney(rep.target)} sub={<AttainmentBar pct={rep.attainment_pct} label="Target attainment" />} tone={rep.attainment_pct !== null && rep.attainment_pct >= 80 ? 'good' : 'warn'} />
        <Tile label="Organizational points" value={points.total} sub={rank.position ? `Rank ${rank.position} of ${rank.of}` : 'Not ranked'} />
        <Tile label="Game level" value={`Lv ${rep.game.level}`} sub={`${rep.game.xp} XP · ${rep.game.level_title}`} />
      </div>

      <div className="k-grid2">
        <Card title="Brand breakdown" action={<OriginChips origin={detail.data_origin} />}>
          {rep.brands.length === 0 ? (
            <p className="k-muted">No processed sales or targets for this period yet.</p>
          ) : (
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
                {rep.brands.map((b) => (
                  <tr key={b.brand}>
                    <td>
                      <i className="k-dot" style={{ background: brandColor(b.brand) }} />
                      {b.brand}
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
          )}
        </Card>

        <Card title="Daily processed sales">
          <DailyChart days={detail.daily} brands={brands} />
        </Card>
      </div>

      <div className="k-grid2">
        <Card title="Gamification status">
          <dl className="k-facts">
            <div><dt>Game XP</dt><dd>{rep.game.xp}</dd></div>
            <div><dt>Level</dt><dd>{rep.game.level} · {rep.game.level_title}</dd></div>
            <div><dt>Streak</dt><dd>{rep.game.streak} {rep.game.streak === 1 ? 'day' : 'days'}</dd></div>
            <div><dt>Missions completed</dt><dd>{rep.game.missions_completed}</dd></div>
            <div><dt>Achievements</dt><dd>{rep.game.achievements}</dd></div>
            <div><dt>Game coins</dt><dd>{rep.game.coins}</dd></div>
          </dl>
          <p className="k-note">
            Game XP and coins are a separate game economy. They never change organizational points or any financial reward.
          </p>
        </Card>

        <Card title="Organizational points (ledger)">
          <dl className="k-facts">
            {Object.entries(points.by_source).map(([source, value]) => (
              <div key={source}>
                <dt>{SOURCE_LABELS[source] ?? source}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div className="k-facts__total"><dt>Total</dt><dd>{points.total}</dd></div>
          </dl>
          {points.recent.length > 0 && (
            <ul className="k-events">
              {points.recent.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <span>{SOURCE_LABELS[e.source_type] ?? e.source_type}</span>
                  <b>+{e.points}</b>
                  <span className={`k-chip k-chip--${e.status.toLowerCase()}`}>{e.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Sales-driven mission (Target Sprint)">
        <p>
          <span className={`k-chip k-chip--${gate.eligible ? 'completed' : 'rejected'}`}>{gate.eligible ? 'Eligible' : 'Not eligible yet'}</span>{' '}
          Rule: reach <b>{gate.minPct}%</b> of your {gate.period ?? 'period'} target with <b>processed</b> sales.
          {gate.attainmentPct !== undefined && gate.attainmentPct !== null && <> Current attainment: <b>{formatPct(gate.attainmentPct)}</b>.</>}
        </p>
        <p className="k-note">
          Threshold and the +100 organizational points are a <b>PROPOSED demo rule</b> — they need business approval. The server checks eligibility from imported sales; the app cannot claim it.
          {isSelf ? ' Play it in the Arena.' : ''}
        </p>
      </Card>
    </div>
  );
}
