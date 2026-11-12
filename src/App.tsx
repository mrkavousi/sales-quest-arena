import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppLayout, ToastHost } from './components/AppLayout';
import { PwaUpdateNotice } from './components/PwaUpdateNotice';
import { ArenaPage } from './pages/ArenaPage';
import { HistoryPage } from './pages/HistoryPage';
import { MissionsPage } from './pages/MissionsPage';
import { PlayPage, ResultPage } from './pages/PlayPage';
import { ProfilePage } from './pages/ProfilePage';
import { WelcomePage } from './pages/WelcomePage';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { PwaProvider } from './pwa/PwaContext';
import { addRouteGuard, useRoute, type Route } from './router';
import { GameProvider, useGame } from './state/GameContext';
import { isTribalEnabled } from './tribal/feature';
import { followHash, gameRoutePath } from './tribal/navigation';
import { TribalPage } from './tribal/TribalPage';

function Screens({ routeOverride }: { routeOverride?: Route }) {
  const { progress } = useGame();
  const currentRoute = useRoute();
  const route = routeOverride ?? currentRoute;

  if (!progress.player.onboarded) return <WelcomePage />;
  if (route.name === 'play') return <PlayPage key={route.param} missionId={route.param} />;
  if (route.name === 'result') return <ResultPage key={route.param} entryId={route.param} />;

  return (
    <AppLayout route={route.name}>
      {route.name === 'arena' && <ArenaPage />}
      {route.name === 'missions' && <MissionsPage />}
      {route.name === 'history' && <HistoryPage />}
      {route.name === 'profile' && <ProfilePage />}
    </AppLayout>
  );
}

function GameApp({ routeOverride, isolateScreens = false }: { routeOverride?: Route; isolateScreens?: boolean }) {
  const screens = <Screens routeOverride={routeOverride} />;
  return (
    <GameProvider>
      <PwaProvider>
        {isolateScreens ? <div className="tribal-game-view">{screens}</div> : screens}
        <PwaUpdateNotice />
        <ToastHost />
      </PwaProvider>
    </GameProvider>
  );
}

/**
 * Keep the game provider and its current screen mounted behind the read-only
 * shell. A mission/result or modal dialog must be closed first: otherwise an
 * active draft, global keyboard listener, or portaled dialog could leak across routes.
 */
function TribalEnabledApp() {
  const { t } = useLanguage();
  const route = useRoute();
  const lastGameRoute = useRef<Route>(route.name === 'tribal' ? { name: 'arena', param: null } : route);
  const entry = useRef<HTMLAnchorElement>(null);
  const wasShowingTribal = useRef(false);
  const [warning, setWarning] = useState<'mission' | 'dialog' | null>(null);

  const gameRoute = route.name === 'tribal' ? lastGameRoute.current : route;
  const isGameInProgress = gameRoute.name === 'play' || gameRoute.name === 'result';
  const showingTribal = route.name === 'tribal';
  const showEntry = !showingTribal && !isGameInProgress;

  useLayoutEffect(() => {
    if (route.name !== 'tribal') lastGameRoute.current = route;
  }, [route]);

  useLayoutEffect(() => addRouteGuard((previous, next) => {
    if (next.name !== 'tribal') return true;
    if (previous.name === 'play' || previous.name === 'result') {
      setWarning('mission');
      return false;
    }
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      setWarning('dialog');
      return false;
    }
    return true;
  }), []);

  useLayoutEffect(() => {
    if (wasShowingTribal.current && !showingTribal) entry.current?.focus();
    wasShowingTribal.current = showingTribal;
  }, [showingTribal]);

  useEffect(() => {
    if (route.name !== 'tribal' && !isGameInProgress && !document.querySelector('[role="dialog"][aria-modal="true"]')) setWarning(null);
  }, [route.name, isGameInProgress]);

  return (
    <>
      {showEntry && (
        <div className="tribal-entry">
          <a ref={entry} className="btn btn--ghost btn--sm" href="#/tribal" onClick={(event) => followHash(event, '/tribal')}>
            {t('tribal.entry')}
          </a>
        </div>
      )}
      <div className={`tribal-game-layer${showingTribal ? ' tribal-game-layer--hidden' : ''}`}>
        <GameApp routeOverride={gameRoute} isolateScreens />
      </div>
      {showingTribal && <TribalPage returnPath={gameRoutePath(gameRoute)} />}
      {warning && !showingTribal && (
        <div className="toasts tribal-guard" role="alert">
          <div className="toast toast--warn">
            <span>{t(warning === 'mission' ? 'tribal.finishMission' : 'tribal.closeDialog')}</span>
            <button type="button" onClick={() => setWarning(null)}>{t('common.close')}</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      {isTribalEnabled() ? <TribalEnabledApp /> : <GameApp />}
    </LanguageProvider>
  );
}
