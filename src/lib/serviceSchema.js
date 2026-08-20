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
