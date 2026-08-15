import { useEffect, useMemo, useRef, useState } from 'react';
import loadLeaflet, { leafletMarkerIcon } from '../lib/leafletMap';
import { formatDistance, formatDuration, getDrivingRoute } from '../lib/geo';

export default function UnlockedServiceMap({ location }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const routeRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const [gpsMessage, setGpsMessage] = useState('');
  const [customerPosition, setCustomerPosition] = useState(null);
  const [route, setRoute] = useState(null);
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const hasDestination = Number.isFinite(latitude) && Number.isFinite(longitude);

  const urls = useMemo(() => {
    if (!hasDestination) return { google: '', osm: '' };
    const origin = customerPosition ? `${customerPosition.latitude},${customerPosition.longitude}` : '';
    return {
      google: origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${latitude},${longitude}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      osm: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${customerPosition ? `${customerPosition.latitude},${customerPosition.longitude}` : ''};${latitude},${longitude}`,
    };
  }, [customerPosition, hasDestination, latitude, longitude]);

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
        leaflet.marker(destination, { icon: leafletMarkerIcon(leaflet) }).addTo(mapRef.current);
      })
      .catch(() => setGpsMessage('Map could not load. You can still open directions below.'));
    return () => {
      cancelled = true;
    };
  }, [hasDestination, latitude, longitude]);

  useEffect(() => {
    if (!hasDestination || !navigator.geolocation) return undefined;
    navigator.geolocation.getCurrentPosition(
      (position) => setCustomerPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setGpsMessage('Allow location access to draw the road from where you are.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
    return undefined;
  }, [hasDestination]);

  useEffect(() => {
    if (!mapRef.current || !window.L || !customerPosition || !hasDestination) return undefined;
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

    let cancelled = false;
    getDrivingRoute(customerPosition, { latitude, longitude })
      .then((nextRoute) => {
        if (cancelled) return;
        setRoute(nextRoute);
        if (routeRef.current) routeRef.current.remove();
        const line = nextRoute.coordinates?.length ? nextRoute.coordinates : [customer, destination];
        routeRef.current = window.L.polyline(line, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(mapRef.current);
        mapRef.current.fitBounds(window.L.latLngBounds(line), { padding: [28, 28] });
        setGpsMessage('');
      })
      .catch(() => {
        if (cancelled) return;
        if (routeRef.current) routeRef.current.remove();
        routeRef.current = window.L.polyline([customer, destination], { color: '#2563eb', weight: 4, opacity: 0.6, dashArray: '8 8' }).addTo(mapRef.current);
        mapRef.current.fitBounds(window.L.latLngBounds([customer, destination]), { padding: [28, 28] });
        setGpsMessage('Road route is unavailable. Showing a direct line. Open Google Maps for turn-by-turn directions.');
      });
    return () => {
      cancelled = true;
    };
  }, [customerPosition, hasDestination, latitude, longitude]);

  const refreshGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage('GPS is not available. You can still open directions in Google Maps.');
      return;
    }
    setGpsMessage('Updating your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGpsMessage('');
      },
      () => setGpsMessage('GPS permission denied. You can still open directions in Google Maps.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  if (!hasDestination) return null;

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-emerald-950">Directions to this service</h3>
          <p className="mt-1 text-sm text-emerald-800">{location?.placeName || location?.formattedAddress || location?.fullAddress || 'Pinned service location'}</p>
        </div>
        {route?.distanceMeters ? (
          <p className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-800">
            {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
          </p>
        ) : null}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white">
        <div ref={mapNodeRef} className="h-80 w-full" />
      </div>
      {gpsMessage && <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-amber-700">{gpsMessage}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={refreshGps} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Use my location</button>
        <a href={urls.google} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-800">Open in Google Maps</a>
        <a href={urls.osm} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-800">Open in OpenStreetMap</a>
      </div>
    </div>
  );
}
