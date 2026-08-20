import { t, translateCategory } from '../lib/translations';

/** Display helpers kept for legacy labels; category lists load from GET /api/service-categories. */
export const getCategoryDisplayLabel = (slugOrLabel, language) => translateCategory(slugOrLabel, language);

export const getCategoryGroupDisplayLabel = (label, language) => {
  const translated = t(`categoryGroups.${label}`, language);
  return translated === `categoryGroups.${label}` ? label : translated;
};

/** @deprecated Prefer useServiceCategories / categoriesApi.list() */
export const SERVICE_CATEGORY_GROUPS = [];

/** @deprecated Prefer useServiceCategories / categoriesApi.list() */
export const SERVICE_CATEGORY_TUPLES = [];
