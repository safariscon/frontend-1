import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { publicApi } from '../lib/api';
import { normalizeHotels } from '../lib/hotelMapper';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';
import { formatRwf } from '../lib/currency';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getServiceDetailSeo, noindexSeo } from '../lib/seo';

export default function HotelDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [touchStartX, setTouchStartX] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    const loadHotel = async () => {
      try {
        const response = await publicApi.getHotels();
        const hotels = normalizeHotels(response.hotels || []);
        const found = hotels.find((h) => String(h.id) === String(id));
        setHotel(found || null);
        if (found) trackAnalytics(ANALYTICS_EVENTS.SERVICE_VIEW, { serviceId: found.id });
      } finally {
        setLoading(false);
      }
    };

    loadHotel();
  }, [id]);

  if (loading) {
    return (
      <CatalogShell authenticated={isAuthenticated}>
        <SeoHead {...noindexSeo({ title: 'Loading service | SafarisCon', description: 'Loading a SafarisCon service listing in Rwanda.', path: `/business/${id}` })} />
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </CatalogShell>
    );
  }

  if (!hotel) {
    return (
      <CatalogShell authenticated={isAuthenticated}>
        <SeoHead {...noindexSeo({ title: 'Service not found | SafarisCon', description: 'This SafarisCon service listing is unavailable.', path: `/business/${id}` })} />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('hotelNotFound', language)}</h1>
            <Link to="/services" className="text-primary hover:underline">
              {t('backToServices', language)}
            </Link>
          </div>
        </div>
      </CatalogShell>
    );
  }
  const isNotAvailable = hotel.status === 'unavailable';
  const images = Array.isArray(hotel.images) ? hotel.images.slice(0, 3) : [];
  const showPreviousImage = () => setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1));
  const showNextImage = () => setSelectedImage((current) => (current + 1) % images.length);
  const tableColumns = hotel.availabilityTable?.columns || [];
  const tableRows = hotel.availabilityTable?.rows || [];
  const filteredRows = tableRows
    .filter((row) => {
      const haystack = tableColumns.map((column) => row.cells?.[column.id] || '').join(' ').toLowerCase();
      return haystack.includes(tableSearch.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      return String(a.cells?.[sortColumn] || '').localeCompare(String(b.cells?.[sortColumn] || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  const inventoryLabel = getInventoryLabel(hotel.inventoryStatus, isNotAvailable);
  const promotion = getVisiblePromotion(hotel.promotion);
  const seo = getServiceDetailSeo(hotel);
  const imageAlt = `${hotel.name} — ${hotel.serviceCategory || hotel.type || 'service'} in ${hotel.location || 'Rwanda'}`;

  return (
    <CatalogShell authenticated={isAuthenticated}>
      <SeoHead {...seo} />
      {!isAuthenticated && (
        <SeoBreadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Services', to: '/services' },
            { label: hotel.name },
          ]}
        />
      )}

      <main className="flex-1">
        {images.length > 0 && (
          <div
            className="relative h-72 bg-gray-100 md:h-[30rem]"
            onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
            onTouchEnd={(event) => {
              if (touchStartX === null || images.length < 2) return;
              const delta = event.changedTouches[0].clientX - touchStartX;
              if (Math.abs(delta) > 45) {
                delta > 0 ? showPreviousImage() : showNextImage();
              }
              setTouchStartX(null);
            }}
          >
            <button type="button" onClick={() => setLightboxOpen(true)} className="h-full w-full">
              <img src={images[selectedImage] || images[0]} alt={imageAlt} className="h-full w-full object-cover" />
            </button>
            {images.length > 1 && (
              <>
                <button type="button" onClick={showPreviousImage} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 font-semibold text-gray-900 shadow">
                  Back
                </button>
                <button type="button" onClick={showNextImage} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 font-semibold text-gray-900 shadow">
                  Next
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Show image ${idx + 1}`}
                      onClick={() => setSelectedImage(idx)}
                      className={`h-2.5 w-2.5 rounded-full transition ${selectedImage === idx ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {images.length > 1 && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`h-24 overflow-hidden rounded-lg border ${selectedImage === index ? 'border-primary' : 'border-gray-200'}`}
                >
                  <img src={image} alt={`${imageAlt} photo ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

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
                    {hotel.location} District
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-bold mb-3">{t('aboutThisService', language)}</h2>
                <p className="text-gray-600 leading-relaxed">{hotel.description}</p>
              </div>

              <div className="mb-8 grid gap-4 md:grid-cols-3">
                <InfoTile label="Category" value={hotel.type || hotel.category || 'Service'} />
                {promotion ? (
                  <div className="md:col-span-2 overflow-hidden rounded-xl border border-amber-300 bg-amber-50">
                    <div className="bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-950">★ Promotion</div>
                    <div className="p-4">
                      <h3 className="text-lg font-black text-amber-700">{promotion.title}</h3>
                      <p className="mt-1 text-sm text-slate-800">Save {promotion.percent}% on this service.</p>
                      {promotion.note && <p className="mt-1 text-sm text-slate-700">{promotion.note}</p>}
                      <p className="mt-2 text-xs font-bold text-orange-600">Valid {formatPromotionDate(promotion.startAt)} – {formatPromotionDate(promotion.endAt)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoTile label="Seller" value="Verified marketplace seller" />
                    <InfoTile label="Inventory" value={inventoryLabel} />
                  </>
                )}
              </div>

              <AvailabilityTable
                columns={tableColumns}
                rows={filteredRows}
                updatedAt={hotel.availabilityTable?.updatedAt || hotel.updatedAt}
                search={tableSearch}
                setSearch={setTableSearch}
                sortColumn={sortColumn}
                setSortColumn={setSortColumn}
              />

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
                  <p className={`text-sm font-semibold ${isNotAvailable ? 'text-red-700' : 'text-primary'}`}>
                    {isNotAvailable ? inventoryLabel : 'Available'}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/booking/${hotel.id}`)}
                  disabled={isNotAvailable}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isNotAvailable ? 'Not Available' : t('requestBooking', language)}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Admin or the provider confirms your exact RWF quote. Pay the full amount in the app to unlock provider details. Each listing shows its own cancel window and fee.
                </p>
                <Link to="/services" className="mt-3 block text-center text-sm font-bold text-primary hover:underline">
                  Browse more services in Rwanda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-semibold text-gray-900">
            Close
          </button>
          {images.length > 1 && (
            <button type="button" onClick={showPreviousImage} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-3 font-semibold text-gray-900">
              Back
            </button>
          )}
          <img src={images[selectedImage] || images[0]} alt={imageAlt} className="max-h-[85vh] max-w-full object-contain" />
          {images.length > 1 && (
            <button type="button" onClick={showNextImage} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-3 font-semibold text-gray-900">
              Next
            </button>
          )}
        </div>
      )}

    </CatalogShell>
  );
}

function CatalogShell({ authenticated, children }) {
  if (authenticated) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-gray-900">{value}</p>
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

function formatPromotionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'as scheduled';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function AvailabilityTable({ columns, rows, updatedAt, search, setSearch, sortColumn, setSortColumn }) {
  if (!columns.length) {
    return (
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Availability</h2>
        <p className="mt-2 text-sm text-gray-600">This seller has not published a custom availability table yet.</p>
      </div>
    );
  }

  const visibleSortColumns = columns.filter((column) => !['details'].includes(column.id));

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Availability</h2>
          {updatedAt && <p className="mt-1 text-sm text-gray-500">Updated {new Date(updatedAt).toLocaleString()}</p>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:min-w-[380px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search options" className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
          <select value={sortColumn} onChange={(event) => setSortColumn(event.target.value)} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
            <option value="">Original order</option>
            {visibleSortColumns.map((column) => <option key={column.id} value={column.id}>Sort by {column.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <AvailabilityOptionCard key={row.id || index} row={row} columns={columns} />
        ))}
      </div>
      {!rows.length && <p className="mt-3 text-sm text-gray-500">No matching availability rows.</p>}
    </div>
  );
}

function AvailabilityOptionCard({ row, columns }) {
  const cells = row.cells || {};
  const optionName = cells.service || cells.name || cells.option || 'Service option';
  const price = Number(cells.price || 0);
  const priceType = String(cells.priceType || '').replace(/-/g, ' ');
  const details = cells.details || cells.amenities || '';
  const metaColumns = columns.filter((column) => !['service', 'name', 'option', 'price', 'details', 'amenities'].includes(column.id));

  return (
    <article className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-primary">Option {row.sortOrder ? row.sortOrder : ''}</p>
          <h3 className="mt-1 break-words text-lg font-black text-gray-950">{optionName}</h3>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-left shadow-sm sm:min-w-36 sm:text-right">
          <p className="text-xs font-bold uppercase text-gray-500">Price</p>
          <p className="mt-1 text-lg font-black text-primary">{price ? formatRwf(price) : '-'}</p>
          {priceType && <p className="text-xs font-semibold capitalize text-gray-500">{priceType}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {metaColumns.map((column) => (
          <div key={column.id} className="rounded-xl bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{column.label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-gray-900">{cells[column.id] || '-'}</p>
          </div>
        ))}
      </div>

      {details && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Details / amenities</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{details}</p>
        </div>
      )}
    </article>
  );
}

function getInventoryLabel(status, unavailable) {
  if (unavailable) return 'Out of Stock';
  const labels = {
    available: 'Available',
    limited: 'Limited Availability',
    'fully-booked': 'Fully Booked',
    'out-of-stock': 'Out of Stock',
    'temporarily-unavailable': 'Temporarily Unavailable',
  };
  return labels[status] || 'Available';
}
