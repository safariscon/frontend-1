import { geoApi } from './api';
import { DEFAULT_MAP_CENTER } from './leafletMap';

const searchCache = new Map();

export function formatDistance(meters) {
  const value = Number(meters || 0);
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export async function searchPlaces(query, options = {}) {
  const text = String(query || '').trim();
  if (text.length < 3) return [];
  const country = String(options.country || options.countryCode || '').trim().toLowerCase();
  const key = `${text.toLowerCase()}|${country}`;
  if (searchCache.has(key)) return searchCache.get(key);

  try {
    const response = await geoApi.searchPlaces(text, { country });
    const results = normalizeSearchResults(response.results || response.places || []);
    searchCache.set(key, results);
    return results;
  } catch {
    const results = await searchPlacesFallback(text, options);
    searchCache.set(key, results);
    return results;
  }
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const response = await geoApi.reverseGeocode(latitude, longitude);
    return normalizePlace(response.place || response);
  } catch {
    return reverseGeocodeFallback(latitude, longitude);
  }
}

export async function getDrivingRoute(from, to) {
  try {
    const response = await geoApi.getRoute(from, to);
    return normalizeRoute(response.route || response);
  } catch {
    return getDrivingRouteFallback(from, to);
  }
}

function normalizeSearchResults(results) {
  return (Array.isArray(results) ? results : []).map(normalizePlace).filter(Boolean);
}

function normalizePlace(item = {}) {
  const latitude = Number(item.latitude ?? item.lat);
  const longitude = Number(item.longitude ?? item.lng ?? item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const country = item.country || '';
  const state = item.state || item.province || '';
  const city = item.city || item.district || item.county || item.town || '';
  return {
    placeName: item.placeName || item.name || '',
    formattedAddress: item.formattedAddress || item.label || item.display_name || '',
    label: item.label || item.formattedAddress || item.display_name || item.name || `${latitude}, ${longitude}`,
    latitude,
    longitude,
    latitudeRaw: item.latitudeRaw != null ? String(item.latitudeRaw) : String(item.latitude ?? item.lat ?? ''),
    longitudeRaw: item.longitudeRaw != null ? String(item.longitudeRaw) : String(item.longitude ?? item.lng ?? item.lon ?? ''),
    placeId: item.placeId || item.googlePlaceId || item.osmId || item.place_id || '',
    locationSource: item.locationSource || 'search',
    country,
    countryCode: item.countryCode || item.countrycode || '',
    state,
    city,
    area: item.area || item.suburb || item.neighbourhood || item.neighborhood || item.sector || '',
    province: state,
    district: city,
    sector: item.sector || item.suburb || item.village || '',
  };
}

function normalizeRoute(route = {}) {
  const coordinates = Array.isArray(route.coordinates)
    ? route.coordinates
    : Array.isArray(route.geometry?.coordinates)
      ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      : [];
  return {
    distanceMeters: Number(route.distanceMeters ?? route.distance ?? 0),
    durationSeconds: Number(route.durationSeconds ?? route.duration ?? 0),
    coordinates,
  };
}

async function searchPlacesFallback(query, options = {}) {
  const countryName = String(options.countryName || '').trim();
  const q = countryName && !query.toLowerCase().includes(countryName.toLowerCase()) ? `${query}, ${countryName}` : query;
  const params = new URLSearchParams({
    q,
    lat: String(options.latitude || DEFAULT_MAP_CENTER.latitude),
    lon: String(options.longitude || DEFAULT_MAP_CENTER.longitude),
    limit: '8',
    lang: 'en',
  });
  if (options.countryCode) params.set('osm_tag', 'place');
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Place search failed');
  const data = await response.json();
  return (data.features || [])
    .map((feature) => {
      const [longitude, latitude] = feature.geometry?.coordinates || [];
      const props = feature.properties || {};
      return normalizePlace({
        name: props.name,
        formattedAddress: [props.name, props.street, props.city, props.county, props.state, props.country].filter(Boolean).join(', '),
        latitude,
        longitude,
        placeId: props.osm_id,
        country: props.country,
        countryCode: props.countrycode,
        state: props.state,
        city: props.city || props.county,
        sector: props.district,
        locationSource: 'search',
      });
    })
    .filter(Boolean);
}

async function reverseGeocodeFallback(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const item = await response.json();
  const address = item.address || {};
  return normalizePlace({
    name: item.name || address.road || 'Pinned location',
    formattedAddress: item.display_name,
    latitude,
    longitude,
    placeId: item.place_id,
    country: address.country,
    countryCode: address.country_code,
    state: address.state,
    city: address.city || address.county || address.town,
    sector: address.suburb || address.village,
    locationSource: 'map_click',
  });
}

async function getDrivingRouteFallback(from, to) {
  const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`);
  if (!response.ok) throw new Error('Route lookup failed');
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('No driving route found');
  return normalizeRoute({
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
  });
}
