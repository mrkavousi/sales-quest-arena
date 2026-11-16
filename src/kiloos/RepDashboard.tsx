import type { RepDetail } from '../api/types';
import { brandName, jperiod, n } from '../i18n';
import { AttainmentBar, Card, DailyChart, formatMoney, formatPct, OriginChips, Tile, brandColor } from './ui';
import { levelTitle } from './OverviewPage';

const SOURCE_LABELS: Record<string, string> = {
  sales_record: 'فروش پردازش‌شده (قاعده نمونه)',
  game_sales_mission: 'مأموریت «هدف‌گیری فروش» (قاعده پیشنهادی)',
  mission_submission: 'مأموریت‌های تصویری (قاعده نمونه)',
};
const EVENT_STATUS: Record<string, string> = { posted: 'ثبت‌شده', reversed: 'برگشت‌خورده', pending: 'در انتظار' };

/** One representative's performance: used by management drill-down and the employee's own view. */
export function RepDashboard({ detail, isSelf }: { detail: RepDetail; isSelf?: boolean }) {
  const { rep, rank, org_points: points, mission_gate: gate } = detail;
  const brands = rep.brands.map((b) => b.brand);
  return (
    <div className="k-stack">
      <div className="k-tiles">
        <Tile label={`فروش · ${jperiod(detail.period)}`} value={formatMoney(rep.amount)} sub="ریال، فقط فروش پردازش‌شده" />
        <Tile label="هدف فروش" value={formatMoney(rep.target)} sub={<AttainmentBar pct={rep.attainment_pct} label="تحقق هدف" />} tone={rep.attainment_pct !== null && rep.attainment_pct >= 80 ? 'good' : 'warn'} />
        <Tile label="امتیاز سازمانی" value={n(points.total)} sub={rank.position ? `رتبه ${n(rank.position)} از ${n(rank.of)}` : 'بدون رتبه'} />
        <Tile label="سطح بازی" value={`سطح ${n(rep.game.level)}`} sub={`${n(rep.game.xp)} امتیاز تجربه · ${levelTitle(rep.game.level)}`} />
      </div>

      <div className="k-grid2">
        <Card title="تفکیک برندها" action={<OriginChips origin={detail.data_origin} />}>
          {rep.brands.length === 0 ? (
            <p className="k-muted">برای این دوره هنوز فروش پردازش‌شده یا هدفی ثبت نشده است.</p>
          ) : (
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
                {rep.brands.map((b) => (
                  <tr key={b.brand}>
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
          )}
        </Card>

        <Card title="فروش روزانه پردازش‌شده">
          <DailyChart days={detail.daily} brands={brands} />
        </Card>
      </div>

      <div className="k-grid2">
        <Card title="وضعیت گیمیفیکیشن">
          <dl className="k-facts">
            <div><dt>امتیاز تجربه</dt><dd>{n(rep.game.xp)}</dd></div>
            <div><dt>سطح</dt><dd>{n(rep.game.level)} · {levelTitle(rep.game.level)}</dd></div>
            <div><dt>روزهای پیاپی</dt><dd>{n(rep.game.streak)} روز</dd></div>
            <div><dt>مأموریت‌های تکمیل‌شده</dt><dd>{n(rep.game.missions_completed)}</dd></div>
            <div><dt>دستاوردها</dt><dd>{n(rep.game.achievements)}</dd></div>
            <div><dt>سکه بازی</dt><dd>{n(rep.game.coins)}</dd></div>
          </dl>
          <p className="k-note">امتیاز تجربه و سکه اقتصاد جداگانهٔ بازی است و هرگز امتیاز سازمانی یا پاداش مالی را تغییر نمی‌دهد.</p>
        </Card>

        <Card title="امتیازهای سازمانی (دفتر ثبت)">
          <dl className="k-facts">
            {Object.entries(points.by_source).map(([source, value]) => (
              <div key={source}>
                <dt>{SOURCE_LABELS[source] ?? source}</dt>
                <dd>{n(value)}</dd>
              </div>
            ))}
            <div className="k-facts__total"><dt>مجموع</dt><dd>{n(points.total)}</dd></div>
          </dl>
          {points.recent.length > 0 && (
            <ul className="k-events">
              {points.recent.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <span>{SOURCE_LABELS[e.source_type] ?? e.source_type}</span>
                  <b>+{n(e.points)}</b>
                  <span className={`k-chip k-chip--${e.status.toLowerCase()}`}>{EVENT_STATUS[e.status.toLowerCase()] ?? e.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="مأموریت مبتنی بر فروش (هدف‌گیری فروش)">
        <p>
          <span className={`k-chip k-chip--${gate.eligible ? 'completed' : 'rejected'}`}>{gate.eligible ? 'واجد شرایط' : 'هنوز واجد شرایط نیست'}</span>{' '}
          قاعده: رسیدن به <b>{n(gate.minPct)}٪</b> هدف دورهٔ {gate.period ? jperiod(gate.period) : 'جاری'} با فروش <b>پردازش‌شده</b>.
          {gate.attainmentPct !== undefined && gate.attainmentPct !== null && <> تحقق فعلی: <b>{formatPct(gate.attainmentPct)}</b>.</>}
        </p>
        <p className="k-note">
          آستانه و ۱۰۰ امتیاز سازمانی این مأموریت یک <b>قاعدهٔ پیشنهادیِ نمایشی</b> است و نیاز به تأیید کسب‌وکار دارد. سرور شرایط را از فروش واردشده بررسی می‌کند و برنامه نمی‌تواند آن را ادعا کند.
          {isSelf ? ' آن را در عرصهٔ بازی انجام دهید.' : ''}
        </p>
      </Card>
    </div>
  );
}
