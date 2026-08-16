import { useEffect, useMemo, useRef, useState } from 'react';
import AdministrativeLocationFields from './AdministrativeLocationFields';
import loadLeaflet, { DEFAULT_MAP_CENTER, leafletMarkerIcon } from '../lib/leafletMap';
import { reverseGeocode, searchPlaces } from '../lib/geo';
import { getCountryByNameOrCode, normalizeLocationDetails } from '../lib/places';

export default function ServiceLocationPicker({ value, onChange }) {
  const location = useMemo(() => ({
    ...normalizeLocationDetails(value),
    placeName: value?.placeName || '',
    fullAddress: value?.fullAddress || value?.formattedAddress || '',
    formattedAddress: value?.formattedAddress || value?.fullAddress || '',
    latitude: value?.latitude ?? null,
    longitude: value?.longitude ?? null,
    placeId: value?.placeId || value?.googlePlaceId || '',
    locationSource: value?.locationSource || 'map_click',
    isExactLocationVerified: Boolean(value?.isExactLocationVerified),
  }), [value]);
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState(location.fullAddress || location.placeName || '');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');

  const update = (patch) => {
    const nextAdmin = normalizeLocationDetails({ ...location, ...patch });
    onChange({
      ...location,
      ...patch,
      ...nextAdmin,
      formattedAddress: patch.formattedAddress ?? patch.fullAddress ?? location.formattedAddress,
      fullAddress: patch.fullAddress ?? patch.formattedAddress ?? location.fullAddress,
    });
  };

  const applyCoordinates = async (latitude, longitude, source, extras = {}) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMessage('');
    update({
      latitude,
      longitude,
      locationSource: source,
      isExactLocationVerified: false,
      ...extras,
    });
    drawMarker(latitude, longitude);
    if (!extras.formattedAddress) {
      const place = await reverseGeocode(latitude, longitude).catch(() => null);
      if (place) {
        update({
          latitude,
          longitude,
          locationSource: source,
          isExactLocationVerified: false,
          placeName: extras.placeName || place.placeName,
          formattedAddress: place.formattedAddress,
          fullAddress: place.formattedAddress,
          placeId: extras.placeId || place.placeId,
          country: location.country || place.country,
          countryCode: location.countryCode || place.countryCode,
          state: location.state || place.state,
          city: location.city || place.city,
          province: location.province || place.province,
          district: location.district || place.district,
          sector: location.sector || place.sector,
        });
        setQuery(place.formattedAddress || extras.placeName || query);
      }
    }
  };

  const drawMarker = (latitude, longitude) => {
    if (!mapRef.current || !window.L) return;
    const latLng = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = window.L.marker(latLng, {
        draggable: true,
        icon: leafletMarkerIcon(window.L),
      }).addTo(mapRef.current);
      markerRef.current.on('dragend', (event) => {
        const next = event.target.getLatLng();
        applyCoordinates(Number(next.lat), Number(next.lng), 'map_drag');
      });
    } else {
      markerRef.current.setLatLng(latLng);
    }
    mapRef.current.setView(latLng, 16);
  };

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) return;
        const start = [location.latitude || DEFAULT_MAP_CENTER.latitude, location.longitude || DEFAULT_MAP_CENTER.longitude];
        mapRef.current = leaflet.map(mapNodeRef.current).setView(start, location.latitude ? 16 : 2);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        mapRef.current.on('click', (event) => {
          applyCoordinates(Number(event.latlng.lat), Number(event.latlng.lng), 'map_click');
        });
        if (location.latitude && location.longitude) drawMarker(Number(location.latitude), Number(location.longitude));
      })
      .catch(() => setMessage('Map could not load. Search a place name, then confirm the pin.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || location.latitude || !location.country) return undefined;
    let cancelled = false;
    getCountryByNameOrCode(location.country).then((country) => {
      if (cancelled || !country?.latitude || !mapRef.current) return;
      mapRef.current.setView([country.latitude, country.longitude], 5);
    });
    return () => {
      cancelled = true;
    };
  }, [location.country, location.latitude]);

  const runSearch = async (event) => {
    event?.preventDefault?.();
    const text = query.trim();
    if (text.length < 3) {
      setMessage('Type at least 3 characters, then search.');
      return;
    }
    setSearching(true);
    setMessage('');
    try {
      const country = await getCountryByNameOrCode(location.country).catch(() => null);
      const results = await searchPlaces(text, {
        country: location.countryCode || country?.code,
        countryCode: location.countryCode || country?.code,
        countryName: location.country,
        latitude: location.latitude || country?.latitude,
        longitude: location.longitude || country?.longitude,
      });
      setSearchResults(results);
      if (!results.length) setMessage('No matching place. Pin the exact spot on the map instead.');
    } catch {
      setSearchResults([]);
      setMessage('Search is unavailable. Pin the exact spot on the map.');
    } finally {
      setSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Current location is not available in this browser.');
      return;
    }
    setMessage('Requesting GPS permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => applyCoordinates(Number(position.coords.latitude), Number(position.coords.longitude), 'gps'),
      () => setMessage('GPS permission was denied or unavailable.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const selectResult = (result) => {
    setSearchResults([]);
    setQuery(result.label);
    applyCoordinates(result.latitude, result.longitude, 'search', {
      placeName: result.placeName || result.label,
      formattedAddress: result.formattedAddress || result.label,
      fullAddress: result.formattedAddress || result.label,
      placeId: result.placeId,
      country: location.country || result.country,
      countryCode: location.countryCode || result.countryCode,
      state: location.state || result.state,
      city: location.city || result.city,
      province: location.province || result.province,
      district: location.district || result.district,
      sector: location.sector || result.sector,
    });
  };

  return (
    <section className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-4">
        <h3 className="font-bold text-blue-950">Service location</h3>
        <p className="mt-1 text-sm text-blue-800">Choose the country, then the region and city. Search a known place or drop a pin so customers can get directions.</p>
      </div>

      <AdministrativeLocationFields value={location} onChange={update} />

      <div className="relative mt-4">
        <label className="block">
          <span className="text-sm font-semibold text-blue-950">Search place / address</span>
          <div className="mt-1 flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSearch();
                }
              }}
              placeholder="Hotel name, street, landmark..."
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
            />
            <button type="button" onClick={runSearch} className="shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">{searching ? '...' : 'Search'}</button>
          </div>
        </label>
        {(searching || searchResults.length > 0) && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {searching && <p className="p-3 text-sm text-slate-500">Searching places...</p>}
            {searchResults.map((result) => (
              <button key={`${result.latitude}-${result.longitude}-${result.label}`} type="button" onClick={() => selectResult(result)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50">
                {result.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white">
        <div ref={mapNodeRef} className="h-80 w-full" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useCurrentLocation} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Use my current location</button>
        {location.latitude && location.longitude && (
          <button type="button" onClick={() => update({ isExactLocationVerified: true })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            Confirm this pin
          </button>
        )}
        {location.latitude && location.longitude ? (
          <span className={`rounded-lg px-3 py-2 text-xs font-bold ${location.isExactLocationVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
            {location.isExactLocationVerified ? 'Exact location confirmed' : `Pin set by ${String(location.locationSource).replace('_', ' ')}. Drag if needed, then confirm.`}
          </span>
        ) : (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">Exact map point required before publishing</span>
        )}
        {message && <span className="text-sm font-semibold text-amber-700">{message}</span>}
      </div>
    </section>
  );
}
