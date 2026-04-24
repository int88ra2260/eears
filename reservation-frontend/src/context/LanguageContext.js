import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { LANG_ZH, LANG_EN, translations, getTranslation } from '../constants/translations';

const STORAGE_KEY = 'eears_lang';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === LANG_EN || saved === LANG_ZH) return saved;
    } catch (e) {}
    return LANG_ZH;
  });

  const setLang = useCallback((newLang) => {
    if (newLang !== LANG_ZH && newLang !== LANG_EN) return;
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {}
  }, []);

  const t = useCallback(
    (path) => getTranslation(lang, path),
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, isZh: lang === LANG_ZH, isEn: lang === LANG_EN }),
    [lang, setLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}

export { LANG_ZH, LANG_EN };
