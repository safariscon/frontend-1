import { useEffect, useMemo, useRef, useState } from 'react';

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

export default function UnlockedServiceMap({ location }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const routeRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const [gpsMessage, setGpsMessage] = useState('');
  const [customerPosition, setCustomerPosition] = useState(null);
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const hasDestination = Number.isFinite(latitude) && Number.isFinite(longitude);

  const urls = useMemo(() => {
    if (!hasDestination) return { google: '', osm: '' };
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      osm: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
    };
  }, [hasDestination, latitude, longitude]);

  useEffect(() => {
    if (!hasDestination) return undefined;
    let cancelled = false;
    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) return;
        const destination = [latitude, longitude];
        mapRef.current = leaflet.map(mapNodeRef.current).setView(destination, 15);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        leaflet.marker(destination, {
          icon: leaflet.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconAnchor: [12, 41],
          }),
        }).addTo(mapRef.current);
      })
      .catch(() => setGpsMessage('Map could not load. You can still open directions below.'));
    return () => {
      cancelled = true;
    };
  }, [hasDestination, latitude, longitude]);

  useEffect(() => {
    if (!mapRef.current || !window.L || !customerPosition || !hasDestination) return;
    const destination = [latitude, longitude];
    const customer = [customerPosition.latitude, customerPosition.longitude];
    const blueIcon = window.L.divIcon({
      className: '',
      html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,.45)"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    if (!customerMarkerRef.current) customerMarkerRef.current = window.L.marker(customer, { icon: blueIcon }).addTo(mapRef.current);
    else customerMarkerRef.current.setLatLng(customer);
    if (routeRef.current) routeRef.current.remove();
    routeRef.current = window.L.polyline([customer, destination], { color: '#2563eb', weight: 4, opacity: 0.75 }).addTo(mapRef.current);
    mapRef.current.fitBounds(window.L.latLngBounds([customer, destination]), { padding: [28, 28] });
  }, [customerPosition, hasDestination, latitude, longitude]);

  const getDirections = () => {
    if (!navigator.geolocation) {
      setGpsMessage('GPS is not available. You can still open directions in Google Maps or OpenStreetMap.');
      return;
    }
    setGpsMessage('Requesting GPS permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGpsMessage('');
      },
      () => setGpsMessage('GPS permission denied. You can still open directions in Google Maps or OpenStreetMap.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  if (!hasDestination) return null;

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="font-bold text-emerald-950">Exact service map</h3>
      <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white">
        <div ref={mapNodeRef} className="h-80 w-full" />
      </div>
      {gpsMessage && <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-amber-700">{gpsMessage}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={getDirections} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Get Directions</button>
        <a href={urls.google} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-800">Open in Google Maps</a>
        <a href={urls.osm} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-800">Open in OpenStreetMap</a>
      </div>
    </div>
  );
}
