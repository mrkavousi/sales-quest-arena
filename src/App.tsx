import { AppLayout, ToastHost } from './components/AppLayout';
import { ArenaPage } from './pages/ArenaPage';
import { HistoryPage } from './pages/HistoryPage';
import { MissionsPage } from './pages/MissionsPage';
import { PlayPage, ResultPage } from './pages/PlayPage';
import { ProfilePage } from './pages/ProfilePage';
import { WelcomePage } from './pages/WelcomePage';
import { LanguageProvider } from './i18n/LanguageContext';
import { useRoute } from './router';
import { GameProvider, useGame } from './state/GameContext';

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
    </AppLayout>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <GameProvider>
        <Screens />
        <ToastHost />
      </GameProvider>
    </LanguageProvider>
  );
}
