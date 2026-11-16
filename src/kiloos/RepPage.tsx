import type { RepDetail } from '../api/types';
import { navigate } from '../router';
import { DemoBanner, Remoted, useApi } from './ui';
import { RepDashboard } from './RepDashboard';

/** Management drill-down: a representative's dashboard, scoped by the server to the viewer's hierarchy. */
export function RepPage({ repId }: { repId: string }) {
  const remote = useApi<RepDetail>(`/api/v1/mgmt/reps/${encodeURIComponent(repId)}`);
  return (
    <Remoted remote={remote} what="representative">
      {(detail) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate(`/branch/${detail.rep.branch_code}`)}>
                ← {detail.rep.branch_name ?? 'Branch'}
              </button>
              <h1 dir="auto" data-testid="rep-title">
                {detail.rep.name} <small>{detail.rep.employee_code} · Supervisor: <span dir="auto">{detail.rep.supervisor ?? '—'}</span></small>
              </h1>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={remote.reload}>
              Refresh
            </button>
          </div>
          <RepDashboard detail={detail} />
        </div>
      )}
    </Remoted>
  );
}
