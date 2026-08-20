import { useEffect, useMemo, useRef, useState } from 'react';
import loadLeaflet, { DEFAULT_RWANDA_CENTER, leafletMarkerIcon } from '../lib/leafletMap';
import { reverseGeocode, searchPlaces } from '../lib/geo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

function composeAddress(parts = {}) {
  return [
    parts.placeName,
    parts.area,
    parts.city,
    parts.state,
    parts.country,
  ].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
}

/**
 * Customer booking pin: search, map click/drag, or GPS.
 * Unnamed pins are allowed — coordinates alone are enough.
 */
export default function CustomerLocationPicker({ value, onChange }) {
  const { language } = useLanguage();
  const location = useMemo(() => ({
    country: value?.country || '',
    countryCode: value?.countryCode || '',
    state: value?.state || value?.province || '',
    city: value?.city || value?.district || '',
    area: value?.area || value?.sector || '',
    placeName: value?.placeName || '',
    formattedAddress: value?.formattedAddress || value?.fullAddress || '',
    fullAddress: value?.fullAddress || value?.formattedAddress || '',
    latitude: value?.latitude ?? null,
    longitude: value?.longitude ?? null,
    latitudeRaw: value?.latitudeRaw || '',
    longitudeRaw: value?.longitudeRaw || '',
    placeId: value?.placeId || '',
    locationSource: value?.locationSource || '',
  }), [value]);

  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState(location.formattedAddress || location.placeName || '');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const hasPin = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

  const update = (patch) => {
    onChange({
      ...location,
      ...patch,
      formattedAddress: patch.formattedAddress ?? patch.fullAddress ?? location.formattedAddress,
      fullAddress: patch.fullAddress ?? patch.formattedAddress ?? location.fullAddress,
    });
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
      placeName: extras.placeName || place.placeName || location.placeName,
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
    setQuery(next.formattedAddress || place.label || query);
  };

  const applyCoordinates = async (latitude, longitude, source) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMessage('');
    update({
      latitude,
      longitude,
      latitudeRaw: String(latitude),
      longitudeRaw: String(longitude),
      locationSource: source,
    });
    drawMarker(latitude, longitude);
    const place = await reverseGeocode(latitude, longitude).catch(() => null);
    if (place && (place.country || place.city || place.formattedAddress || place.placeName)) {
      applyPlace(place, source, { latitude, longitude });
      setMessage('');
      return;
    }
    setMessage(t('booking.unnamedPinOk', language));
    setQuery(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
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
        const start = [
          location.latitude || DEFAULT_RWANDA_CENTER.latitude,
          location.longitude || DEFAULT_RWANDA_CENTER.longitude,
        ];
        mapRef.current = leaflet.map(mapNodeRef.current).setView(start, location.latitude ? 16 : 8);
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        mapRef.current.on('click', (event) => {
          applyCoordinates(Number(event.latlng.lat), Number(event.latlng.lng), 'map_click');
        });
        if (location.latitude && location.longitude) {
          drawMarker(Number(location.latitude), Number(location.longitude));
        }
      })
      .catch(() => setMessage(t('booking.mapLoadFailed', language)));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3 || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) {
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
          country: location.countryCode || undefined,
          latitude: location.latitude || undefined,
          longitude: location.longitude || undefined,
        });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(timer);
    };
  }, [query, location.countryCode, location.latitude, location.longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage(t('booking.gpsUnavailable', language));
      return;
    }
    setMessage(t('booking.gpsRequesting', language));
    navigator.geolocation.getCurrentPosition(
      (position) => applyCoordinates(Number(position.coords.latitude), Number(position.coords.longitude), 'gps'),
      () => setMessage(t('booking.gpsDenied', language)),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const selectResult = (result) => {
    setSearchResults([]);
    applyPlace(result, 'search', {
      placeName: result.placeName || result.label,
      formattedAddress: result.formattedAddress || result.label,
      placeId: result.placeId,
    });
    setMessage('');
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-950">{t('booking.customerLocation', language)}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">{t('booking.customerLocationMapHelp', language)}</p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="absolute left-14 right-3 top-3 z-[500] rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('booking.searchYourPlace', language)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          {(searching || searchResults.length > 0) && (
            <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-white">
              {searching && <p className="p-3 text-sm text-slate-500">{t('booking.searchingPlaces', language)}</p>}
              {searchResults.map((result) => (
                <button
                  key={`${result.latitude}-${result.longitude}-${result.label}`}
                  type="button"
                  onClick={() => selectResult(result)}
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50"
                >
                  <span className="font-semibold text-slate-900">{result.label}</span>
                  {(result.city || result.country) && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {[result.city, result.state, result.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={mapNodeRef} className="h-72 w-full sm:h-80" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useCurrentLocation} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
          {t('booking.useCurrentLocation', language)}
        </button>
        {hasPin ? (
          <span className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
            {location.formattedAddress || location.placeName || `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`}
          </span>
        ) : (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
            {t('booking.dropPinRequired', language)}
          </span>
        )}
        {message && <span className="text-sm font-semibold text-amber-800">{message}</span>}
      </div>

      {hasPin && (
        <label className="mt-3 block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('booking.placeNoteOptional', language)}</span>
          <input
            value={location.placeName || ''}
            onChange={(event) => update({ placeName: event.target.value })}
            placeholder={t('booking.placeNotePlaceholder', language)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
      )}
    </section>
  );
}
