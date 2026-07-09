import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CENTER = { latitude: -1.9441, longitude: 30.0619 };
const RWANDA_BOUNDS = {
  minLatitude: -2.9,
  maxLatitude: -1.0,
  minLongitude: 28.8,
  maxLongitude: 31.0,
};
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const searchCache = new Map();

const isInsideRwanda = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= RWANDA_BOUNDS.minLatitude &&
  latitude <= RWANDA_BOUNDS.maxLatitude &&
  longitude >= RWANDA_BOUNDS.minLongitude &&
  longitude <= RWANDA_BOUNDS.maxLongitude;

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

export default function ServiceLocationPicker({ value, onChange, districts = [] }) {
  const location = useMemo(() => ({
    country: 'Rwanda',
    province: value?.province || '',
    district: value?.district || '',
    sector: value?.sector || '',
    cell: value?.cell || '',
    village: value?.village || '',
    fullAddress: value?.fullAddress || '',
    latitude: value?.latitude ?? null,
    longitude: value?.longitude ?? null,
    locationSource: value?.locationSource || 'map_click',
    isExactLocationVerified: Boolean(value?.isExactLocationVerified),
  }), [value]);
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const canShowSearchResults = location.fullAddress.trim().length >= 3;

  const update = (patch) => onChange({ ...location, ...patch, country: 'Rwanda' });

  const setMarker = (latitude, longitude, source) => {
    update({ latitude, longitude, locationSource: source, isExactLocationVerified: false });
    if (!mapRef.current || !window.L) return;
    const latLng = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = window.L.marker(latLng, {
        icon: window.L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconAnchor: [12, 41],
        }),
      }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(latLng);
    }
    mapRef.current.setView(latLng, 15);
  };

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) return;
        const start = [location.latitude || DEFAULT_CENTER.latitude, location.longitude || DEFAULT_CENTER.longitude];
        mapRef.current = leaflet.map(mapNodeRef.current).setView(start, location.latitude ? 15 : 8);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        mapRef.current.on('click', (event) => {
          const latitude = Number(event.latlng.lat);
          const longitude = Number(event.latlng.lng);
          if (!isInsideRwanda(latitude, longitude)) {
            setMessage('Please choose a location inside Rwanda.');
            return;
          }
          setMessage('');
          setMarker(latitude, longitude, 'map_click');
        });
        if (location.latitude && location.longitude) setMarker(Number(location.latitude), Number(location.longitude), location.locationSource || 'map_click');
      })
      .catch(() => setMessage('Map could not load. You can still search for an address.'));

    return () => {
      cancelled = true;
    };
    // Map must initialize only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location.latitude || !location.longitude || !mapRef.current || !window.L) return;
    const latLng = [Number(location.latitude), Number(location.longitude)];
    if (!markerRef.current) {
      markerRef.current = window.L.marker(latLng).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(latLng);
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    const address = location.fullAddress.trim();
    if (address.length < 3) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      const query = address.toLowerCase().includes('rwanda') ? address : `${address}, Rwanda`;
      if (searchCache.has(query)) {
        setSearchResults(searchCache.get(query));
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '5', countrycodes: 'rw' });
        const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`);
        const results = (await response.json())
          .map((item) => ({
            label: item.display_name,
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          }))
          .filter((item) => isInsideRwanda(item.latitude, item.longitude));
        searchCache.set(query, results);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [location.fullAddress]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Current location is not available in this browser.');
      return;
    }
    setMessage('Requesting GPS permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        if (!isInsideRwanda(latitude, longitude)) {
          setMessage('Your current position is outside Rwanda.');
          return;
        }
        setMessage('');
        setMarker(latitude, longitude, 'gps');
      },
      () => setMessage('GPS permission was denied or unavailable.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const selectResult = (result) => {
    setSearchResults([]);
    update({
      fullAddress: result.label,
      latitude: result.latitude,
      longitude: result.longitude,
      locationSource: 'search',
      isExactLocationVerified: false,
    });
    setMarker(result.latitude, result.longitude, 'search');
  };

  return (
    <section className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-4">
        <h3 className="font-bold text-blue-950">Service Location</h3>
        <p className="mt-1 text-sm text-blue-800">Set the exact place customers will visit. Coordinates are saved silently from search, map click, or GPS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PickerSelect label="Province" value={location.province} onChange={(province) => update({ province })} options={['', 'Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province']} required />
        <PickerSelect label="District" value={location.district} onChange={(district) => update({ district })} options={['', ...districts]} required />
        <PickerInput label="Sector" value={location.sector} onChange={(sector) => update({ sector })} required />
        <PickerInput label="Cell" value={location.cell} onChange={(cell) => update({ cell })} />
        <PickerInput label="Village" value={location.village} onChange={(village) => update({ village })} />
        <div className="relative">
          <PickerInput label="Full address / place name" value={location.fullAddress} onChange={(fullAddress) => update({ fullAddress })} placeholder="Kigali, Nyarugenge, Nyamirambo" />
          {canShowSearchResults && (searching || searchResults.length > 0) && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {searching && <p className="p-3 text-sm text-slate-500">Searching Rwanda...</p>}
              {searchResults.map((result) => (
                <button key={`${result.latitude}-${result.longitude}-${result.label}`} type="button" onClick={() => selectResult(result)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50">
                  {result.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white">
        <div ref={mapNodeRef} className="h-80 w-full" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useCurrentLocation} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Use my current location</button>
        {location.latitude && location.longitude ? (
          <span className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">Exact location selected by {String(location.locationSource).replace('_', ' ')}</span>
        ) : (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">Exact map point required before publishing</span>
        )}
        {message && <span className="text-sm font-semibold text-amber-700">{message}</span>}
      </div>
    </section>
  );
}

function PickerInput({ label, value, onChange, required = false, placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-blue-950">{label}{required && <span className="text-red-500"> *</span>}</span>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-4 py-3" />
    </label>
  );
}

function PickerSelect({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-blue-950">{label}{required && <span className="text-red-500"> *</span>}</span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-4 py-3">
        {options.map((option) => <option key={option || 'empty'} value={option}>{option || `Select ${label.toLowerCase()}`}</option>)}
      </select>
    </label>
  );
}
