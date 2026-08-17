/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { defaultLanguage, isSupportedLanguage } from '../lib/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('preferredLanguage');
    return isSupportedLanguage(saved) ? saved : defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
    document.documentElement.lang = language === 'rw' ? 'rw' : language === 'fr' ? 'fr' : 'en';
  }, [language]);

  const value = {
    language,
    setLanguage: (nextLanguage) => {
      if (isSupportedLanguage(nextLanguage)) {
        setLanguage(nextLanguage);
      }
    },
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
