import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t, translateCategory } from '../lib/translations';
import MarketplaceGuide from '../components/MarketplaceGuide';
import PaymentMethods from '../components/PaymentMethods';
import SeoHead from '../components/SeoHead';
import { getHomeSeo } from '../lib/seo';

const SERVICE_AREAS = [
  ['home.hotelsAndStays', 'home.hotelsAndStaysDesc', '/services?service=hotel'],
  ['home.cafesAndFood', 'home.cafesAndFoodDesc', '/services?service=cafe'],
  ['home.carRentals', 'home.carRentalsDesc', '/services?service=car rental'],
  ['home.toursAndExperiences', 'home.toursAndExperiencesDesc', '/services?service=tour'],
];

const FAQS = [
  ['home.faq1q', 'home.faq1a'],
  ['home.faq2q', 'home.faq2a'],
  ['home.faq3q', 'home.faq3a'],
  ['home.faq4q', 'home.faq4a'],
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
              label: translateCategory(hotel.serviceCategory || hotel.type, language),
            },
          ])
        ).values(),
      ].filter((option) => option.value),
    [hotels, language]
  );

  const featuredHotels = useMemo(() => hotels.slice(0, 6), [hotels]);

  const loadHotels = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingHotels(true);
    setServicesError('');

    try {
      const response = await publicApi.getHotels();
      setHotels(normalizeHotels(response.businesses || response.hotels || []));
    } catch (error) {
      setHotels([]);
      setServicesError(error.message || t('unableToLoadServices', language));
    } finally {
      if (!silent) setLoadingHotels(false);
    }
  }, [language]);

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

  const seo = getHomeSeo(language);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <SeoHead {...seo} />
      <Navbar />

      <main>
      <section className="public-hero relative overflow-hidden">
        <img
          src="/safariscon-hero-services.png"
          alt="SafarisCon service booking across hotels, transport, cafes, and travel experiences in Rwanda"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/62 to-slate-950/18" />
        <div className="absolute inset-y-0 left-0 w-[58%] bg-slate-950/20" />
        <div className="relative z-10 mx-auto grid min-h-[620px] max-w-7xl items-center gap-8 px-4 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.58fr)]">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-blue-50 shadow-sm backdrop-blur">
              {t('home.badge', language)}
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.45)] md:text-4xl">
              {t('home.heroTitle', language)}
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-bold italic tracking-wide text-blue-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] md:text-xl">
              {t('home.heroSlogan', language)}
            </p>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] md:text-base md:leading-7">
              {t('home.heroLead', language)}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/services" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-primary-dark">
                {t('home.browseAvailable', language)}
              </Link>
              <Link to="/register" className="rounded-xl border border-slate-900 bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-500 dark:hover:text-blue-300">
                {t('home.createAccount', language)}
              </Link>
              <Link to="/provider-register" className="rounded-xl border border-white/35 bg-white/18 px-5 py-3 text-sm font-black text-white shadow-sm backdrop-blur hover:bg-white/25">
                {t('home.registerAsProvider', language)}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:p-8">
            <p className="mb-4 text-sm font-black tracking-tight text-slate-900 dark:text-white">{t('home.searchProviders', language)}</p>
            <SearchBar variant="hero" serviceOptions={serviceOptions} locationOptions={locationOptions} />
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('home.acceptedPayments', language)}</p>
              <PaymentMethods compact />
            </div>
          </div>
        </div>
      </section>

      <MarketplaceGuide />

      <section className="section-block bg-white dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
            <img src="/safariscon-about-services.png" alt="SafarisCon service providers collaborating on hotels, tours, and transport in Rwanda" className="h-full min-h-[340px] w-full object-cover" loading="lazy" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">{t('home.forCustomersAndProviders', language)}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">{t('home.onePlaceTitle', language)}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {t('home.onePlaceLead', language)}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SERVICE_AREAS.map(([titleKey, descriptionKey, to]) => (
                <Link key={titleKey} to={to} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-primary hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-800">
                  <strong className="block text-sm text-slate-950 dark:text-white">{t(titleKey, language)}</strong>
                  <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-400">{t(descriptionKey, language)}</span>
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
              <p className="text-xs font-black uppercase tracking-wide text-primary">{t('home.availableServices', language)}</p>
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

      <section className="section-block bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-black uppercase tracking-wide text-primary">{t('home.trustEyebrow', language)}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t('home.bookOnlineTitle', language)}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t('home.trustLead', language)}</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <li key={step} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-xs font-black uppercase tracking-wide text-primary">{step}</p>
                <h3 className="mt-1 font-black text-slate-950 dark:text-white">{t(`howSteps.${step}title`, language)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t(`howSteps.${step}body`, language)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('home.trustLine', language)}</p>
          <p className="mt-2 text-xs text-slate-500">{t('home.cancelNote', language)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/terms" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">{t('termsOfUse', language)}</Link>
            <Link to="/privacy" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800">{t('privacyPolicy', language)}</Link>
            <Link to="/payments" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800">{t('legal.paymentsTitle', language)}</Link>
            <Link to="/how-it-works" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800">{t('footer.howItWorks', language)}</Link>
          </div>
        </div>
      </section>

      <section id="faqs" className="section-block bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-wide text-primary">{t('home.faqEyebrow', language)}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t('home.faqTitle', language)}</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FAQS.map(([questionKey, answerKey]) => (
              <article key={questionKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-black text-slate-950 dark:text-white">{t(questionKey, language)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t(answerKey, language)}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/login" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{t('login', language)}</Link>
            <Link to="/register" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary-dark">{t('home.getStarted', language)}</Link>
          </div>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}

