import { Link } from 'react-router-dom';
import RatingStars from './RatingStars';
import { formatRwf } from '../lib/currency';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function HotelCard({ hotel, compact = false }) {
  const { language } = useLanguage();
  const hotelId = hotel.id || hotel._id;
  const price = hotel.basePrice ?? hotel.price ?? 0;
  const amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];
  const pricingUnit = t(hotel.pricingUnit || getPricingUnitKey(hotel.type), language);

  return (
    <Link
      to={`/business/${hotelId}`}
      className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block"
    >
      <div className="relative overflow-hidden h-48 md:h-64">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {hotel.isFeatured && (
          <div className="absolute top-3 left-3 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
            {t('featured', language)}
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded-lg">
          <span className="font-bold text-primary">{formatRwf(price)}</span>
          <span className="text-gray-500 text-sm">/ {pricingUnit}</span>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition">
            {hotel.name}
          </h3>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {formatBusinessType(hotel.type)}
          </span>
        </div>

        <div className="flex items-center text-gray-600 text-sm mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {hotel.location}
        </div>

        <p className={`text-gray-600 mb-4 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
          {hotel.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {amenities.slice(0, 3).map((amenity) => (
            <span key={amenity} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
              {amenity}
            </span>
          ))}
          {amenities.length > 3 && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
              +{amenities.length - 3} {t('more', language)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <RatingStars rating={hotel.rating || 0} reviewCount={hotel.reviewCount || 0} size="sm" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {formatBusinessType(hotel.serviceCategory)} / {formatBusinessType(hotel.bookingModel)}
          </span>
          <span className="text-primary font-bold">{t('openService', language)} -&gt;</span>
        </div>
      </div>
    </Link>
  );
}

function formatBusinessType(value) {
  return String(value || 'service')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPricingUnitKey(type) {
  const normalizedType = String(type || '').trim().toLowerCase();

  if (
    [
      'hotel',
      'hotels-and-resorts',
      'homestays-and-guesthouses',
      'tent-rentals-and-camping-sites',
      'vacation-rentals-and-apartments',
    ].includes(normalizedType)
  ) {
    return 'night';
  }

  if (
    [
      'car-rentals',
      'motorbike-and-scooter-rentals',
      'gear-rentals',
    ].includes(normalizedType)
  ) {
    return 'day';
  }

  if (
    [
      'conference-event-halls-mice',
      'wedding-venues',
    ].includes(normalizedType)
  ) {
    return 'event';
  }

  if (normalizedType === 'tour-and-activity-operators') {
    return 'person';
  }

  if (normalizedType === 'spas-and-wellness-centers' || normalizedType === 'childcare-services') {
    return 'hour';
  }

  return 'service';
}
