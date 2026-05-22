import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function SearchBar({ variant = 'compact' }) {
  const [location, setLocation] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [budget, setBudget] = useState('');
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (serviceName.trim()) params.set('service', serviceName.trim());
    if (budget.trim()) params.set('budget', budget.trim());
    navigate(`/services?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        variant === 'hero'
          ? 'mt-4 grid gap-3 sm:grid-cols-[1.7fr_1.7fr_1fr_1fr_auto]'
          : 'grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]'
      }
    >
      <label className="sr-only" htmlFor="service-input">
        {t('serviceName', language)}
      </label>
      <input
        id="service-input"
        value={serviceName}
        onChange={(event) => setServiceName(event.target.value)}
        placeholder={t('serviceNamePlaceholder', language)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <label className="sr-only" htmlFor="location-input">
        {t('location', language)}
      </label>
      <input
        id="location-input"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder={t('location', language)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <label className="sr-only" htmlFor="budget-input">
        {t('budget', language)}
      </label>
      <input
        id="budget-input"
        value={budget}
        onChange={(event) => setBudget(event.target.value)}
        placeholder={t('maxBudget', language)}
        inputMode="numeric"
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <button
        type="submit"
        className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        {t('search', language)}
      </button>
    </form>
  );
}
