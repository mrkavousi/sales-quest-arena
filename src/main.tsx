import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/vazirmatn/index.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/arena.css';
import './styles/pages.css';
import './styles/play.css';
import './styles/i18n.css';
import './styles/pwa.css';
import './styles/connection.css';
import './styles/tribal.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
