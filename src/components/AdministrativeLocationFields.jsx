import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import { emptyLocationDetails, listCities, listCountries, listStates, normalizeLocationDetails } from '../lib/places';

export default function AdministrativeLocationFields({
  value,
  onChange,
  required = true,
  showNeighborhood = true,
  disabled = false,
}) {
  const { language } = useLanguage();
  const location = useMemo(() => normalizeLocationDetails(value), [value]);
  const [countries, setCountries] = useState([]);
  const [stateBundle, setStateBundle] = useState({ country: '', items: [] });
  const [cityBundle, setCityBundle] = useState({ country: '', state: '', items: [] });
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [error, setError] = useState('');

  const emit = (patch) => {
    const next = normalizeLocationDetails({ ...emptyLocationDetails(), ...location, ...patch });
    onChange(next);
  };

  useEffect(() => {
    let cancelled = false;
    listCountries()
      .then((items) => {
        if (!cancelled) setCountries(items);
      })
      .catch(() => {
        if (!cancelled) setError(t('locationUi.countriesError', language));
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    const country = location.country;
    if (!country) return undefined;
    let cancelled = false;
    listStates(country)
      .then((items) => {
        if (!cancelled) setStateBundle({ country, items });
      })
      .catch(() => {
        if (!cancelled) setStateBundle({ country, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [location.country]);

  useEffect(() => {
    const country = location.country;
    const state = location.state;
    if (!country) return undefined;
    let cancelled = false;
    listCities(country, state)
      .then((items) => {
        if (!cancelled) setCityBundle({ country, state, items });
      })
      .catch(() => {
        if (!cancelled) setCityBundle({ country, state, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [location.country, location.state]);

  const states = useMemo(
    () => (stateBundle.country === location.country ? stateBundle.items : []),
    [location.country, stateBundle.country, stateBundle.items],
  );
  const cities = useMemo(
    () => (cityBundle.country === location.country && cityBundle.state === location.state ? cityBundle.items : []),
    [cityBundle.country, cityBundle.items, cityBundle.state, location.country, location.state],
  );
  const loadingStates = Boolean(location.country) && stateBundle.country !== location.country;
  const loadingCities = Boolean(location.country) && (cityBundle.country !== location.country || cityBundle.state !== location.state);

  const countryOptions = useMemo(() => {
    if (location.country && !countries.some((item) => item.name === location.country)) {
      return [{ name: location.country, code: location.countryCode }, ...countries];
    }
    return countries;
  }, [countries, location.country, location.countryCode]);

  const stateOptions = useMemo(() => {
    if (location.state && !states.includes(location.state)) return [location.state, ...states];
    return states;
  }, [states, location.state]);

  const cityOptions = useMemo(() => {
    if (location.city && !cities.includes(location.city)) return [location.city, ...cities];
    return cities;
  }, [cities, location.city]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">{t('locationUi.country', language)}{required ? ' *' : ''}</span>
        <select
          required={required}
          disabled={disabled || loadingCountries}
          value={location.country}
          onChange={(event) => {
            const selected = countries.find((item) => item.name === event.target.value);
            emit({
              country: event.target.value,
              countryCode: selected?.code || '',
              state: '',
              city: '',
              province: '',
              district: '',
            });
          }}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          <option value="">{loadingCountries ? t('locationUi.loadingCountries', language) : t('locationUi.selectCountry', language)}</option>
          {countryOptions.map((item) => (
            <option key={item.code || item.name} value={item.name}>{item.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">{t('locationUi.stateRegion', language)}{states.length ? ' *' : ''}</span>
        {stateOptions.length ? (
          <select
            required={required && states.length > 0}
            disabled={disabled || !location.country || loadingStates}
            value={location.state}
            onChange={(event) => emit({ state: event.target.value, city: '', province: event.target.value, district: '' })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="">{loadingStates ? t('locationUi.loadingRegions', language) : t('locationUi.selectState', language)}</option>
            {stateOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        ) : (
          <input
            required={required && Boolean(location.country) && !loadingStates}
            disabled={disabled || !location.country || loadingStates}
            value={location.state}
            onChange={(event) => emit({ state: event.target.value, province: event.target.value })}
            placeholder={loadingStates ? t('locationUi.loadingRegions', language) : t('locationUi.typeState', language)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          />
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">{t('locationUi.city', language)}{required ? ' *' : ''}</span>
        {cityOptions.length ? (
          <select
            required={required}
            disabled={disabled || !location.country || loadingCities}
            value={location.city}
            onChange={(event) => emit({ city: event.target.value, district: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="">{loadingCities ? t('locationUi.loadingCities', language) : t('locationUi.selectCity', language)}</option>
            {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        ) : (
          <input
            required={required && Boolean(location.country) && !loadingCities}
            disabled={disabled || !location.country || loadingCities}
            value={location.city}
            onChange={(event) => emit({ city: event.target.value, district: event.target.value })}
            placeholder={loadingCities ? t('locationUi.loadingCities', language) : t('locationUi.typeCity', language)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          />
        )}
      </label>

      {showNeighborhood && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('locationUi.areaNeighborhood', language)}</span>
          <input
            disabled={disabled}
            value={location.sector}
            onChange={(event) => emit({ sector: event.target.value })}
            placeholder={t('optional', language)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          />
        </label>
      )}

      {error && <p className="sm:col-span-2 text-sm font-semibold text-amber-700">{error}</p>}
    </div>
  );
}
