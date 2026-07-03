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

export default function HomePage() {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [servicesError, setServicesError] = useState('');

  const { language } = useLanguage();

  const locationOptions = useMemo(
    () =>
      [...new Set(hotels.map((hotel) => hotel.destinationLocation).filter(Boolean))].sort(),
    [hotels]
  );

  const serviceOptions = useMemo(
    () =>
      [
        ...new Map(
          hotels.map((hotel) => [
            hotel.serviceCategory,
            {
              value: hotel.serviceCategory,
              label: formatLabel(hotel.serviceCategory),
            },
          ])
        ).values(),
      ],
    [hotels]
  );

  const loadHotels = async ({ silent = false } = {}) => {
    if (!silent) setLoadingHotels(true);
    setServicesError('');

    try {
      const response = await publicApi.getHotels();
      setHotels(normalizeHotels(response.hotels || []));
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
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="home-hero relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1800&q=80"
            alt="Person booking travel services online from home"
            className="h-full w-full object-cover opacity-80"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/30" />
          <div className="absolute inset-0 hero-grid opacity-20" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto h-full px-4">
          <div className="home-hero-layout grid h-full items-center gap-5">
            <div className="text-white">
              <p className="hero-eyebrow inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.45rem] font-semibold uppercase tracking-[0.12em] text-blue-100 backdrop-blur">
                safariscon
                <span className="h-1.5 w-1.5 rounded-full bg-blue-300 animate-pulse" />
              </p>

              <h1>
                {t('heroTitle', language)}
              </h1>

              <div className="hero-actions flex flex-wrap items-center gap-3">
                <Link to="/services" className="hero-primary-action">
                  {t('browseServices', language)}
                </Link>
                <div className="hero-app-note">
                  <span className="hero-app-note-icon">S</span>
                  <span><strong>Access SafarisCon on your phone.</strong><br />Install the mobile app in your phone for faster booking.</span>
                </div>
              </div>
            </div>

            <div className="hero-phone-preview" aria-hidden="true">
              <div className="hero-phone-shell">
                <div className="hero-phone-notch" />
                <div className="hero-phone-screen">
                  <div className="hero-phone-brand"><span>S</span> safariscon</div>
                  <p>Discover, book and pay for travel services easily.</p>
                  <div className="hero-phone-search">Search services</div>
                  <strong>Services we offer to you</strong>
                  <div className="hero-phone-categories"><span>acomodations</span><span>transport</span> <br /><span>Travel experiences</span> <br /><span>  
                    </span></div>
                  <div className="hero-phone-card" />
                </div>
              </div>
            </div>

            <div className="hero-search-wrap">
              <SearchBar
                variant="hero"
                serviceOptions={serviceOptions}
                locationOptions={locationOptions}
              />
              <div className="mt-2 rounded-lg border border-white/25 bg-slate-950/75 p-2 text-white shadow-lg backdrop-blur">
                <p className="mb-1.5 text-[10px] font-semibold text-blue-100">🔒 Accepted payment methods</p>
                <PaymentMethods compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketplaceGuide />

      <section className="section-block bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="section-title">
              {t('allRegisteredServices', language)}
            </h2>

            <Link
              to="/services"
              className="text-primary hover:text-primary-dark font-semibold flex items-center gap-1"
            >
              {t('viewAllServices', language)} {'->'}
            </Link>
          </div>

          <div className="home-service-grid grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {loadingHotels && <LoadingSpinner />}

            {!loadingHotels && servicesError && (
              <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {servicesError}
              </div>
            )}

            {!loadingHotels &&
              !servicesError &&
              hotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)}

            {!loadingHotels && !servicesError && hotels.length === 0 && (
              <p className="text-gray-500">
                {t('noServicesAvailable', language)}
              </p>
            )}
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
