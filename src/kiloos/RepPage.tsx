import type { RepDetail } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { DemoBanner, Remoted, useApi } from './ui';
import { RepDashboard } from './RepDashboard';

/** Management drill-down: a representative's dashboard, scoped by the server to the viewer's hierarchy. */
export function RepPage({ repId }: { repId: string }) {
  const { t } = useLanguage();
  const remote = useApi<RepDetail>(`/api/v1/mgmt/reps/${encodeURIComponent(repId)}`);
  return (
    <Remoted remote={remote}>
      {(detail) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <div>
              <button className="k-link" onClick={() => navigate(`/branch/${detail.rep.branch_code}`)}>
                {t('k.rp.back', { name: detail.rep.branch_name ?? t('k.rp.branchFallback') })}
              </button>
              <h1 dir="auto" data-testid="rep-title">
                {detail.rep.name} <small>{detail.rep.employee_code} · {t('k.rp.supervisor')} <span dir="auto">{detail.rep.supervisor ?? '—'}</span></small>
              </h1>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={remote.reload}>
              {t('k.refresh')}
            </button>
          </div>
          <RepDashboard detail={detail} />
        </div>
      )}
    </Remoted>
  );
}
