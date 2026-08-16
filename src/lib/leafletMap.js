const loadLeaflet = () => new Promise((resolve, reject) => {
  if (window.L) {
    resolve(window.L);
    return;
  }

  if (!document.querySelector('link[data-leaflet-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.dataset.leafletCss = 'true';
    document.head.appendChild(link);
  }

  const existingScript = document.querySelector('script[data-leaflet-js]');
  if (existingScript) {
    existingScript.addEventListener('load', () => resolve(window.L), { once: true });
    existingScript.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.async = true;
  script.dataset.leafletJs = 'true';
  script.onload = () => resolve(window.L);
  script.onerror = reject;
  document.body.appendChild(script);
});

export const DEFAULT_MAP_CENTER = { latitude: 0, longitude: 20 };
export const DEFAULT_RWANDA_CENTER = { latitude: -1.9441, longitude: 30.0619 };

export const RWANDA_BOUNDS = {
  minLatitude: -2.9,
  maxLatitude: -1.0,
  minLongitude: 28.8,
  maxLongitude: 31.0,
};

export const isInsideRwanda = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= RWANDA_BOUNDS.minLatitude &&
  latitude <= RWANDA_BOUNDS.maxLatitude &&
  longitude >= RWANDA_BOUNDS.minLongitude &&
  longitude <= RWANDA_BOUNDS.maxLongitude;

export const leafletMarkerIcon = (leaflet) => leaflet.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41],
});

export default loadLeaflet;
