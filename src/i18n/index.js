import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/translation.json';
import rw from '../locales/rw/translation.json';
import fr from '../locales/fr/translation.json';
import sw from '../locales/sw/translation.json';

export const LANGUAGE_STORAGE_KEY = 'preferredLanguage';
export const SUPPORTED_LANGUAGES = ['en', 'rw', 'fr', 'sw'];
export const DEFAULT_LANGUAGE = 'en';

export const languageOptions = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'rw', label: 'Kinyarwanda', shortLabel: 'RW' },
  { code: 'fr', label: 'Français', shortLabel: 'FR' },
  { code: 'sw', label: 'Kiswahili', shortLabel: 'SW' },
];

export const isSupportedLanguage = (locale) => SUPPORTED_LANGUAGES.includes(String(locale || '').toLowerCase());

const readStoredLanguage = () => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    rw: { translation: rw },
    fr: { translation: fr },
    sw: { translation: sw },
  },
  lng: typeof window === 'undefined' ? DEFAULT_LANGUAGE : readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
    prefix: '{',
    suffix: '}',
    skipOnVariables: true,
  },
  returnNull: false,
  returnEmptyString: false,
});

export const changeAppLanguage = (locale) => {
  const next = isSupportedLanguage(locale) ? locale : DEFAULT_LANGUAGE;
  if (i18n.language !== next) {
    void i18n.changeLanguage(next);
  }
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
  }
  return next;
};

export default i18n;
