import i18n, {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  changeAppLanguage,
  isSupportedLanguage as isSupportedLocale,
  languageOptions,
} from '../i18n';

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function t(key, locale = DEFAULT_LANGUAGE, params = {}) {
  let language = locale;
  let values = params;

  if (locale && typeof locale === 'object' && !Array.isArray(locale)) {
    language = DEFAULT_LANGUAGE;
    values = locale;
  }

  const lng = isSupportedLocale(language) ? language : DEFAULT_LANGUAGE;
  const translated = i18n.getFixedT(lng)(key, values);
  if (translated && translated !== key) return translated;

  const fallback = i18n.getFixedT(DEFAULT_LANGUAGE)(key, values);
  return fallback && fallback !== key ? fallback : key;
}

export function translateCategory(label, locale = DEFAULT_LANGUAGE) {
  if (!label) return '';
  const slug = slugify(label);
  const fromSlug = t(`categories.${slug}`, locale);
  if (fromSlug && fromSlug !== `categories.${slug}`) return fromSlug;
  const fromGroup = t(`categoryGroups.${label}`, locale);
  if (fromGroup && fromGroup !== `categoryGroups.${label}`) return fromGroup;
  return label;
}

export const defaultLanguage = DEFAULT_LANGUAGE;
export const supportedLanguages = languageOptions;
export const languageStorageKey = LANGUAGE_STORAGE_KEY;
export const supportedLanguageCodes = SUPPORTED_LANGUAGES;

export function isSupportedLanguage(locale) {
  return isSupportedLocale(locale);
}

export { changeAppLanguage };

export const translations = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((code) => [code, true])
);
