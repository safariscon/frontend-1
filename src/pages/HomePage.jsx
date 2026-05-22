import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SearchBar from '../components/SearchBar';

import HotelCard from '../components/HotelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function HomePage() {
   const [hotels, setHotels] = useState([]);
   const [loadingHotels, setLoadingHotels] = useState(true);
   const { language } = useLanguage();

  const loadHotels = async ({ silent = false } = {}) => {
    if (!silent) setLoadingHotels(true);
    try {
      const response = await publicApi.getHotels();
      setHotels(normalizeHotels(response.hotels || []));
    } catch {
      setHotels([]);
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

  const featuredHotels = hotels.filter((hotel) => hotel.isFeatured);
  const homepageHotels = featuredHotels.length > 0 ? featuredHotels : hotels.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1800&q=80"
            alt="Person booking travel services online from home"
            className="h-full w-full object-cover opacity-80"
          />
                            </div>

<div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-28">
           <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
             <div className="text-white">
               <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 backdrop-blur">
                 safariscon
                 <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
               </p>
               <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight md:text-4xl">
                {t('heroTitle', language)}
               </h1>

               <div className="mt-8 grid gap-4 sm:grid-cols-3">
                 <HeroMetric label={t('registeredProviders', language)} value="250+" />
                
                 <HeroMetric label={t('liveSupport', language)} value="24/7" />
               </div>

              <div className="mt-10">
                <SearchBar variant="hero" />
              </div>
            </div>

            <div className="relative perspective-1200">
              <div className="hero-3d-stage relative mx-auto h-[520px] w-full max-w-[560px]">
                <div className="hero-orb hero-orb-one" />
                <div className="hero-orb hero-orb-two" />

                <div className="hero-card hero-card-main">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">{t('platformMatch', language)}</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-900">{t('customerRequest', language)}</h3>
                    </div>
                    <div className="rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
                      {t('live', language)}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <JourneyRow
                      title={t('travelerLabel', language)}
                      subtitle={t('travelerSubtitle', language)}
                      tone="cyan"
                    />
                    <div className="flex items-center justify-center">
                      <div className="hero-flow-line" />
                    </div>
                    <JourneyRow
                      title={t('sellerLabel', language)}
                      subtitle={t('sellerSubtitle', language)}
                      tone="emerald"
                    />
                  </div>
                </div>

                <div className="hero-card hero-card-seller">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{t('serviceProviderProfile', language)}</p>
                  <h4 className="mt-2 text-xl font-black text-slate-900">Virunga View Lodge</h4>
                  <p className="mt-3 text-sm text-slate-600">{t('sampleProviderDescription', language)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{t('verified', language)}</span>
                    <span className="text-sm font-bold text-emerald-700">{formatRwf(85000)}</span>
                  </div>
                </div>

                <div className="hero-card hero-card-customer">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{t('customerBenefit', language)}</p>
                  <h4 className="mt-2 text-xl font-black text-slate-900">{t('oneSimpleBookingPath', language)}</h4>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li>{t('compareTrustedSellers', language)}</li>
                    <li>{t('seeLocalPrices', language)}</li>
                    <li>{t('bookLessFriction', language)}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

<section className="py-16 bg-white">
         <div className="max-w-7xl mx-auto px-4">
           <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
             {t('whyChoose', language)} <span className="text-primary">safariscon?</span>
           </h2>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="text-center p-6">
               <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
               </div>
               <h3 className="text-xl font-bold mb-2">{t('realTimeDiscovery', language)}</h3>
               <p className="text-gray-600">
                 {t('realTimeDiscoveryDesc', language) || 'We help customers discover the right sellers instantly through verified photos and real-time availability, from boutique stays to transport and curated experiences.'}
               </p>
             </div>

             <div className="text-center p-6">
               <div className="w-16 h-16 bg-secondary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <h3 className="text-xl font-bold mb-2">{t('multiCurrency', language)}</h3>
               <p className="text-gray-600">
                 {t('multiCurrencyDesc', language) || 'Accept both USD and RWF payments with transparent pricing. Choose your preferred currency for seamless transactions with local sellers.'}
               </p>
             </div>

             <div className="text-center p-6">
               <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                 </svg>
               </div>
               <h3 className="text-xl font-bold mb-2">{t('fastBooking', language)}</h3>
               <p className="text-gray-600">
                 {t('fastBookingDesc', language) || 'From inquiry to confirmed booking in real-time. Our platform ensures instant communication and immediate service confirmation for all your travel needs.'}
               </p>
             </div>
           </div>
         </div>
       </section>

<section className="py-16 bg-gray-50">
         <div className="max-w-7xl mx-auto px-4">
           <div className="flex justify-between items-center mb-8">
             <h2 className="text-3xl md:text-4xl font-bold">
               {t('featuredServices', language)} <span className="text-primary">safariscon?</span>
             </h2>
             <Link
               to="/services"
               className="text-primary hover:text-primary-dark font-semibold flex items-center gap-1"
             >
               {t('viewAllServices', language)} {'->'}
             </Link>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {loadingHotels && <LoadingSpinner />}
             {!loadingHotels &&
               homepageHotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)}
             {!loadingHotels && homepageHotels.length === 0 && (
               <p className="text-gray-500">{t('noServicesAvailable', language)}</p>
             )}
           </div>
         </div>
       </section>

<section className="py-16 bg-gradient-to-r from-primary to-secondary">
         <div className="max-w-7xl mx-auto px-4 text-center">
           <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
             {t('readyExplore', language)}
           </h2>
           <p className="text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
             {t('planTrip', language)}
           </p>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link
               to="/register"
               className="px-8 py-3 bg-white text-primary font-bold rounded-xl hover:bg-gray-100 transition"
             >
               {t('getStarted', language)}
             </Link>
             <Link
               to="/services"
               className="px-8 py-3 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-primary transition"
             >
               {t('browseServices', language)}
             </Link>
           </div>
         </div>
       </section>

      <Footer />
    </div>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function JourneyRow({ title, subtitle, tone }) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-cyan-100 text-cyan-700';

  return (
    <div className="flex items-center gap-4 rounded-[1.25rem] bg-slate-50 p-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${toneClass}`}>
        {title.slice(0, 1)}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}
