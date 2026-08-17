import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardLayout from '../components/DashboardLayout';
import { adminApi, getAuthData, publicApi } from '../lib/api';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { serviceApprovalStatus, withoutDrafts } from '../lib/dashboard';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getServicesSeo } from '../lib/seo';

export default function HotelsPage() {
  const { isAuthenticated } = useAuth();
  const content = <ServicesCatalog embedded={isAuthenticated} />;

  if (isAuthenticated) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      {content}
      <Footer />
    </div>
  );
}

function ServicesCatalog({ embedded = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const [allHotels, setAllHotels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState(searchParams.get('providerId') || '');
  const [sortBy, setSortBy] = useState('recommended');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || searchParams.get('type') || '');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { language } = useLanguage();

  const locationParam = searchParams.get('location') || '';
  const searchParam = searchParams.get('search') || searchParams.get('q') || searchParams.get('service') || '';

  const loadHotels = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const catalogResponse = await publicApi.getHotels({
        category: categoryFilter || undefined,
        type: categoryFilter || undefined,
        location: locationParam || undefined,
        search: searchParam || undefined,
      });
      let listings = withoutDrafts(normalizeHotels(catalogResponse.services || catalogResponse.businesses || catalogResponse.hotels || []));
      if (isAdmin) {
        const token = getAuthData()?.token;
        const adminResponse = token ? await adminApi.getServices(token).catch(() => ({})) : {};
        setProviders(adminResponse.providers || []);
        if (providerId) {
          listings = listings.filter((hotel) => matchesCatalogProvider(hotel, providerId));
          if (!listings.length) {
            const filteredAdmin = await adminApi.getServices(token, { providerId, approvalStatus: 'approved' }).catch(() => ({}));
            listings = withoutDrafts(normalizeHotels(filteredAdmin.services || [])).filter((item) => serviceApprovalStatus(item) === 'approved' || !item.approvalStatus);
          }
        }
      } else {
        setProviders([]);
      }
      setAllHotels(listings);
    } catch (error) {
      setAllHotels([]);
      setLoadError(error.message || 'Unable to load services.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [categoryFilter, isAdmin, locationParam, providerId, searchParam]);

  useEffect(() => {
    Promise.resolve().then(() => loadHotels());
    return subscribeToRealtime(
      [
        REALTIME_EVENTS.CATALOG_CHANGED,
        REALTIME_EVENTS.HOTEL_CHANGED,
        REALTIME_EVENTS.SERVICE_CHANGED,
        REALTIME_EVENTS.ROOM_CHANGED,
      ],
      () => loadHotels({ silent: true })
    );
  }, [loadHotels]);

  const filteredHotels = useMemo(() => {
    let result = [...allHotels];

    if (availableOnly) {
      result = result.filter((hotel) => Number(hotel.availableInventory ?? 1) > 0);
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        result.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return b.rating - a.rating;
        });
    }

    return result;
  }, [allHotels, availableOnly, sortBy]);

  const categoryOptions = useMemo(
    () => [...new Set(allHotels.map((hotel) => hotel.serviceCategory).filter(Boolean))].sort(),
    [allHotels]
  );

  const locationOptions = useMemo(
    () => [...new Set(allHotels.flatMap((hotel) => [hotel.destinationLocation, hotel.district, hotel.location]).filter(Boolean))].sort(),
    [allHotels]
  );

  const groupedHotels = useMemo(
    () =>
      filteredHotels.reduce((groups, hotel) => {
        const category = hotel.serviceCategory || 'general';
        groups[category] = groups[category] || [];
        groups[category].push(hotel);
        return groups;
      }, {}),
    [filteredHotels]
  );

  const seo = getServicesSeo({ location: locationParam, search: searchParam });
  const breadcrumbItems = [
    { label: 'Home', to: '/' },
    { label: 'Services', to: '/services' },
    ...(locationParam || searchParam ? [{ label: seo.h1 }] : []),
  ];

  return (
    <main className={`flex-1 bg-white dark:bg-slate-950 ${embedded ? 'min-h-screen' : ''}`}>
      <SeoHead {...seo} />
      {!embedded && <SeoBreadcrumbs items={breadcrumbItems} />}
      <div className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-70 md:block">
          <img src="/safariscon-hero-services.png" alt="SafarisCon services across Rwanda including hotels, tours, and transport" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/80 to-slate-50/20 dark:from-slate-900 dark:via-slate-900/85 dark:to-slate-900/20" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-4 px-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary dark:bg-blue-950/70 dark:text-blue-200">
            <BriefcaseIcon />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">Service catalog</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white md:text-4xl">{seo.h1}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {seo.description}
            </p>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <SearchBar variant="compact" locationOptions={locationOptions} extraColumns={isAdmin ? 5 : 4}>
            <div className="hidden md:contents">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="All categories"
                className="search-control w-full bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{formatLabel(category)}</option>
                ))}
              </select>
              {isAdmin && (
                <select
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                  aria-label="Service provider"
                  className="search-control w-full bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">All providers</option>
                  {providers.map((provider) => {
                    const id = provider.id || provider._id || '';
                    const label = [provider.name, provider.sellerId || provider.email].filter(Boolean).join(' · ');
                    return <option key={id} value={id}>{label || id}</option>;
                  })}
                </select>
              )}
              <label className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200">
                <span>Available now</span>
                <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
              </label>
            </div>
          </SearchBar>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {(locationParam || searchParam) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {searchParam && <FilterChip label={searchParam} onRemove={() => removeParam(searchParams, navigate, 'search')} />}
            {locationParam && <FilterChip label={locationParam} onRemove={() => removeParam(searchParams, navigate, 'location')} />}
            <button type="button" onClick={() => navigate('/services')} className="text-sm font-bold text-slate-600 underline hover:text-primary dark:text-slate-400">
              Clear all
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              {filteredHotels.length} {filteredHotels.length === 1 ? t('serviceFound', language) : t('servicesFound', language)}
            </h2>
            {locationParam && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {t('inLocation', language)} <span className="font-bold">{locationParam}</span>
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            {t('sortBy', language)}
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="recommended">{t('recommended', language)}</option>
              <option value="price-low">{t('priceLowToHigh', language)}</option>
              <option value="price-high">{t('priceHighToLow', language)}</option>
              <option value="rating">{t('highestRated', language)}</option>
            </select>
          </label>
        </div>

        <div className="mb-5 flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:hidden" aria-label="Service display style">
          <button type="button" onClick={() => setMobileView('list')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mobileView === 'list' ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'}`}>
            List
          </button>
          <button type="button" onClick={() => setMobileView('grid')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mobileView === 'grid' ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'}`}>
            Grid
          </button>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" />
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {loadError}
          </div>
        ) : filteredHotels.length > 0 ? (
          <div className="space-y-10">
            {Object.entries(groupedHotels).map(([category, hotels]) => (
              <section key={category}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">{formatLabel(category)}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {hotels.length} {hotels.length === 1 ? t('serviceFound', language) : t('servicesFound', language)}
                    </p>
                  </div>
                </div>
                <div className={`services-results-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${mobileView === 'list' ? 'mobile-list-view' : 'mobile-grid-view'}`}>
                  {hotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} showProvider={isAdmin} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <NoResultsIcon />
            <h3 className="mt-4 text-xl font-black text-slate-800 dark:text-white">{t('noServicesFound', language)}</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tryAdjustingFilters', language)}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-primary dark:bg-blue-950/60 dark:text-blue-200">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-primary-dark" aria-label={`Remove ${label}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </span>
  );
}

function removeParam(searchParams, navigate, key) {
  const params = new URLSearchParams(searchParams);
  params.delete(key);
  navigate(`/services?${params.toString()}`);
}

function BriefcaseIcon() {
  return <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2M4 8h16v11H4V8zm0 4h16m-9-2h2v4h-2v-4z" /></svg>;
}

function NoResultsIcon() {
  return <svg className="mx-auto h-16 w-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.17 16.17a4 4 0 015.66 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function formatLabel(value) {
  return String(value || 'service')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function matchesCatalogProvider(hotel, providerId) {
  const wanted = String(providerId || '');
  if (!wanted) return true;
  const ids = [
    hotel.providerId,
    hotel.provider?.id,
    hotel.provider?._id,
    hotel.provider?.sellerId,
    hotel.sellerId,
    hotel.sellerUserId,
    hotel.userId?._id,
    hotel.userId,
    hotel.businessId?._id,
    hotel.businessId,
  ];
  return ids.some((id) => String(id || '') === wanted);
}
