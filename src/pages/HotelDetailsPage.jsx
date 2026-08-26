import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DashboardLayout from '../components/DashboardLayout';
import StayOptionCard from '../components/listing/StayOptionCard';
import ReviewsPanel from '../components/listing/ReviewsPanel';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { normalizeHotels, normalizeHotel } from '../lib/hotelMapper';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';
import { formatRwf } from '../lib/currency';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getServiceDetailSeo, noindexSeo } from '../lib/seo';
import StayValidityPanel from '../components/listing/StayValidityPanel';
import { amenityLabel, listingOptions, optionLeft, optionPricingCopy, policyLabel } from '../lib/stayDisplay';
import { optionMaxDate, optionMinDate } from '../lib/availability';
import { staySearchFromParams, todayIsoDate, withStaySearch } from '../lib/staySearch';
import { domainCopy } from '../features/domain/registry';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'rooms', label: 'Info & prices' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'rules', label: 'House rules' },
  { id: 'notes', label: 'Guest notes' },
  { id: 'reviews', label: 'Reviews' },
];

export default function HotelDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stay = staySearchFromParams(searchParams);
  const { isAuthenticated } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [touchStartX, setTouchStartX] = useState(null);
  const { language } = useLanguage();

  const loadHotel = async () => {
    try {
      const detail = await publicApi.getHotel(id, {
        checkIn: stay.checkIn || undefined,
        checkOut: stay.checkOut || undefined,
      }).catch(() => null);
      let found = detail?.hotel || detail?.service || detail ? normalizeHotel(detail.hotel || detail.service || detail) : null;
      if (!found) {
        const response = await publicApi.getHotels();
        found = normalizeHotels(response.hotels || []).find((item) => String(item.id) === String(id)) || null;
      }
      setHotel(found || null);
      if (found) {
        trackAnalytics(ANALYTICS_EVENTS.SERVICE_VIEW, { serviceId: found.id });
        const options = listingOptions(found);
        if (options[0] && !selectedOptionId) setSelectedOptionId(String(options[0].id || options[0].optionId || ''));
        const reviewPayload = await publicApi.getReviews(found.id).catch(() => ({ reviews: [] }));
        setReviews(reviewPayload.reviews || []);
        if (reviewPayload.reviewCount != null) {
          setHotel((current) => current ? { ...current, reviewCount: reviewPayload.reviewCount, ratingAverage: reviewPayload.ratingAverage, rating: reviewPayload.ratingAverage } : current);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => loadHotel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, stay.checkIn, stay.checkOut]);

  if (loading) {
    return (
      <CatalogShell authenticated={isAuthenticated}>
        <SeoHead {...noindexSeo({ title: t('details.loadingTitle', language), description: t('details.loadingDescription', language), path: `/business/${id}` })} />
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </CatalogShell>
    );
  }

  if (!hotel) {
    return (
      <CatalogShell authenticated={isAuthenticated}>
        <SeoHead {...noindexSeo({ title: t('details.notFoundTitle', language), description: t('details.notFoundDescription', language), path: `/business/${id}` })} />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('hotelNotFound', language)}</h1>
            <Link to="/services" className="text-primary hover:underline">{t('backToServices', language)}</Link>
          </div>
        </div>
      </CatalogShell>
    );
  }

  const isNotAvailable = hotel.status === 'unavailable';
  const listing = hotel.listingAttributes || {};
  const copy = domainCopy(hotel);
  const rental = copy.kind === 'rental';
  const tabs = rental
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'rooms', label: 'Vehicles' },
        { id: 'facilities', label: 'Features' },
        { id: 'rules', label: 'Rental rules' },
        { id: 'notes', label: 'Guest notes' },
        { id: 'reviews', label: 'Reviews' },
      ]
    : TABS;
  const options = listingOptions(hotel);
  const selectedOption = options.find((option) => String(option.id || option.optionId) === String(selectedOptionId)) || options[0] || null;
  const selectedPricing = selectedOption ? optionPricingCopy(selectedOption, undefined, copy.kind) : null;
  const optionWindow = {
    availableFrom: selectedOption?.availableFrom || selectedOption?.availability?.windowStartDate || '',
    availableTo: selectedOption?.availableTo || selectedOption?.availability?.windowEndDate || '',
  };
  const stayDateMin = optionMinDate(optionWindow, todayIsoDate());
  const stayDateMax = optionMaxDate(optionWindow);
  const amenities = Array.isArray(listing.amenities) && listing.amenities.length ? listing.amenities : (hotel.amenities || []);
  const primaryCover = hotel.primaryImage || (Array.isArray(hotel.images) ? hotel.images.find(Boolean) : '') || hotel.image || '';
  const images = (() => {
    const list = Array.isArray(hotel.images) ? hotel.images.filter(Boolean) : [];
    if (primaryCover) return [primaryCover, ...list.filter((url) => url !== primaryCover)].slice(0, 8);
    return list.slice(0, 8);
  })();
  const showPreviousImage = () => setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1));
  const showNextImage = () => setSelectedImage((current) => (current + 1) % images.length);
  const promotion = getVisiblePromotion(hotel.promotion);
  const seo = getServiceDetailSeo(hotel, language);
  const imageAlt = `${hotel.name} — ${hotel.location || 'Rwanda'}`;
  const reviewCount = Number(hotel.reviewCount || reviews.length || 0);

  const scrollTo = (tabId) => {
    setActiveTab(tabId);
    document.getElementById(tabId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const continueBooking = () => {
    navigate(withStaySearch(`/booking/${hotel.id}`, {
      ...stay,
      optionId: selectedOption ? selectedOption.id || selectedOption.optionId : '',
    }));
  };

  return (
    <CatalogShell authenticated={isAuthenticated}>
      <SeoHead {...seo} />
      {!isAuthenticated && (
        <SeoBreadcrumbs
          items={[
            { label: t('navigation.home', language), to: '/' },
            { label: t('navigation.services', language), to: '/services' },
            { label: hotel.name },
          ]}
        />
      )}

      <main className="flex-1">
        {images.length > 0 && (
          <div
            className="relative h-72 bg-gray-100 md:h-[32rem]"
            onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
            onTouchEnd={(event) => {
              if (touchStartX === null || images.length < 2) return;
              const delta = event.changedTouches[0].clientX - touchStartX;
              if (Math.abs(delta) > 45) delta > 0 ? showPreviousImage() : showNextImage();
              setTouchStartX(null);
            }}
          >
            <button type="button" onClick={() => setLightboxOpen(true)} className="h-full w-full">
              <img src={images[selectedImage] || images[0]} alt={imageAlt} className="h-full w-full object-cover" />
            </button>
            {images.length > 1 && (
              <>
                <button type="button" onClick={showPreviousImage} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 font-semibold text-gray-900 shadow">{t('back', language)}</button>
                <button type="button" onClick={showNextImage} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 font-semibold text-gray-900 shadow">{t('next', language)}</button>
              </>
            )}
          </div>
        )}
        {images.length > 1 && (
          <div className="mx-auto max-w-7xl px-4 pt-4">
            <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
              {images.map((image, index) => (
                <button key={image} type="button" onClick={() => setSelectedImage(index)} className={`h-20 overflow-hidden rounded-lg border ${selectedImage === index ? 'border-primary' : 'border-gray-200'}`}>
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollTo(tab.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${activeTab === tab.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {tab.id === 'reviews' && reviewCount ? `${tab.label} (${reviewCount})` : tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <section id="overview" className="scroll-mt-28">
                <h1 className="text-3xl font-black text-slate-950 md:text-4xl">{hotel.name}</h1>
                <p className="mt-2 text-slate-600">{t('details.districtLine', language, { location: hotel.location })}</p>
                {reviewCount ? <p className="mt-2 text-sm font-bold text-slate-800">{hotel.ratingAverage || hotel.rating} · {reviewCount} guest review{reviewCount === 1 ? '' : 's'}</p> : null}
                {promotion ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-amber-900">Offer</p>
                    <p className="mt-1 font-black text-amber-950">{promotion.title} · {t('details.savePercent', language, { percent: promotion.percent })}</p>
                  </div>
                ) : null}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-black text-slate-950">{rental ? 'About this rental' : 'About this property'}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{hotel.description}</p>
                  {amenities.length ? (
                    <div className="mt-6">
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Most popular facilities</h3>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {amenities.map((item) => (
                          <p key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            {amenityLabel(item)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section id="rooms" className="scroll-mt-28 space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">{rental ? 'Vehicles & prices' : 'Info & prices'}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {rental
                      ? 'Each vehicle type has a daily price. Number of cars is how many of this type you can rent at once.'
                      : 'Each option has one nightly price. Guest count is how many people can stay, not a separate price list.'}
                  </p>
                </div>
                {options.length ? options.map((option) => (
                  <StayOptionCard
                    key={option.id || option.optionId}
                    option={option}
                    selected={String(option.id || option.optionId) === String(selectedOption?.id || selectedOption?.optionId)}
                    selectable={!isNotAvailable && optionLeft(option) > 0}
                    onSelect={(next) => setSelectedOptionId(String(next.id || next.optionId))}
                    copy={copy}
                    ctaLabel={rental ? 'Select this vehicle' : 'Select this option'}
                  />
                )) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-3xl font-black text-primary">{hotel.basePrice > 0 ? formatRwf(hotel.basePrice) : 'Quote on request'}</p>
                    <p className="mt-2 text-sm text-slate-600">{t('details.bookingNote', language)}</p>
                  </div>
                )}
              </section>

              <section id="facilities" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">{rental ? 'Features' : 'Facilities'}</h2>
                {amenities.length ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {amenities.map((item) => (
                      <p key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">{amenityLabel(item)}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">The provider has not listed extra facilities yet.</p>
                )}
              </section>

              <section id="rules" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">{rental ? 'Rental rules' : 'House rules'}</h2>
                <div className="mt-4">
                  <StayValidityPanel
                    listing={hotel}
                    option={selectedOption}
                    availability={selectedOption?.availability || {}}
                    dateMin={stayDateMin}
                    dateMax={stayDateMax}
                    remaining={selectedOption?.remaining}
                    quantity={selectedOption?.quantity}
                    checkIn={stay.checkIn}
                    checkOut={stay.checkOut}
                    copy={copy}
                  />
                </div>
                {listing.childrenStayFree != null && listing.childrenStayFree !== '' && !rental ? (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Rule label="Children stay free" value={listing.childrenStayFree ? 'Yes' : 'No'} />
                  </dl>
                ) : null}
              </section>

              <section id="notes" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">Important guest notes</h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Rule label="Deposit" value={hotel.paymentPolicy?.depositPercentage != null ? `${hotel.paymentPolicy.depositPercentage}%` : '50% to confirm'} />
                  <Rule label="Remaining payment" value={policyLabel(hotel.paymentPolicy?.remainingPaymentMethod, hotel) || 'Paid according to the listing'} />
                  <Rule label="Cancellation" value={hotel.cancellationPolicy?.type || hotel.bookingRules?.cancellationPolicy?.type} />
                  <Rule label="Free cancellation until" value={hotel.cancellationPolicy?.freeCancellationUntilHours != null ? `${hotel.cancellationPolicy.freeCancellationUntilHours} hours before` : hotel.cancelWindowHours ? `${hotel.cancelWindowHours} hours before` : ''} />
                </dl>
                <p className="mt-4 text-sm leading-6 text-slate-600">Provider identity and the exact meeting point stay hidden until you pay. You choose mobile money or card on the last booking step.</p>
              </section>

              <ReviewsPanel
                hotelId={hotel.id}
                reviews={reviews}
                ratingAverage={hotel.ratingAverage || hotel.rating}
                reviewCount={reviewCount}
                isAuthenticated={isAuthenticated}
                onUpdated={(payload) => {
                  if (payload?.reviews) setReviews(payload.reviews);
                  else loadHotel();
                }}
              />
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                {selectedOption ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Selected</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">{selectedOption.name}</h2>
                    <p className="mt-2 text-2xl font-black text-primary">{selectedOption.price ? formatRwf(selectedOption.price) : 'Quote on request'}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{selectedPricing?.priceCaption}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{selectedPricing?.detail}</p>
                    <p className={`mt-2 text-sm font-black ${optionLeft(selectedOption) <= 3 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {optionLeft(selectedOption) <= 0
                        ? (stay.checkIn ? 'Not free for these dates' : 'Sold out')
                        : `${optionLeft(selectedOption)} ${optionLeft(selectedOption) === 1 ? copy.unitNoun : copy.unitNounPlural} left${stay.checkIn ? ' for these dates' : ''}`}
                    </p>
                  </>
                ) : (
                  <p className="font-black text-slate-950">{isNotAvailable ? t('catalog.notAvailable', language) : t('details.available', language)}</p>
                )}
                <button
                  type="button"
                  onClick={continueBooking}
                  disabled={isNotAvailable || (selectedOption && optionLeft(selectedOption) <= 0)}
                  className="mt-5 w-full rounded-xl bg-primary py-3 font-black text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isNotAvailable ? t('catalog.notAvailable', language) : 'Continue to book'}
                </button>
                <p className="mt-3 text-center text-xs text-slate-500">
                  {rental ? 'Pickup and return dates, then your details and payment. You are not charged on this page.' : 'Dates, guest details, then payment method. You are not charged on this page.'}
                </p>
                <Link to="/services" className="mt-3 block text-center text-sm font-bold text-primary hover:underline">{t('details.browseMore', language)}</Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-semibold text-gray-900">{t('close', language)}</button>
          <img src={images[selectedImage] || images[0]} alt={imageAlt} className="max-h-[85vh] max-w-full object-contain" />
        </div>
      )}
    </CatalogShell>
  );
}

function Rule({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function CatalogShell({ authenticated, children }) {
  if (authenticated) return <DashboardLayout>{children}</DashboardLayout>;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {children}
      <Footer />
    </div>
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
