import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import MarketplaceGuide from '../components/MarketplaceGuide';
import PaymentMethods from '../components/PaymentMethods';

const SERVICE_AREAS = [
  ['Hotels and stays', 'Verified rooms, lodges, guesthouses, and retreats.', '/services?service=hotel'],
  ['Cafes and food', 'Book cafe, restaurant, bakery, and local food services.', '/services?service=cafe'],
  ['Car rentals', 'Find transport, transfers, car rentals, and travel mobility.', '/services?service=car rental'],
  ['Tours and experiences', 'Discover cultural visits, events, guides, and activities.', '/services?service=tour'],
];

const FAQS = [
  ['Can visitors browse services without an account?', 'Yes. Public visitors can search and view available service providers before deciding to log in or register.'],
  ['When do I need an account?', 'You need an account when you want to book, pay, manage requests, or unlock provider contact details.'],
  ['Who can join as a provider?', 'Hotels, cafes, restaurants, car rental teams, tour operators, venues, and other travel-related service providers can register.'],
  ['How does SafarisCon protect bookings?', 'The booking flow keeps provider details structured, records payment steps, and gives customers confirmation documents for their service.'],
];

export default function HomePage() {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const { language } = useLanguage();

  const locationOptions = useMemo(
    () => [...new Set(hotels.map((hotel) => hotel.destinationLocation).filter(Boolean))].sort(),
    [hotels]
  );

  const serviceOptions = useMemo(
    () =>
      [
        ...new Map(
          hotels.map((hotel) => [
            hotel.serviceCategory || hotel.type,
            {
              value: hotel.serviceCategory || hotel.type,
              label: formatLabel(hotel.serviceCategory || hotel.type),
            },
          ])
        ).values(),
      ].filter((option) => option.value),
    [hotels]
  );

  const featuredHotels = useMemo(() => hotels.slice(0, 6), [hotels]);

  const loadHotels = async ({ silent = false } = {}) => {
    if (!silent) setLoadingHotels(true);
    setServicesError('');

    try {
      const response = await publicApi.getHotels();
      setHotels(normalizeHotels(response.businesses || response.hotels || []));
    } catch (error) {
      setHotels([]);
      setServicesError(error.message || 'Unable to load registered services.');
    } finally {
      if (!silent) setLoadingHotels(false);
    }
  };

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
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />

      <section className="public-hero relative overflow-hidden">
        <img
          src="/safariscon-hero-services.png"
          alt="SafarisCon service booking across hotels, transport, cafes, and travel experiences"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/96 via-white/88 to-white/35 dark:from-slate-950/96 dark:via-slate-950/86 dark:to-slate-950/35" />
        <div className="relative z-10 mx-auto grid min-h-[620px] max-w-7xl items-center gap-8 px-4 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.58fr)]">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
              Rwanda service marketplace
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white md:text-6xl">
              SafarisCon service marketplace
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300 md:text-lg">
              Find trusted hotels, cafes, car rentals, venues, tours, and destination services from verified providers. Browse publicly, then create an account when you are ready to book and manage your service.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/services" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-primary-dark">
                Browse available services
              </Link>
              <Link to="/register" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-500 dark:hover:text-blue-300">
                Create account
              </Link>
              <Link to="/provider-register" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-primary hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                Register as provider
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/92 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/92">
            <p className="mb-3 text-sm font-black text-slate-900 dark:text-white">Search available providers</p>
            <SearchBar variant="hero" serviceOptions={serviceOptions} locationOptions={locationOptions} />
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Accepted payment methods</p>
              <PaymentMethods compact />
            </div>
          </div>
        </div>
      </section>

      <MarketplaceGuide />

      <section className="section-block bg-white dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
            <img src="/safariscon-about-services.png" alt="Service providers collaborating through SafarisCon" className="h-full min-h-[340px] w-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">For customers and providers</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">One organized place for Rwanda travel services</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              SafarisCon connects visitors with service providers who need a professional way to publish offers, receive bookings, and support customers. The platform is built for hotels, cafes, car rentals, tour teams, venues, food services, and travel experience providers.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SERVICE_AREAS.map(([title, description, to]) => (
                <Link key={title} to={to} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-primary hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-800">
                  <strong className="block text-sm text-slate-950 dark:text-white">{title}</strong>
                  <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block bg-slate-50 dark:bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">Available services</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                {t('allRegisteredServices', language)}
              </h2>
            </div>
            <Link to="/services" className="font-black text-primary hover:text-primary-dark">
              {t('viewAllServices', language)} -&gt;
            </Link>
          </div>

          <div className="home-service-grid grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {loadingHotels && <LoadingSpinner />}

            {!loadingHotels && servicesError && (
              <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                {servicesError}
              </div>
            )}

            {!loadingHotels && !servicesError && featuredHotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)}

            {!loadingHotels && !servicesError && featuredHotels.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400">{t('noServicesAvailable', language)}</p>
            )}
          </div>
        </div>
      </section>

      <section id="faqs" className="section-block bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-wide text-primary">FAQs</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">How SafarisCon works</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FAQS.map(([question, answer]) => (
              <article key={question} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-black text-slate-950 dark:text-white">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{answer}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/login" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">Login</Link>
            <Link to="/register" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary-dark">Get started</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function formatLabel(value) {
  return String(value || 'service')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
