import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';

export default function HotelsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [allHotels, setAllHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(true);

  const locationParam = searchParams.get('location');
  const budgetParam = searchParams.get('budget');

  useEffect(() => {
    const loadHotels = async () => {
      setLoading(true);
      try {
        const response = await publicApi.getHotels();
        setAllHotels(normalizeHotels(response.hotels || []));
      } finally {
        setLoading(false);
      }
    };

    loadHotels();
  }, []);

  useEffect(() => {
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

    setTimeout(() => {
      setFilteredHotels(result);
    }, 300);
  }, [allHotels, locationParam, budgetParam, sortBy]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore Marketplace Services</h1>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">
              Explore accommodation, transport, food, tours, events, and more across Rwanda
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
          {(locationParam || budgetParam) && (
            <div className="flex flex-wrap gap-2 mb-6">
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
                {filteredHotels.length} {filteredHotels.length === 1 ? 'Service' : 'Services'} Found
              </h2>
              {locationParam && (
                <p className="text-gray-600">
                  in <span className="font-semibold">{locationParam}</span>
                </p>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
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
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No services found</h3>
              <p className="text-gray-500">
                Try adjusting your search filters
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
