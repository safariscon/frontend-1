import { useEffect, useId, useRef, useState } from 'react';
import { searchPlaces } from '../lib/geo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const DEBOUNCE_MS = 350;

export default function PlaceSearchField({
  query,
  onQueryChange,
  onPlaceSelect,
  onClear,
  selectedLabel = '',
  hasSelection = false,
  inputClassName = '',
  id: idProp,
  showLabel = true,
  label,
}) {
  const { language } = useLanguage();
  const generatedId = useId();
  const inputId = idProp || generatedId;
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const text = String(query || '').trim();
    if (text.length < 3) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    if (hasSelection && selectedLabel && text === selectedLabel) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(text, { country: 'rw', countryCode: 'rw', countryName: 'Rwanda' });
        if (!cancelled) {
          setResults(places.slice(0, 8));
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hasSelection, selectedLabel]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div ref={boxRef} className="place-search relative">
      <label className={showLabel ? 'search-label' : 'sr-only'} htmlFor={inputId}>
        {label || t('searchBar.placeName', language)}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          placeholder={t('searchBar.placePlaceholder', language)}
          className={inputClassName}
        />
        {hasSelection || query ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            onClick={() => {
              setResults([]);
              setOpen(false);
              onClear();
            }}
          >
            {t('searchBar.clearPlace', language)}
          </button>
        ) : null}
      </div>
      {open && String(query || '').trim().length >= 3 && !hasSelection ? (
        <ul className="place-search-menu absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {searching ? (
            <li className="px-4 py-3 text-sm font-semibold text-slate-500">{t('searchBar.searchingPlaces', language)}</li>
          ) : null}
          {!searching && results.length === 0 ? (
            <li className="px-4 py-3 text-sm font-semibold text-slate-500">{t('searchBar.noPlaces', language)}</li>
          ) : null}
          {results.map((place) => (
            <li key={`${place.placeId || place.label}-${place.latitude}-${place.longitude}`}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-800"
                onClick={() => {
                  setOpen(false);
                  setResults([]);
                  onPlaceSelect(place);
                }}
              >
                <span className="text-sm font-bold text-slate-950 dark:text-white">{place.placeName || place.label}</span>
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{place.formattedAddress || place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
