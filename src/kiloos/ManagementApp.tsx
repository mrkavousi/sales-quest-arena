import { Logo } from '../components/AppLayout';
import { navigate, useRoute } from '../router';
import { useSession } from '../state/SessionContext';
import { BranchPage } from './BranchPage';
import { ImportPage } from './ImportPage';
import { ImportsPage } from './ImportsPage';
import { LeaderboardPage } from './LeaderboardPage';
import { OverviewPage } from './OverviewPage';
import { RepPage } from './RepPage';

/** Management experience: admin, management, branch managers and supervisors (server-scoped). */
export function ManagementApp() {
  const { user, logout } = useSession();
  const route = useRoute();
  if (!user) return null;
  const isAdmin = user.position === 'admin';
  const tab = route.name === 'import' ? 'imports' : route.name === 'branch' || route.name === 'rep' || route.name === 'arena' ? 'dash' : route.name;

  const tabs = [
    { key: 'dash', label: 'Dashboard', path: '/' },
    ...(isAdmin ? [{ key: 'imports', label: 'Excel import', path: '/imports' }] : []),
    { key: 'board', label: 'Leaderboard', path: '/board' },
  ];

  return (
    <div className="k-app">
      <header className="k-top">
        <button className="k-top__brand" onClick={() => navigate('/')} aria-label="Kiloos home">
          <Logo />
        </button>
        <nav className="k-top__tabs" aria-label="Main">
          {tabs.map((t) => (
            <a key={t.key} href={`#${t.path}`} className={`k-top__tab${tab === t.key ? ' is-active' : ''}`} aria-current={tab === t.key ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
        <div className="k-top__user">
          <span>
            <b dir="auto" data-testid="whoami">{user.name}</b>
            <small>{user.title}</small>
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="k-main">
        {route.name === 'branch' && route.param ? (
          <BranchPage key={route.param} code={route.param} />
        ) : route.name === 'rep' && route.param ? (
          <RepPage key={route.param} repId={route.param} />
        ) : route.name === 'imports' && isAdmin ? (
          <ImportsPage />
        ) : route.name === 'import' && route.param && isAdmin ? (
          <ImportPage key={route.param} importId={route.param} />
        ) : route.name === 'board' ? (
          <LeaderboardPage onOpenRep={(id) => navigate(`/rep/${id}`)} />
        ) : (
          <OverviewPage />
        )}
      </main>
    </div>
  );
}
