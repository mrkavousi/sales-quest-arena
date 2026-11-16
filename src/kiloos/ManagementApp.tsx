import { Logo } from '../components/AppLayout';
import { POSITION_FA } from '../i18n';
import { navigate, useRoute, type RouteName } from '../router';
import { useSession } from '../state/SessionContext';
import { OrgPage, PointsPage, SalesPage, TeamsPage, UsersPage } from './AdminPages';
import { ActivityPage } from './ActivityPage';
import { BranchPage } from './BranchPage';
import { ImportPage } from './ImportPage';
import { ImportsPage } from './ImportsPage';
import { LeaderboardPage } from './LeaderboardPage';
import { MissionsAdminPage } from './MissionsAdminPage';
import { OverviewPage } from './OverviewPage';
import { RepPage } from './RepPage';

interface Section {
  key: string;
  label: string;
  path: string;
  routes: RouteName[];
  adminOnly?: boolean;
  icon: string;
}

/** The ten admin sections. Non-administrators see the subset the server lets them read. */
const SECTIONS: Section[] = [
  { key: 'dash', label: 'داشبورد مدیریت', path: '/', routes: ['arena', 'branch'], icon: '📊' },
  { key: 'org', label: 'سازمان و ساختار شعب', path: '/org', routes: ['org'], icon: '🏢' },
  { key: 'users', label: 'کاربران و ویزیتورها', path: '/users', routes: ['users', 'rep'], icon: '👥' },
  { key: 'teams', label: 'تیم‌ها و سرپرستان', path: '/teams', routes: ['teams'], icon: '🧭' },
  { key: 'manage', label: 'مأموریت‌ها و چالش‌ها', path: '/manage', routes: ['missionsadmin'], adminOnly: true, icon: '🎯' },
  { key: 'sales', label: 'عملکرد فروش', path: '/sales', routes: ['sales'], icon: '📈' },
  { key: 'board', label: 'رتبه‌بندی و رقابت', path: '/board', routes: ['board'], icon: '🏆' },
  { key: 'points', label: 'امتیازها و دستاوردها', path: '/points', routes: ['points'], icon: '⭐' },
  { key: 'activity', label: 'گزارش فعالیت‌ها', path: '/activity', routes: ['activity'], icon: '🕘' },
  { key: 'imports', label: 'مرکز ورود و بررسی اطلاعات', path: '/imports', routes: ['imports', 'import'], adminOnly: true, icon: '📥' },
];

/** Management experience: administrator, management, branch managers and supervisors (server-scoped). */
export function ManagementApp() {
  const { user } = useSession();
  const route = useRoute();
  if (!user) return null;
  const isAdmin = user.position === 'admin';
  const sections = SECTIONS.filter((section) => isAdmin || !section.adminOnly);
  const active = sections.find((section) => section.routes.includes(route.name)) ?? sections[0];

  let page;
  if (route.name === 'branch' && route.param) page = <BranchPage key={route.param} code={route.param} />;
  else if (route.name === 'rep' && route.param) page = <RepPage key={route.param} repId={route.param} />;
  else if (route.name === 'imports' && isAdmin) page = <ImportsPage />;
  else if (route.name === 'import' && route.param && isAdmin) page = <ImportPage key={route.param} importId={route.param} />;
  else if (route.name === 'missionsadmin' && isAdmin) page = <MissionsAdminPage />;
  else if (route.name === 'board') page = <LeaderboardPage onOpenRep={(id) => navigate(`/rep/${id}`)} />;
  else if (route.name === 'org') page = <OrgPage />;
  else if (route.name === 'users') page = <UsersPage />;
  else if (route.name === 'teams') page = <TeamsPage />;
  else if (route.name === 'sales') page = <SalesPage />;
  else if (route.name === 'points') page = <PointsPage />;
  else if (route.name === 'activity') page = <ActivityPage />;
  else page = <OverviewPage />;

  return (
    <div className="adm">
      <aside className="adm__side" aria-label="بخش‌های پنل مدیریت">
        <button className="adm__brand" onClick={() => navigate('/')} aria-label="صفحه اصلی کیلوس">
          <Logo />
        </button>
        <div className="adm__who">
          <b dir="auto">{user.name}</b>
          <small>{POSITION_FA[user.position]}</small>
        </div>
        <nav className="adm__nav">
          {sections.map((section) => (
            <a key={section.key} href={`#${section.path}`} className={`adm__link${active.key === section.key ? ' is-active' : ''}`} aria-current={active.key === section.key ? 'page' : undefined} data-testid={`nav-${section.key}`}>
              <span aria-hidden="true">{section.icon}</span>
              <span>{section.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <main className="adm__main" id="admin-main">
        {page}
      </main>
    </div>
  );
}
