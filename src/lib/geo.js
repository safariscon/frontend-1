import { geoApi } from './api';
import { DEFAULT_RWANDA_CENTER, isInsideRwanda } from './leafletMap';

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

export async function searchPlaces(query) {
  const text = String(query || '').trim();
  if (text.length < 3) return [];
  const key = text.toLowerCase();
  if (searchCache.has(key)) return searchCache.get(key);

  try {
    const response = await geoApi.searchPlaces(text);
    const results = normalizeSearchResults(response.results || response.places || []);
    searchCache.set(key, results);
    return results;
  } catch {
    const results = await searchPlacesFallback(text);
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
  return (Array.isArray(results) ? results : [])
    .map(normalizePlace)
    .filter((item) => item && isInsideRwanda(item.latitude, item.longitude));
}

function normalizePlace(item = {}) {
  const latitude = Number(item.latitude ?? item.lat);
  const longitude = Number(item.longitude ?? item.lng ?? item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    placeName: item.placeName || item.name || '',
    formattedAddress: item.formattedAddress || item.label || item.display_name || '',
    label: item.label || item.formattedAddress || item.display_name || item.name || `${latitude}, ${longitude}`,
    latitude,
    longitude,
    placeId: item.placeId || item.googlePlaceId || item.osmId || item.place_id || '',
    locationSource: item.locationSource || 'search',
    province: item.province || item.state || '',
    district: item.district || item.city || item.county || '',
    sector: item.sector || '',
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

async function searchPlacesFallback(query) {
  const q = query.toLowerCase().includes('rwanda') ? query : `${query}, Rwanda`;
  const params = new URLSearchParams({
    q,
    lat: String(DEFAULT_RWANDA_CENTER.latitude),
    lon: String(DEFAULT_RWANDA_CENTER.longitude),
    limit: '6',
    lang: 'en',
  });
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
        province: props.state,
        district: props.city || props.county,
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
    province: address.state,
    district: address.city || address.county || address.town,
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
