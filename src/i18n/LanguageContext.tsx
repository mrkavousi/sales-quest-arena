import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGUAGE_STORAGE_KEY, formatNumber, resolveLanguage, translate, type Language, type MessageParams } from './locale';
import type { MessageKey } from './messages';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
  n: (value: number) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

function initialLanguage(): Language {
  try {
    return resolveLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY), browserLanguages());
  } catch {
    return resolveLanguage(null, browserLanguages());
  }
}

/** Language is a device preference, independent of the player's saved progress. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setCurrentLanguage] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // The current session still works when storage is blocked.
    }
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.title = translate(language, 'app.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', translate(language, 'app.description'));
  }, [language]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea !== window.localStorage || (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null)) return;
        setCurrentLanguage(resolveLanguage(event.key === null ? null : event.newValue, browserLanguages()));
      } catch {
        // Storage may be unavailable in embedded/private browsing contexts.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const t = useCallback((key: MessageKey, params?: MessageParams) => translate(language, key, params), [language]);
  const n = useCallback((value: number) => formatNumber(language, value), [language]);
  const value = useMemo(() => ({ language, setLanguage, t, n }), [language, setLanguage, t, n]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return context;
}
