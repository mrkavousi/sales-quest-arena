import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/AppLayout';
import { useLanguage } from '../i18n/LanguageContext';
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
  const { t } = useLanguage();
  if (!user) return null;
  const isAdmin = user.position === 'admin';
  const tab = route.name === 'import' ? 'imports' : route.name === 'branch' || route.name === 'rep' || route.name === 'arena' ? 'dash' : route.name;

  const tabs = [
    { key: 'dash', label: t('k.nav.dashboard'), path: '/' },
    ...(isAdmin ? [{ key: 'imports', label: t('k.nav.imports'), path: '/imports' }] : []),
    { key: 'board', label: t('k.nav.board'), path: '/board' },
  ];

  return (
    <div className="k-app">
      <header className="k-top">
        <button className="k-top__brand" onClick={() => navigate('/')} aria-label={t('k.homeAria')}>
          <Logo />
        </button>
        <nav className="k-top__tabs" aria-label={t('k.nav.main')}>
          {tabs.map((tb) => (
            <a key={tb.key} href={`#${tb.path}`} className={`k-top__tab${tab === tb.key ? ' is-active' : ''}`} aria-current={tab === tb.key ? 'page' : undefined}>
              {tb.label}
            </a>
          ))}
        </nav>
        <div className="k-top__user">
          <span>
            <b dir="auto" data-testid="whoami">{user.name}</b>
            <small>{user.title}</small>
          </span>
          <LanguageSwitcher />
          <button className="btn btn--ghost btn--sm" onClick={() => void logout()}>
            {t('k.signOut')}
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
