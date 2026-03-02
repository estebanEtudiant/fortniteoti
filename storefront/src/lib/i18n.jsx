import React, { createContext, useContext, useState, useCallback } from 'react';

import fr from '../i18n/fr.json';
import en from '../i18n/en.json';

const LOCALES = { fr, en };
const STORAGE_KEY = 'ftn_lang';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LOCALES[saved] ? saved : 'fr';
  });

  const setLang = useCallback((l) => {
    if (LOCALES[l]) {
      localStorage.setItem(STORAGE_KEY, l);
      setLangState(l);
    }
  }, []);

  const t = useCallback((key, fallback) => {
    const locale = LOCALES[lang] || fr;
    return locale[key] ?? fr[key] ?? fallback ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used inside I18nProvider');
  return ctx;
}
