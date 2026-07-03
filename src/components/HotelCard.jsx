import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function HotelCard({ hotel, compact = false }) {
  const { language } = useLanguage();
  const hotelId = hotel.id || hotel._id;
  const amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];
  const isNotAvailable = hotel.status === 'unavailable';
  const availabilityText = isNotAvailable
    ? 'Not Available'
    : hotel.primaryService?.availabilityText || 'Available';
  const promotion = getVisiblePromotion(hotel.promotion);

  return (
    <Link
      to={`/business/${hotelId}`}
      className="service-card group bg-white overflow-hidden transition-all duration-300 block"
    >
      <div className="relative overflow-hidden h-48 bg-gray-50 md:h-52">
        {hotel.image ? (
          <img
            src={hotel.image}
            alt={hotel.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-gray-400">
            No seller image uploaded
          </div>
        )}
        {hotel.isFeatured && (
          <div className="absolute top-3 left-3 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
            {t('featured', language)}
          </div>
        )}
        {isNotAvailable && (
          <div className="absolute top-3 left-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            Not Available
          </div>
        )}
        {promotion && (
          <div className="service-promotion-badge absolute right-3 top-3 rounded-full border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-700 shadow-lg">
            ★ Promotion
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
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
        {promotion && (
          <div className="service-promotion-panel mb-4 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 p-4 text-left">
            <div className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-xl text-white">☆</span>
              <div>
                <h4 className="font-black text-amber-700">{promotion.title}</h4>
                <p className="mt-1 text-sm text-slate-800">{promotion.description}</p>
                <p className="mt-2 text-xs font-semibold text-orange-600">Valid {formatPromotionDate(promotion.startAt)} – {formatPromotionDate(promotion.endAt)}</p>
              </div>
            </div>
          </div>
        )}
        {availabilityText && (
          <p className="mb-3 text-sm font-semibold text-primary">{availabilityText}</p>
        )}

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
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {formatBusinessType(hotel.serviceCategory)} / {formatBusinessType(hotel.bookingModel)}
          </span>
          <span className="card-action text-primary font-bold">View services -&gt;</span>
        </div>
      </div>
    </Link>
  );
}

function getVisiblePromotion(promotion) {
  if (!promotion?.enabled || !promotion.title || !promotion.description) return null;
  const start = new Date(promotion.startAt);
  const end = new Date(promotion.endAt);
  const now = new Date();
  if (!Number.isNaN(start.getTime()) && start > now) return null;
  return Number.isNaN(end.getTime()) || end >= now ? promotion : null;
}

function formatPromotionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'as scheduled';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatBusinessType(value) {
  return String(value || 'service')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

