import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RatingStars from '../components/RatingStars';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function HotelDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const { language } = useLanguage();

  useEffect(() => {
    const loadHotel = async () => {
      try {
        const response = await publicApi.getHotels();
        const hotels = normalizeHotels(response.hotels || []);
        const found = hotels.find((h) => String(h.id) === String(id));
        setHotel(found || null);
      } finally {
        setLoading(false);
      }
    };

    loadHotel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('hotelNotFound', language)}</h2>
          <button onClick={() => navigate('/hotels')} className="text-primary hover:underline">
            {t('backToServices', language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="relative h-64 md:h-96">
          <img src={hotel.images[selectedImage]} alt={hotel.name} className="w-full h-full object-cover" />
          {hotel.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {hotel.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-2 h-2 rounded-full transition ${selectedImage === idx ? 'bg-white' : 'bg-white bg-opacity-50'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{hotel.name}</h1>
                <div className="flex items-center gap-4 text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {hotel.location}, Rwanda
                  </div>
                  <RatingStars rating={hotel.rating} reviewCount={hotel.reviewCount} />
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-bold mb-3">{t('aboutThisService', language)}</h2>
                <p className="text-gray-600 leading-relaxed">{hotel.description}</p>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">{t('amenities', language)}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {hotel.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">{t('startingFrom', language)}</span>
                    <span className="text-2xl font-bold text-primary">{formatRwf(hotel.basePrice)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('pricePerUnit', language, { unit: t(hotel.pricingUnit || 'service', language) })}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/booking/${hotel.id}`)}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition"
                >
                  {t('requestBooking', language)}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  {t('bookingConnectNote', language)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
