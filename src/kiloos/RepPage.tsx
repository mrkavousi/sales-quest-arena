import type { RepDetail } from '../api/types';
import { branchLabel } from '../i18n';
import { navigate } from '../router';
import { useDemoSwitch } from './DemoBar';
import { RepDashboard } from './RepDashboard';
import { DemoBanner, Remoted, useApi } from './ui';

/** Management drill-down: a representative's dashboard, scoped by the server to the viewer's hierarchy. */
export function RepPage({ repId }: { repId: string }) {
  const remote = useApi<RepDetail>(`/api/v1/mgmt/reps/${encodeURIComponent(repId)}`);
  const switchTo = useDemoSwitch();
  return (
    <Remoted remote={remote} what="ویزیتور">
      {(detail) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate('/users')}>
                → فهرست ویزیتورها
              </button>
              <h1 dir="auto" data-testid="rep-title">
                {detail.rep.name}{' '}
                <small>
                  {detail.rep.employee_code} · {branchLabel(detail.rep.branch_code, detail.rep.branch_name)} · سرپرست: <span dir="auto">{detail.rep.supervisor ?? '—'}</span>
                </small>
              </h1>
            </div>
            <div className="k-actions">
              <button className="btn btn--green btn--sm" onClick={() => void switchTo(repId)} data-testid="open-game-panel">
                ورود به پنل بازی این ویزیتور
              </button>
              <button className="btn btn--ghost btn--sm" onClick={remote.reload}>
                بازخوانی
              </button>
            </div>
          </div>
          <RepDashboard detail={detail} />
        </div>
      )}
    </Remoted>
  );
}
