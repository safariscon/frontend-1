import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export default function HotelsPage() {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const [allHotels, setAllHotels] = useState([]);
   const [sortBy, setSortBy] = useState('recommended');
   const [loading, setLoading] = useState(true);
   const { language } = useLanguage();

  const locationParam = searchParams.get('location');
  const budgetParam = searchParams.get('budget');
  const serviceParam = searchParams.get('service');

  const loadHotels = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await publicApi.getHotels();
      setAllHotels(normalizeHotels(response.hotels || []));
    } finally {
      if (!silent) setLoading(false);
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

  const filteredHotels = useMemo(() => {
    let result = [...allHotels];

    // Filter by location
    if (locationParam) {
      result = result.filter((hotel) =>
        hotel.location.toLowerCase() === locationParam.toLowerCase()
      );
    }

    // Filter by budget (base price)
    if (budgetParam) {
      const maxBudget = parseInt(budgetParam);
      result = result.filter((hotel) => hotel.basePrice <= maxBudget);
    }

    if (serviceParam) {
      const query = serviceParam.toLowerCase();
      result = result.filter((hotel) => {
        const serviceText = [
          hotel.name,
          hotel.type,
          hotel.description,
          ...(hotel.services || []),
        ]
          .join(' ')
          .toLowerCase();
        return serviceText.includes(query);
      });
    }

    // Sort
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
        // Recommended: featured first, then by rating
        result.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return b.rating - a.rating;
        });
    }

    return result;
  }, [allHotels, locationParam, budgetParam, serviceParam, sortBy]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

<main className="flex-1">
       {/* Header */}
       <div className="bg-gradient-to-br from-primary to-primary-dark text-white py-12">
         <div className="max-w-7xl mx-auto px-4 text-center">
           <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('exploreServices', language)}</h1>
           <p className="text-lg text-gray-200 max-w-2xl mx-auto">
             {t('exploreDescription', language)}
           </p>
         </div>
       </div>

        {/* Search and Filters */}
        <div className="bg-white shadow-md sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <SearchBar variant="compact" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Active Filters */}
          {(locationParam || budgetParam || serviceParam) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {serviceParam && (
                <span className="inline-flex items-center gap-1 bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-full text-sm">
                  {serviceParam}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('service');
                      navigate(`/services?${params.toString()}`);
                    }}
                    className="hover:text-primary-dark"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {locationParam && (
                <span className="inline-flex items-center gap-1 bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-full text-sm">
                  {locationParam}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('location');
                      navigate(`/services?${params.toString()}`);
                    }}
                    className="hover:text-primary-dark"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {budgetParam && (
                <span className="inline-flex items-center gap-1 bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-full text-sm">
                  Under {formatRwf(budgetParam)}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('budget');
                      navigate(`/services?${params.toString()}`);
                    }}
                    className="hover:text-primary-dark"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              <button
                onClick={() => navigate('/services')}
                className="text-gray-600 hover:text-primary text-sm underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredHotels.length} {filteredHotels.length === 1 ? t('serviceFound', language) : t('servicesFound', language)}
              </h2>
              {locationParam && (
                <p className="text-gray-600">
                  {t('inLocation', language)} <span className="font-semibold">{locationParam}</span>
                </p>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-gray-600">{t('sortBy', language)}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="recommended">{t('recommended', language)}</option>
                <option value="price-low">{t('priceLowToHigh', language)}</option>
                <option value="price-high">{t('priceHighToLow', language)}</option>
                <option value="rating">{t('highestRated', language)}</option>
              </select>
            </div>
          </div>

{/* Hotel Grid */}
           {loading ? (
             <LoadingSpinner size="lg" />
           ) : filteredHotels.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredHotels.map((hotel) => (
                 <HotelCard key={hotel.id} hotel={hotel} />
               ))}
             </div>
           ) : (
             <div className="text-center py-12">
               <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noServicesFound', language)}</h3>
               <p className="text-gray-500">
                 {t('tryAdjustingFilters', language)}
               </p>
             </div>
           )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
