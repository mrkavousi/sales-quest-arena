import { useLayoutEffect, useRef } from 'react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Icon } from '../components/ui/Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { followHash } from './navigation';
import { TribalOverview } from './TribalOverview';

/** No authentication, API call or live/sample data is connected to this shell. */
export function TribalPage({ returnPath }: { returnPath: string }) {
  const { language, t } = useLanguage();
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => { main.current?.focus(); }, []);

  return (
    <main className="tribal-page" ref={main} tabIndex={-1} aria-labelledby="tribal-page-heading">
      <div className="tribal-page__inner">
        <header className="tribal-page__top">
          <a className="btn btn--ghost btn--sm" href={`#${returnPath}`} onClick={(event) => followHash(event, returnPath)}>
            <Icon name="back" size={18} />{t('tribal.back')}
          </a>
          <LanguageSwitcher />
        </header>
        <div className="tribal-page__heading">
          <h1 id="tribal-page-heading">{t('tribal.title')}</h1>
        </div>
        <TribalOverview view={null} language={language} />
      </div>
    </main>
  );
}
