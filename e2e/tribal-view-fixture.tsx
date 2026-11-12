// Test-only Vite entry: the test injects all data at runtime. This is never
// imported by the application or copied into its production build.
import { createRoot } from 'react-dom/client';
import type { Language } from '../src/i18n/locale';
import { TribalOverview } from '../src/tribal/TribalOverview';
import type { TribalOverviewView } from '../src/tribal/view';
import '@fontsource-variable/vazirmatn/index.css';
import '../src/styles/tokens.css';
import '../src/styles/base.css';
import '../src/styles/ui.css';
import '../src/styles/i18n.css';
import '../src/styles/tribal.css';

if (!import.meta.env.DEV || import.meta.env.VITE_TRIBAL_ENABLED !== 'true') {
  throw new Error('This sample-data fixture is available only in flag-on tests.');
}

const root = createRoot(document.getElementById('root')!);
(window as Window & { renderTribalFixture: (view: TribalOverviewView | null, language: Language) => void }).renderTribalFixture = (view, language) => {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  root.render(
    <main className="tribal-page">
      <div className="tribal-page__inner">
        <h1>Test fixture — sample data</h1>
        <TribalOverview view={view} language={language} />
      </div>
    </main>,
  );
};
