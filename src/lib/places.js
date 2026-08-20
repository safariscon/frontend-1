const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,latlng,capital';
const COUNTRIES_NOW_URL = 'https://countriesnow.space/api/v0.1';

const memoryCache = new Map();

function cacheGet(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  memoryCache.set(key, value);
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

async function readJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Location lookup failed');
  return response.json();
}

export function emptyLocationDetails() {
  return {
    country: '',
    countryCode: '',
    state: '',
    city: '',
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    area: '',
    placeName: '',
    formattedAddress: '',
    fullAddress: '',
    latitude: null,
    longitude: null,
    latitudeRaw: '',
    longitudeRaw: '',
    placeId: '',
    locationSource: '',
  };
}

export function normalizeLocationDetails(input = {}) {
  const country = String(input.country || '').trim();
  const countryCode = String(input.countryCode || '').trim().toUpperCase();
  const state = String(input.state || input.province || '').trim();
  const city = String(input.city || input.district || '').trim();
  const sector = String(input.sector || input.area || '').trim();
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  return {
    country,
    countryCode,
    state,
    city,
    province: state,
    district: city,
    sector,
    area: sector,
    cell: String(input.cell || '').trim(),
    village: String(input.village || '').trim(),
    placeName: String(input.placeName || '').trim(),
    formattedAddress: String(input.formattedAddress || input.fullAddress || '').trim(),
    fullAddress: String(input.fullAddress || input.formattedAddress || '').trim(),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    latitudeRaw: input.latitudeRaw != null && input.latitudeRaw !== ''
      ? String(input.latitudeRaw)
      : (Number.isFinite(latitude) ? String(latitude) : ''),
    longitudeRaw: input.longitudeRaw != null && input.longitudeRaw !== ''
      ? String(input.longitudeRaw)
      : (Number.isFinite(longitude) ? String(longitude) : ''),
    placeId: String(input.placeId || '').trim(),
    locationSource: String(input.locationSource || '').trim(),
  };
}

export function formatLocationLine(input) {
  const location = normalizeLocationDetails(input);
  const named = [
    location.placeName,
    location.formattedAddress,
    location.sector,
    location.city,
    location.state,
    location.country,
  ].filter(Boolean);
  if (named.length) {
    // Prefer a compact human line without duplicating the full address twice.
    if (location.placeName && location.city) {
      return [location.placeName, location.city, location.country].filter(Boolean).join(', ');
    }
    if (location.formattedAddress) return location.formattedAddress;
    return [location.sector, location.city, location.state, location.country].filter(Boolean).join(', ');
  }
  if (location.latitude != null && location.longitude != null) {
    return `${location.latitude}, ${location.longitude}`;
  }
  return '';
}

export function isAdministrativeLocationComplete(input) {
  const location = normalizeLocationDetails(input);
  return Boolean(location.country && location.city);
}

/** Customer booking: a map pin is enough even when the place has no name. */
export function isCustomerMapLocationComplete(input) {
  const location = normalizeLocationDetails(input);
  return location.latitude != null && location.longitude != null;
}

export async function listCountries() {
  const cached = cacheGet('places:countries');
  if (cached) return cached;

  try {
    const data = await readJson(REST_COUNTRIES_URL);
    const countries = (Array.isArray(data) ? data : [])
      .map((item) => ({
        name: item?.name?.common || '',
        code: String(item?.cca2 || '').toUpperCase(),
        latitude: Number(item?.latlng?.[0]),
        longitude: Number(item?.latlng?.[1]),
        capital: Array.isArray(item?.capital) ? item.capital[0] : '',
      }))
      .filter((item) => item.name && item.code)
      .sort((a, b) => a.name.localeCompare(b.name));
    cacheSet('places:countries', countries);
    return countries;
  } catch {
    const payload = await readJson(`${COUNTRIES_NOW_URL}/countries/iso`);
    const countries = (payload.data || [])
      .map((item) => ({
        name: item.name || item.country || '',
        code: String(item.Iso2 || item.iso2 || '').toUpperCase(),
        latitude: null,
        longitude: null,
        capital: '',
      }))
      .filter((item) => item.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    cacheSet('places:countries', countries);
    return countries;
  }
}

export async function listStates(countryName) {
  const country = String(countryName || '').trim();
  if (!country) return [];
  const key = `places:states:${country.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const payload = await readJson(`${COUNTRIES_NOW_URL}/countries/states`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country }),
  });
  const states = [...new Set((payload.data?.states || []).map((item) => item.name || item.state_name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  cacheSet(key, states);
  return states;
}

export async function listCities(countryName, stateName = '') {
  const country = String(countryName || '').trim();
  if (!country) return [];
  const state = String(stateName || '').trim();
  const key = `places:cities:${country.toLowerCase()}|${state.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let cities = [];
  if (state) {
    const payload = await readJson(`${COUNTRIES_NOW_URL}/countries/state/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state }),
    });
    cities = Array.isArray(payload.data) ? payload.data : [];
  }
  if (!cities.length) {
    const payload = await readJson(`${COUNTRIES_NOW_URL}/countries/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    });
    cities = Array.isArray(payload.data) ? payload.data : [];
  }

  const unique = [...new Set(cities.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  cacheSet(key, unique);
  return unique;
}

export async function getCountryByNameOrCode(value) {
  const needle = String(value || '').trim().toLowerCase();
  if (!needle) return null;
  const countries = await listCountries();
  return countries.find((item) => item.name.toLowerCase() === needle || item.code.toLowerCase() === needle) || null;
}
