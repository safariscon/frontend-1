export function emptyListingAttributes(schema = []) {
  return Object.fromEntries((schema || []).map((field) => [field.id, defaultFieldValue(field)]));
}

export function defaultFieldValue(field) {
  if (field?.type === 'checkbox') return [];
  if (field?.type === 'boolean') return false;
  if (field?.type === 'number') return '';
  return '';
}

export function validateSchemaValues(schema = [], values = {}) {
  const errors = {};
  (schema || []).forEach((field) => {
    if (!field?.required) return;
    const value = values?.[field.id];
    if (field.type === 'checkbox') {
      if (!Array.isArray(value) || !value.length) errors[field.id] = `${field.label} is required.`;
      return;
    }
    if (field.type === 'boolean') return;
    if (value === undefined || value === null || String(value).trim() === '') {
      errors[field.id] = `${field.label} is required.`;
    }
  });
  return errors;
}

export function sortSchemaFields(schema = []) {
  return [...(schema || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

export function categoryLabel(category) {
  return category?.name || category?.slug || 'Category';
}

export function getServiceCover(service) {
  if (!service) return '';
  if (service.primaryImage) return service.primaryImage;
  const first = Array.isArray(service.images) ? service.images.find(Boolean) : '';
  return typeof first === 'string' ? first : first?.url || '';
}

/** Prefer stable categoryId; resolve slug → id from a loaded categories list. */
export function resolveCategoryId(categories = [], key) {
  if (!key) return '';
  const match = (categories || []).find(
    (item) => String(item._id) === String(key) || item.slug === key
  );
  return match?._id ? String(match._id) : String(key);
}

export function serviceCategoryLabel(service) {
  return service?.categoryName
    || service?.category?.name
    || service?.categorySlug
    || service?.type
    || service?.category
    || 'Category';
}

export function serviceCategoryId(service) {
  return String(service?.categoryId || service?.category?._id || '');
}

/** Parse supportsOptions without treating the string "false" as true. Default: true. */
export function parseSupportsOptions(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value === false || value === 0) return false;
  if (value === true || value === 1) return true;
  const text = String(value).trim().toLowerCase();
  if (text === 'false' || text === '0' || text === 'no' || text === 'off') return false;
  if (text === 'true' || text === '1' || text === 'yes' || text === 'on') return true;
  return Boolean(value);
}

/** First explicit supportsOptions from service / category / snapshot; defaults to true. */
export function categorySupportsOptions(...candidates) {
  for (const value of candidates) {
    const parsed = parseSupportsOptions(value);
    if (parsed !== null) return parsed;
  }
  return true;
}

export function emptyServiceLocation() {
  return {
    country: '',
    countryCode: '',
    state: '',
    city: '',
    area: '',
    placeName: '',
    referenceName: '',
    formattedAddress: '',
    fullAddress: '',
    latitude: null,
    longitude: null,
    latitudeRaw: '',
    longitudeRaw: '',
    placeId: '',
    locationSource: 'search',
    isExactLocationVerified: false,
  };
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function firstCoordinate(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

/**
 * Rebuild the picker value from a saved service.
 * `service.location` is a legacy display string on the API, so it is only used as an
 * address fallback and never spread as an object.
 */
export function resolveServiceLocation(service) {
  const base = emptyServiceLocation();
  if (!service) return base;

  const catalog = service.catalogLocation && typeof service.catalogLocation === 'object' ? service.catalogLocation : {};
  const legacy = service.serviceLocation && typeof service.serviceLocation === 'object' ? service.serviceLocation : {};
  const details = service.locationDetails && typeof service.locationDetails === 'object' ? service.locationDetails : {};
  const contact = service.contactDetails && typeof service.contactDetails === 'object' ? service.contactDetails : {};
  const inline = service.location && typeof service.location === 'object' ? service.location : {};
  const locationLine = typeof service.location === 'string' ? service.location : '';

  const latitude = firstCoordinate(inline.latitude, catalog.latitude, legacy.latitude, contact.latitude);
  const longitude = firstCoordinate(inline.longitude, catalog.longitude, legacy.longitude, contact.longitude);
  const address = firstText(
    inline.formattedAddress,
    inline.fullAddress,
    catalog.formattedAddress,
    legacy.formattedAddress,
    legacy.fullAddress,
    contact.exactAddress,
    locationLine
  );

  return {
    ...base,
    country: firstText(inline.country, catalog.country, legacy.country),
    countryCode: firstText(inline.countryCode, catalog.countryCode),
    state: firstText(inline.state, inline.province, catalog.state, legacy.province, details.province),
    city: firstText(inline.city, inline.district, catalog.city, legacy.district, details.district),
    area: firstText(inline.area, inline.sector, catalog.area, legacy.sector, details.sector),
    placeName: firstText(inline.placeName, catalog.placeName, legacy.name),
    referenceName: firstText(inline.referenceName, inline.landmark, catalog.referenceName, legacy.referenceName),
    formattedAddress: address,
    fullAddress: address,
    latitude,
    longitude,
    latitudeRaw: firstText(inline.latitudeRaw, catalog.latitudeRaw, legacy.latitudeRaw) || (latitude === null ? '' : String(latitude)),
    longitudeRaw: firstText(inline.longitudeRaw, catalog.longitudeRaw, legacy.longitudeRaw) || (longitude === null ? '' : String(longitude)),
    placeId: firstText(inline.placeId, catalog.placeId, legacy.placeId),
    locationSource: firstText(inline.locationSource, catalog.locationSource, legacy.locationSource) || 'search',
    isExactLocationVerified: Boolean(
      inline.isExactLocationVerified
      ?? catalog.isExactLocationVerified
      ?? legacy.isExactLocationVerified
      ?? (latitude !== null && longitude !== null)
    ),
  };
}

export function buildLocationPayload(location = {}) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    latitudeRaw: location.latitudeRaw != null && location.latitudeRaw !== ''
      ? String(location.latitudeRaw)
      : (Number.isFinite(latitude) ? String(latitude) : ''),
    longitudeRaw: location.longitudeRaw != null && location.longitudeRaw !== ''
      ? String(location.longitudeRaw)
      : (Number.isFinite(longitude) ? String(longitude) : ''),
    formattedAddress: location.formattedAddress || location.fullAddress || '',
    country: location.country || '',
    countryCode: location.countryCode || '',
    state: location.state || location.province || '',
    city: location.city || location.district || '',
    area: location.area || location.sector || '',
    placeName: location.placeName || '',
    referenceName: location.referenceName || location.landmark || '',
    placeId: location.placeId || '',
    locationSource: location.locationSource || 'search',
    isExactLocationVerified: Boolean(location.isExactLocationVerified),
  };
}
