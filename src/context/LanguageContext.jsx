/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import i18n, { DEFAULT_LANGUAGE, changeAppLanguage, isSupportedLanguage } from '../i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('preferredLanguage');
      return isSupportedLanguage(saved) ? saved : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  useEffect(() => {
    changeAppLanguage(language);
  }, [language]);

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage) => {
      if (isSupportedLanguage(nextLanguage) && nextLanguage !== language) {
        setLanguageState(nextLanguage);
      }
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        if (isSupportedLanguage(nextLanguage)) {
          setLanguageState(nextLanguage);
        }
      },
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
