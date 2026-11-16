import { jdateTime, n } from '../i18n';
import { navigate } from '../router';
import { achievementName, levelTitle, questName } from './OverviewPage';
import { Card, DemoBanner, EmptyState, Remoted, StatusChip, useApi } from './ui';

interface ActivityItem {
  kind: 'mission' | 'level' | 'quest' | 'achievement';
  user_id: string;
  name: string;
  title: string;
  xp: number | null;
  at: string;
}

interface ActivityResponse {
  items: ActivityItem[];
  imports: { id: string; file_name: string; status: string; created_at: string; counts: { total: number; processed: number } }[];
}

const ICON: Record<ActivityItem['kind'], string> = { mission: '✅', level: '🚀', quest: '🎁', achievement: '🏅' };

function sentence(item: ActivityItem): string {
  switch (item.kind) {
    case 'mission':
      return `مأموریت «${item.title}» را تکمیل کرد`;
    case 'level':
      return `به سطح ${n(Number(item.title))} (${levelTitle(Number(item.title))}) رسید`;
    case 'quest':
      return `چالش هفتگی «${questName(item.title)}» را دریافت کرد`;
    default:
      return `نشان «${achievementName(item.title)}» را کسب کرد`;
  }
}

/** ۹ · Activity log: what the visitors in the viewer's scope did, newest first. */
export function ActivityPage() {
  const remote = useApi<ActivityResponse>('/api/v1/mgmt/activity');
  return (
    <Remoted remote={remote} what="گزارش فعالیت‌ها">
      {(data) => (
        <div className="k-stack">
          <DemoBanner />
          <div className="k-toolbar">
            <h1>
              گزارش فعالیت‌ها <small>تازه‌ترین رویدادهای بازی ویزیتورها</small>
            </h1>
            <button className="btn btn--ghost btn--sm" onClick={remote.reload}>
              بازخوانی
            </button>
          </div>
          <div className="k-grid2">
            <Card title="فعالیت ویزیتورها">
              {data.items.length === 0 ? (
                <EmptyState>هنوز فعالیتی ثبت نشده است. وقتی ویزیتورها مأموریت انجام دهند اینجا دیده می‌شود.</EmptyState>
              ) : (
                <ol className="act-list" data-testid="activity-list">
                  {data.items.map((item, i) => (
                    <li key={`${item.kind}-${item.at}-${i}`} className={`act act--${item.kind}`}>
                      <span className="act__icon" aria-hidden="true">
                        {ICON[item.kind]}
                      </span>
                      <div>
                        <button className="k-link" dir="auto" onClick={() => navigate(`/rep/${item.user_id}`)}>
                          {item.name}
                        </button>{' '}
                        {sentence(item)}
                        {item.xp !== null && <b className="act__xp"> +{n(item.xp)} امتیاز تجربه</b>}
                        <small>{jdateTime(item.at)}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            {data.imports.length > 0 && (
              <Card title="آخرین ورود اطلاعات">
                <ul className="adm-list">
                  {data.imports.map((i) => (
                    <li key={i.id}>
                      <button className="k-link" onClick={() => navigate(`/import/${i.id}`)}>
                        {i.file_name}
                      </button>
                      <span>
                        <StatusChip status={i.status} /> <small>{n(i.counts.processed)} از {n(i.counts.total)} ردیف · {jdateTime(i.created_at)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </Remoted>
  );
}
