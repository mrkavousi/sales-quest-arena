import { GAME_MODE } from './api/client';
import { AppLayout, ToastHost } from './components/AppLayout';
import { LeaderboardPage } from './kiloos/LeaderboardPage';
import { LoginPage } from './kiloos/LoginPage';
import { ManagementApp } from './kiloos/ManagementApp';
import { MePage } from './kiloos/MePage';
import { ArenaPage } from './pages/ArenaPage';
import { HistoryPage } from './pages/HistoryPage';
import { MissionsPage } from './pages/MissionsPage';
import { PlayPage, ResultPage } from './pages/PlayPage';
import { ProfilePage } from './pages/ProfilePage';
import { WelcomePage } from './pages/WelcomePage';
import { useRoute } from './router';
import { GameProvider, useGame } from './state/GameContext';
import { ServerGameProvider } from './state/ServerGameContext';
import { SessionProvider, useSession } from './state/SessionContext';

function Screens() {
  const { progress } = useGame();
  const route = useRoute();

  if (!progress.player.onboarded) return <WelcomePage />;
  if (route.name === 'play') return <PlayPage key={route.param} missionId={route.param} />;
  if (route.name === 'result') return <ResultPage key={route.param} entryId={route.param} />;

  return (
    <AppLayout route={route.name}>
      {route.name === 'arena' && <ArenaPage />}
      {route.name === 'missions' && <MissionsPage />}
      {route.name === 'history' && <HistoryPage />}
      {route.name === 'profile' && <ProfilePage />}
      {route.name === 'me' && <MePage />}
      {route.name === 'board' && (
        <div className="pagebody">
          <h1 className="k-pagetitle">Leaderboard</h1>
          <LeaderboardPage />
        </div>
      )}
    </AppLayout>
  );
}

/** Local-only prototype: progress lives in this browser (original behaviour, unchanged). */
function LocalApp() {
  return (
    <GameProvider>
      <Screens />
      <ToastHost />
    </GameProvider>
  );
}

function Splash({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="boot" role="status" aria-live="polite">
      {onRetry ? (
        <>
          <h1>Can’t reach Kiloos</h1>
          <p>{message}</p>
          <div className="boot__actions">
            <button className="btn btn--green" onClick={onRetry}>
              Try again
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="boot__spinner" aria-hidden="true" />
          <p>{message}</p>
        </>
      )}
    </div>
  );
}

/** Unified Kiloos app: one origin, role-based experience, server-authoritative game. */
function ServerApp() {
  const session = useSession();
  if (session.status === 'loading') return <Splash message="Starting Kiloos…" />;
  if (session.status === 'error') return <Splash message={session.error ?? 'The server did not respond.'} onRetry={session.retry} />;
  if (session.status === 'anonymous' || session.status === 'expired' || !session.user) return <LoginPage expired={session.status === 'expired'} />;
  if (session.user.experience === 'management') return <ManagementApp />;
  return (
    <ServerGameProvider>
      <Screens />
      <ToastHost />
    </ServerGameProvider>
  );
}

export default function App() {
  if (GAME_MODE === 'local') return <LocalApp />;
  return (
    <SessionProvider>
      <ServerApp />
    </SessionProvider>
  );
}
