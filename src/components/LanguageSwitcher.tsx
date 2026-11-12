import { useLanguage } from '../i18n/LanguageContext';

/** Explicit bilingual choices, usable before onboarding and while a run is paused. */
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
      <button type="button" lang="en" dir="ltr" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
        English
      </button>
      <button type="button" lang="fa" dir="rtl" aria-pressed={language === 'fa'} onClick={() => setLanguage('fa')}>
        فارسی
      </button>
    </div>
  );
}
