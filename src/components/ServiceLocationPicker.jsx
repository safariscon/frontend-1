import { useEffect, useMemo, useRef, useState } from 'react';
import loadLeaflet, { DEFAULT_MAP_CENTER, leafletMarkerIcon } from '../lib/leafletMap';
import { reverseGeocode, searchPlaces } from '../lib/geo';

function composeAddress(parts = {}) {
  return [
    parts.placeName,
    parts.referenceName,
    parts.area,
    parts.city,
    parts.state,
    parts.country,
  ].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
}

export default function ServiceLocationPicker({ value, onChange }) {
  const location = useMemo(() => ({
    country: value?.country || '',
    countryCode: value?.countryCode || '',
    state: value?.state || value?.province || '',
    city: value?.city || value?.district || '',
    area: value?.area || value?.sector || '',
    placeName: value?.placeName || '',
    referenceName: value?.referenceName || value?.landmark || '',
    fullAddress: value?.fullAddress || value?.formattedAddress || '',
    formattedAddress: value?.formattedAddress || value?.fullAddress || '',
    latitude: value?.latitude ?? null,
    longitude: value?.longitude ?? null,
    latitudeRaw: value?.latitudeRaw || '',
    longitudeRaw: value?.longitudeRaw || '',
    placeId: value?.placeId || value?.googlePlaceId || '',
    locationSource: value?.locationSource || 'map_click',
    isExactLocationVerified: Boolean(value?.isExactLocationVerified),
  }), [value]);

  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState(location.formattedAddress || location.placeName || '');
  // Latest handlers, so map listeners registered once never patch a stale location.
  const handlersRef = useRef({});
  // Address the picker itself wrote into the search box; used to avoid re-searching it.
  const syncedAddressRef = useRef(location.formattedAddress || location.placeName || '');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const hasPin = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));
  const needsManualDetails = hasPin && !(location.country && location.city);

  const update = (patch) => {
    onChange({
      ...location,
      ...patch,
      formattedAddress: patch.formattedAddress ?? patch.fullAddress ?? location.formattedAddress,
      fullAddress: patch.fullAddress ?? patch.formattedAddress ?? location.fullAddress,
    });
  };

  const updateManualField = (key, nextValue) => {
    const patch = { [key]: nextValue };
    const next = { ...location, ...patch };
    const composed = composeAddress(next);
    // Keep a readable address line when the user types details by hand.
    if (!location.formattedAddress || location.locationSource === 'manual' || !location.placeId) {
      patch.formattedAddress = composed || location.formattedAddress;
      patch.fullAddress = composed || location.fullAddress;
      patch.locationSource = location.placeId ? location.locationSource : 'manual';
    }
    update(patch);
  };

  const applyPlace = (place, source, extras = {}) => {
    const latitude = Number(place.latitude ?? extras.latitude);
    const longitude = Number(place.longitude ?? extras.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const next = {
      latitude,
      longitude,
      latitudeRaw: place.latitudeRaw || extras.latitudeRaw || String(latitude),
      longitudeRaw: place.longitudeRaw || extras.longitudeRaw || String(longitude),
      locationSource: source,
      isExactLocationVerified: source === 'search' || source === 'gps',
      placeName: extras.placeName || place.placeName || location.placeName,
      referenceName: extras.referenceName || location.referenceName,
      formattedAddress: extras.formattedAddress || place.formattedAddress || location.formattedAddress,
      fullAddress: extras.formattedAddress || place.formattedAddress || location.fullAddress,
      placeId: extras.placeId || place.placeId || location.placeId,
      country: place.country || extras.country || location.country,
      countryCode: place.countryCode || extras.countryCode || location.countryCode,
      state: place.state || place.province || extras.state || location.state,
      city: place.city || place.district || extras.city || location.city,
      area: place.area || place.sector || extras.area || location.area,
    };
    if (!next.formattedAddress) next.formattedAddress = composeAddress(next);
    if (!next.fullAddress) next.fullAddress = next.formattedAddress;
    update(next);
    drawMarker(latitude, longitude);
    const nextQuery = next.formattedAddress || place.label || query;
    syncedAddressRef.current = nextQuery;
    setQuery(nextQuery);
  };

  const applyCoordinates = async (latitude, longitude, source, extras = {}) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMessage('');
    update({
      latitude,
      longitude,
      latitudeRaw: extras.latitudeRaw || String(latitude),
      longitudeRaw: extras.longitudeRaw || String(longitude),
      locationSource: source,
      isExactLocationVerified: false,
      ...extras,
    });
    drawMarker(latitude, longitude);
    const place = await reverseGeocode(latitude, longitude).catch(() => null);
    if (place && (place.country || place.city || place.formattedAddress || place.placeName)) {
      applyPlace(place, source, {
        ...extras,
        latitude,
        longitude,
        latitudeRaw: place.latitudeRaw || String(latitude),
        longitudeRaw: place.longitudeRaw || String(longitude),
      });
      setMessage('');
      return;
    }
    setMessage('No place name found for this pin. Type the place name, city, region, and country below.');
  };

  const drawMarker = (latitude, longitude, { recenter = true } = {}) => {
    if (!mapRef.current || !window.L) return;
    const latLng = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = window.L.marker(latLng, {
        draggable: true,
        icon: leafletMarkerIcon(window.L),
      }).addTo(mapRef.current);
      markerRef.current.on('dragend', (event) => {
        const next = event.target.getLatLng();
        handlersRef.current.applyCoordinates?.(Number(next.lat), Number(next.lng), 'map_drag');
      });
    } else {
      markerRef.current.setLatLng(latLng);
    }
    if (recenter) mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom() || 0, 16));
  };

  useEffect(() => {
    handlersRef.current.applyCoordinates = applyCoordinates;
  });

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) return;
        mapRef.current = leaflet
          .map(mapNodeRef.current)
          .setView([DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude], 2);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        mapRef.current.on('click', (event) => {
          handlersRef.current.applyCoordinates?.(Number(event.latlng.lat), Number(event.latlng.lng), 'map_click');
        });
        setMapReady(true);
      })
      .catch(() => setMessage('Map could not load. Search a place name instead.'));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Restore / follow the saved pin. Runs for services loaded after mount (editing) and
  // whenever this step is re-mounted after a back navigation.
  useEffect(() => {
    if (!mapReady) return;
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    drawMarker(latitude, longitude);
  }, [mapReady, location.latitude, location.longitude]);

  // Keep the search box showing the saved address unless the user is typing their own text.
  useEffect(() => {
    const address = location.formattedAddress || location.placeName || '';
    if (!address || address === syncedAddressRef.current) return;
    setQuery((current) => (current && current !== syncedAddressRef.current ? current : address));
    syncedAddressRef.current = address;
  }, [location.formattedAddress, location.placeName]);

  useEffect(() => {
    const text = query.trim();
    // The box was filled from the saved/selected place, not typed: nothing to look up.
    if (text && text === String(syncedAddressRef.current || '').trim()) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }
    if (text.length < 3) {
      const clearTimer = window.setTimeout(() => {
        setSearchResults([]);
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }
    const startTimer = window.setTimeout(() => setSearching(true), 0);
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchPlaces(text, {
          country: location.countryCode || 'rw',
          countryCode: location.countryCode || 'rw',
          countryName: location.country || 'Rwanda',
          latitude: location.latitude || undefined,
          longitude: location.longitude || undefined,
        });
        setSearchResults(results);
        if (!results.length) setMessage('No matching place in search. Drop a pin, then type the address details below.');
        else setMessage('');
      } catch {
        setSearchResults([]);
        setMessage('Search is unavailable. Pin the exact spot on the map, then fill details below.');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(timer);
    };
  }, [query, location.country, location.countryCode, location.latitude, location.longitude]);

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
    applyPlace(result, 'search', {
      placeName: result.placeName || result.label,
      formattedAddress: result.formattedAddress || result.label,
      placeId: result.placeId,
      area: result.area || result.sector,
    });
    setMessage('');
  };

  return (
    <section className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-4">
        <h3 className="font-bold text-blue-950">Service location</h3>
        <p className="mt-1 text-sm text-blue-800">
          Search the place on OpenStreetMap or drop a pin on the real building. Guests find this listing by nearby latitude and longitude, so a district name alone is not enough if the pin is missing or far from the service.
        </p>
      </div>

      <div className="relative mt-2 overflow-hidden rounded-xl border border-blue-200 bg-white">
        <div className="absolute left-14 right-3 top-3 z-[500] rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <label className="block">
            <span className="sr-only">Search place / address</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hotel, street, landmark..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          {(searching || searchResults.length > 0) && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-100 bg-white">
              {searching && <p className="p-3 text-sm text-slate-500">Searching places...</p>}
              {searchResults.map((result) => (
                <button
                  key={`${result.latitude}-${result.longitude}-${result.label}`}
                  type="button"
                  onClick={() => selectResult(result)}
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50"
                >
                  <span className="font-semibold text-slate-900">{result.label}</span>
                  {(result.city || result.country) && (
                    <span className="mt-0.5 block text-xs text-slate-500">{[result.city, result.state, result.country].filter(Boolean).join(', ')}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={mapNodeRef} className="h-80 w-full" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useCurrentLocation} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Use my current location</button>
        {hasPin && (
          <button type="button" onClick={() => update({ isExactLocationVerified: true })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            Confirm this pin
          </button>
        )}
        {hasPin ? (
          <span className={`rounded-lg px-3 py-2 text-xs font-bold ${location.isExactLocationVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
            {location.isExactLocationVerified ? 'Exact location confirmed' : `Pin set by ${String(location.locationSource).replace('_', ' ')}. Drag if needed, then confirm.`}
          </span>
        ) : (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">Exact map point required before publishing</span>
        )}
        {message && <span className="text-sm font-semibold text-amber-700">{message}</span>}
      </div>

      <div className={`mt-4 rounded-xl border p-4 ${needsManualDetails ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-white/90'}`}>
        <div className="mb-3">
          <h4 className="font-bold text-slate-900">Place details</h4>
          <p className="mt-1 text-sm text-slate-600">
            {needsManualDetails
              ? 'Map did not fill these. Type place name, city, region, and country manually.'
              : 'Edit any field if the detected name is wrong or incomplete (add a landmark / reference).'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ManualField
            label="Place name"
            value={location.placeName}
            onChange={(next) => updateManualField('placeName', next)}
            placeholder="e.g. Karitsiye Guest House"
          />
          <ManualField
            label="Reference / landmark"
            value={location.referenceName}
            onChange={(next) => updateManualField('referenceName', next)}
            placeholder="e.g. near market, opposite church"
          />
          <ManualField
            label="Exact location / address line"
            value={location.formattedAddress || location.fullAddress}
            onChange={(next) => update({
              formattedAddress: next,
              fullAddress: next,
              locationSource: location.placeId ? location.locationSource : 'manual',
            })}
            placeholder="Street, village, or how customers should find you"
            className="sm:col-span-2"
          />
          <ManualField
            label="Country"
            value={location.country}
            onChange={(next) => updateManualField('country', next)}
            placeholder="e.g. Rwanda"
          />
          <ManualField
            label="State / region / province"
            value={location.state}
            onChange={(next) => updateManualField('state', next)}
            placeholder="e.g. Western Province"
          />
          <ManualField
            label="City / district"
            value={location.city}
            onChange={(next) => updateManualField('city', next)}
            placeholder="e.g. Rubavu"
          />
          <ManualField
            label="Area / sector"
            value={location.area}
            onChange={(next) => updateManualField('area', next)}
            placeholder="e.g. Gisenyi"
          />
          <div className="sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Coordinates</span>
            <p className="mt-1 break-all text-sm font-semibold text-slate-800">
              {location.latitudeRaw && location.longitudeRaw
                ? `${location.latitudeRaw}, ${location.longitudeRaw}`
                : (hasPin ? `${location.latitude}, ${location.longitude}` : 'Drop a pin on the map')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ManualField({ label, value, onChange, placeholder = '', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
