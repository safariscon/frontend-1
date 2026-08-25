import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import { addDaysIso, todayIsoDate } from '../lib/staySearch';
import PlaceSearchField from './PlaceSearchField';

const CATALOG_DEBOUNCE_MS = 450;

const catalogQueryEquals = (params, next) => {
  const keys = ['location', 'lat', 'lng', 'checkIn', 'checkOut', 'category', 'type'];
  return keys.every((key) => String(params.get(key) || '') === String(next.get(key) || ''));
};

export default function SearchBar({ variant = 'compact', children = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('location') || '');
  const [lat, setLat] = useState(searchParams.get('lat') || '');
  const [lng, setLng] = useState(searchParams.get('lng') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const { language } = useLanguage();
  const today = todayIsoDate();
  const checkoutMin = checkIn ? addDaysIso(checkIn, 1) : addDaysIso(today, 1);
  const hasSelection = Boolean(lat && lng);
  const isHero = variant === 'hero';
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    setQuery(searchParams.get('location') || '');
    setLat(searchParams.get('lat') || '');
    setLng(searchParams.get('lng') || '');
    setCheckIn(searchParams.get('checkIn') || '');
    setCheckOut(searchParams.get('checkOut') || '');
  }, [searchParams]);

  const buildParams = ({ location, lat: nextLat, lng: nextLng, checkIn: nextIn, checkOut: nextOut }) => {
    const params = new URLSearchParams();
    const placeName = String(location || '').trim();
    if (placeName) params.set('location', placeName);
    if (nextLat && nextLng) {
      params.set('lat', nextLat);
      params.set('lng', nextLng);
    }
    if (nextIn && nextOut && nextOut > nextIn) {
      params.set('checkIn', nextIn);
      params.set('checkOut', nextOut);
    }
    const category = searchParams.get('category') || searchParams.get('type');
    if (category) params.set('category', category);
    return params;
  };

  const applyCatalogFilters = (next) => {
    const params = buildParams(next);
    if (catalogQueryEquals(searchParams, params)) return;
    setSearchParams(params, { replace: true });
  };

  const goToServices = (next) => {
    navigate(`/services?${buildParams(next).toString()}`);
  };

  const applyPlace = (place) => {
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    const label = place.formattedAddress || place.label || place.placeName || '';
    const nextLat = Number.isFinite(latitude) ? String(latitude) : '';
    const nextLng = Number.isFinite(longitude) ? String(longitude) : '';
    skipDebounceRef.current = true;
    setQuery(label);
    setLat(nextLat);
    setLng(nextLng);
    setFormError('');
    const payload = { location: label, lat: nextLat, lng: nextLng, checkIn, checkOut };
    if (isHero) return;
    applyCatalogFilters(payload);
  };

  const clearPlace = () => {
    skipDebounceRef.current = true;
    setQuery('');
    setLat('');
    setLng('');
    setFormError('');
    if (!isHero) applyCatalogFilters({ location: '', lat: '', lng: '', checkIn, checkOut });
  };

  useEffect(() => {
    if (isHero) return undefined;
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return undefined;
    }
    if (lat && lng) return undefined;
    const text = query.trim();
    const timer = window.setTimeout(() => {
      if (text.length >= 3 || text.length === 0) {
        applyCatalogFilters({ location: text, lat: '', lng: '', checkIn, checkOut });
      }
    }, CATALOG_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // Place text is debounced; dates apply immediately in their handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isHero]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      setFormError(t('searchBar.needDates', language));
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      setFormError(t('searchBar.checkoutAfter', language));
      return;
    }
    setFormError('');
    goToServices({ location: query, lat, lng, checkIn, checkOut });
  };

  const onCheckInChange = (value) => {
    const nextOut = value && (!checkOut || checkOut <= value) ? addDaysIso(value, 1) : checkOut;
    setCheckIn(value);
    setCheckOut(nextOut);
    setFormError('');
    if (isHero) return;
    if (!value) {
      applyCatalogFilters({ location: query, lat, lng, checkIn: '', checkOut: '' });
      return;
    }
    applyCatalogFilters({ location: query, lat, lng, checkIn: value, checkOut: nextOut });
  };

  const onCheckOutChange = (value) => {
    setCheckOut(value);
    setFormError('');
    if (isHero) return;
    if (checkIn && value && value <= checkIn) {
      setFormError(t('searchBar.checkoutAfter', language));
      return;
    }
    applyCatalogFilters({ location: query, lat, lng, checkIn, checkOut: value });
  };

  const fieldClass = 'search-control w-full bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition dark:bg-slate-950 dark:text-slate-100';

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isHero
          ? 'hero-stay-form grid gap-4'
          : 'search-shell search-catalog-form grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      }
    >
      <div className={isHero ? undefined : 'sm:col-span-2 xl:col-span-2'}>
        <PlaceSearchField
          id="location-input"
          query={query}
          selectedLabel={query}
          hasSelection={hasSelection}
          showLabel
          label={isHero ? t('searchBar.where', language) : t('searchBar.placeName', language)}
          onQueryChange={(value) => {
            setQuery(value);
            setLat('');
            setLng('');
          }}
          onPlaceSelect={applyPlace}
          onClear={clearPlace}
          inputClassName={`${fieldClass} ${hasSelection || query ? 'pr-16' : ''}`}
        />
      </div>

      <div className={isHero ? 'grid gap-4 sm:grid-cols-2' : 'contents'}>
        <div className="search-field">
          <label className="search-label" htmlFor="checkin-input">
            {t('searchBar.checkIn', language)}
          </label>
          <input
            id="checkin-input"
            type="date"
            min={today}
            value={checkIn}
            onChange={(event) => onCheckInChange(event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="search-field">
          <label className="search-label" htmlFor="checkout-input">
            {t('searchBar.checkOut', language)}
          </label>
          <input
            id="checkout-input"
            type="date"
            min={checkoutMin}
            value={checkOut}
            onChange={(event) => onCheckOutChange(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {children}

      {isHero ? (
        <>
          <button
            type="submit"
            className="search-button w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
          >
            {t('searchBar.searchServices', language)}
          </button>
          {formError ? (
            <p className="text-sm font-semibold text-red-600">{formError}</p>
          ) : (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('searchBar.datesOptional', language)}</p>
          )}
        </>
      ) : formError ? (
        <p className="sm:col-span-full text-sm font-semibold text-red-600">{formError}</p>
      ) : null}
    </form>
  );
}
