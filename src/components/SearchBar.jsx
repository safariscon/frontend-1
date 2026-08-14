import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function SearchBar({ variant = 'compact', locationOptions = [], children = null, extraColumns }) {
  const [location, setLocation] = useState('');
  const [serviceName, setServiceName] = useState('');
  const navigate = useNavigate();
  const { language } = useLanguage();
  const compactCols = extraColumns || (children ? 4 : 2);

  const handleSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (location.trim()) params.set('location', location.trim());
    else params.delete('location');
    if (serviceName.trim()) params.set('search', serviceName.trim());
    else {
      params.delete('search');
      params.delete('q');
      params.delete('service');
    }
    navigate(`/services?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        variant === 'hero'
          ? 'search-shell search-panel grid gap-4'
          : `search-shell search-shell-compact grid gap-3 ${children ? `md:grid-cols-[repeat(${compactCols},minmax(0,1fr))_auto]` : 'md:grid-cols-[1fr_1fr_auto]'}`
      }
    >
      <div>
        <label className={variant === 'hero' ? 'search-label' : 'sr-only'} htmlFor="service-input">
          {variant === 'hero' ? 'Book travel experiences and related services' : t('serviceName', language)}
        </label>
          <input
            id="service-input"
            value={serviceName}
            onChange={(event) => setServiceName(event.target.value)}
            placeholder={t('serviceNamePlaceholder', language) === 'serviceNamePlaceholder' ? 'e.g. Car rental, Tour guide, Hotel...' : t('serviceNamePlaceholder', language)}
            className="search-control w-full bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition dark:bg-slate-950 dark:text-slate-100"
          />
      </div>

      <div>
        <label className={variant === 'hero' ? 'search-label' : 'sr-only'} htmlFor="location-input">
          {variant === 'hero' ? 'Where?' : t('location', language)}
        </label>
        <select
          id="location-input"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="search-control w-full bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="">Select District</option>
          {locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      {children}

      <button
        type="submit"
        className="search-button w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
      >
        Search Services
      </button>
    </form>
  );
}
