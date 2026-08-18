import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { t, translateCategory } from '../lib/translations';
import { guestCancelCopy } from '../lib/payments';

export default function HotelCard({ hotel, compact = false, showProvider = false }) {
  const { language } = useLanguage();
  const hotelId = hotel.id || hotel._id;
  const amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];
  const isNotAvailable = hotel.status === 'unavailable';
  const availabilityText = isNotAvailable
    ? t('catalog.notAvailable', language)
    : hotel.primaryService?.availabilityText || t('details.available', language);
  const promotion = getVisiblePromotion(hotel.promotion);

  return (
    <Link
      to={`/business/${hotelId}`}
      className="service-card group block overflow-hidden bg-white transition-all duration-300 dark:bg-slate-900"
    >
      <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800 md:h-52">
        {hotel.image ? (
          <img
            src={hotel.image}
            alt={`${hotel.name}${hotel.location ? `, ${hotel.location}` : ''} · SafarisCon`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-400">
            {t('catalog.noImage', language)}
          </div>
        )}
        {hotel.isFeatured && (
          <div className="absolute left-3 top-3 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white">
            {t('featured', language)}
          </div>
        )}
        {isNotAvailable && (
          <div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            {t('catalog.notAvailable', language)}
          </div>
        )}
        {promotion && (
          <div className="service-promotion-badge absolute right-3 top-3 rounded-full border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-700 shadow-lg dark:border-amber-500/70 dark:bg-amber-950 dark:text-amber-200">
            {t('catalog.promotion', language)}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-lg font-black text-slate-950 transition group-hover:text-primary dark:text-white dark:hover:text-blue-300">
            {hotel.name}
          </h3>
          <span className="text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {translateCategory(hotel.type, language)}
          </span>
        </div>

        <div className="mb-2 flex items-center text-sm text-slate-600 dark:text-slate-400">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {hotel.location}
        </div>
        {showProvider && hotel.provider?.name && (
          <p className="mb-2 text-xs font-bold text-primary">{hotel.provider.name}{hotel.provider.sellerId ? ` · ${hotel.provider.sellerId}` : ''}</p>
        )}

        <p className={`mb-4 text-slate-600 dark:text-slate-300 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
          {hotel.description}
        </p>

        {promotion && (
          <div className="service-promotion-panel mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left dark:border-amber-700 dark:bg-amber-950/40">
            <div className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-white">
                <StarIcon />
              </span>
              <div>
                <h4 className="font-black text-amber-700 dark:text-amber-200">{promotion.title}</h4>
                <p className="mt-1 text-sm text-slate-800 dark:text-amber-50">{t('details.savePercent', language, { percent: promotion.percent })}</p>
                {promotion.note && <p className="mt-1 text-sm text-slate-700 dark:text-amber-100">{promotion.note}</p>}
                <p className="mt-2 text-xs font-semibold text-orange-600 dark:text-amber-300">{t('details.valid', language, { start: formatPromotionDate(promotion.startAt, language), end: formatPromotionDate(promotion.endAt, language) })}</p>
              </div>
            </div>
          </div>
        )}

        {availabilityText && <p className="mb-3 text-sm font-bold text-primary dark:text-blue-300">{availabilityText}</p>}
        <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{guestCancelCopy(hotel)}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          {amenities.slice(0, 3).map((amenity) => (
            <span key={amenity} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {amenity}
            </span>
          ))}
          {amenities.length > 3 && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              +{amenities.length - 3} {t('more', language)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {translateCategory(hotel.serviceCategory, language)} / {translateCategory(hotel.bookingModel, language)}
          </span>
          <span className="card-action font-bold text-primary dark:text-blue-300">{t('catalog.viewServices', language)} -&gt;</span>
        </div>
      </div>
    </Link>
  );
}

function getVisiblePromotion(promotion) {
  if (!promotion?.enabled || !promotion.title) return null;
  const percent = Number(promotion.percent || promotion.promotionPercent || 0);
  const start = new Date(promotion.startAt);
  const end = new Date(promotion.endAt);
  const now = new Date();
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end || start > now || end < now) return null;
  return { ...promotion, percent, note: promotion.note || promotion.description || '' };
}

function formatPromotionDate(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('catalog.asScheduled', language);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function StarIcon() {
  return <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.8l2.3 4.7 5.2.8-3.8 3.7.9 5.2L10 13.7l-4.6 2.5.9-5.2-3.8-3.7 5.2-.8L10 1.8z" /></svg>;
}
