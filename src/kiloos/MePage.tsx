import type { RepDetail } from '../api/types';
import { useLanguage } from '../i18n/LanguageContext';
import { DemoBanner, Remoted, useApi } from './ui';
import { RepDashboard } from './RepDashboard';

/** Employee dashboard (inside the game shell): the signed-in representative's own numbers. */
export function MePage() {
  const { t } = useLanguage();
  const remote = useApi<RepDetail>('/api/v1/me/performance');
  return (
    <div className="pagebody k-stack">
      <h1 className="k-pagetitle">{t('k.me.title')}</h1>
      <DemoBanner />
      <Remoted remote={remote}>
        {(detail) => <RepDashboard detail={detail} isSelf />}
      </Remoted>
    </div>
  );
}
