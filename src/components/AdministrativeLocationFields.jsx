import { useEffect, useMemo, useState } from 'react';
import { emptyLocationDetails, listCities, listCountries, listStates, normalizeLocationDetails } from '../lib/places';

export default function AdministrativeLocationFields({
  value,
  onChange,
  required = true,
  showNeighborhood = true,
  disabled = false,
}) {
  const location = useMemo(() => normalizeLocationDetails(value), [value]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState('');

  const emit = (patch) => {
    const next = normalizeLocationDetails({ ...emptyLocationDetails(), ...location, ...patch });
    onChange(next);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    listCountries()
      .then((items) => {
        if (!cancelled) setCountries(items);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load countries. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!location.country) {
      setStates([]);
      setCities([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingStates(true);
    setError('');
    listStates(location.country)
      .then((items) => {
        if (!cancelled) setStates(items);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.country]);

  useEffect(() => {
    if (!location.country) {
      setCities([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingCities(true);
    listCities(location.country, location.state)
      .then((items) => {
        if (!cancelled) setCities(items);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.country, location.state]);

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
        <span className="mb-1 block text-sm font-medium text-gray-700">Country{required ? ' *' : ''}</span>
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
          <option value="">{loadingCountries ? 'Loading countries...' : 'Select country'}</option>
          {countryOptions.map((item) => (
            <option key={item.code || item.name} value={item.name}>{item.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">State / region{states.length ? ' *' : ''}</span>
        {stateOptions.length ? (
          <select
            required={required && states.length > 0}
            disabled={disabled || !location.country || loadingStates}
            value={location.state}
            onChange={(event) => emit({ state: event.target.value, city: '', province: event.target.value, district: '' })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="">{loadingStates ? 'Loading regions...' : 'Select state / region'}</option>
            {stateOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        ) : (
          <input
            required={required && Boolean(location.country) && !loadingStates}
            disabled={disabled || !location.country || loadingStates}
            value={location.state}
            onChange={(event) => emit({ state: event.target.value, province: event.target.value })}
            placeholder={loadingStates ? 'Loading regions...' : 'Type state or region'}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          />
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">City{required ? ' *' : ''}</span>
        {cityOptions.length ? (
          <select
            required={required}
            disabled={disabled || !location.country || loadingCities}
            value={location.city}
            onChange={(event) => emit({ city: event.target.value, district: event.target.value })}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="">{loadingCities ? 'Loading cities...' : 'Select city'}</option>
            {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        ) : (
          <input
            required={required && Boolean(location.country) && !loadingCities}
            disabled={disabled || !location.country || loadingCities}
            value={location.city}
            onChange={(event) => emit({ city: event.target.value, district: event.target.value })}
            placeholder={loadingCities ? 'Loading cities...' : 'Type city'}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          />
        )}
      </label>

      {showNeighborhood && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Area / neighborhood</span>
          <input
            disabled={disabled}
            value={location.sector}
            onChange={(event) => emit({ sector: event.target.value })}
            placeholder="Optional"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          />
        </label>
      )}

      {error && <p className="sm:col-span-2 text-sm font-semibold text-amber-700">{error}</p>}
    </div>
  );
}
