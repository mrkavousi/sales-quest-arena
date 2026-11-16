import type { RepDetail } from '../api/types';
import { RepDashboard } from './RepDashboard';
import { DemoBanner, Remoted, useApi } from './ui';

/** Employee dashboard (inside the game shell): the signed-in representative's own numbers. */
export function MePage() {
  const remote = useApi<RepDetail>('/api/v1/me/performance');
  return (
    <div className="pagebody k-stack">
      <h1 className="k-pagetitle">عملکرد من</h1>
      <DemoBanner />
      <Remoted remote={remote} what="عملکرد شما">
        {(detail) => <RepDashboard detail={detail} isSelf />}
      </Remoted>
    </div>
  );
}
