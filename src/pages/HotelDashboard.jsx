import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { findBookingByFocusId, getDashboardRoute, isSellerRole, serviceApprovalStatus, withoutDrafts } from '../lib/dashboard';
import { getAuthData, hotelApi, paymentsApi, publicApi } from '../lib/api';
import { payoutStatusLabel } from '../lib/payments';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';
import { formatRwf } from '../lib/currency';
import { SERVICE_CATEGORY_TUPLES as SERVICE_CATEGORIES, getCategoryDisplayLabel, getCategoryGroupDisplayLabel } from '../data/serviceCategories';
import SellerRebookRequests from '../components/rebook/SellerRebookRequests';
import ServiceLocationPicker from '../components/ServiceLocationPicker';
import ServiceDetailsView from '../components/ServiceDetailsView';
import OptionDetailsModal from '../components/OptionDetailsModal';
import { DAY_OPTIONS, TIME_REQUIREMENT_OPTIONS, parseOptionAvailability, toggleAvailableDay } from '../lib/availability';
import { emptyLocationDetails, isAdministrativeLocationComplete, normalizeLocationDetails } from '../lib/places';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const EMPTY_FORM = {
  title: '',
  description: '',
  serviceLocation: {
    ...emptyLocationDetails(),
    fullAddress: '',
    formattedAddress: '',
    placeName: '',
    placeId: '',
    latitude: null,
    longitude: null,
    locationSource: 'map_click',
    isExactLocationVerified: false,
  },
  locationDetails: emptyLocationDetails(),
  category: 'hotel-rooms',
  payoutDetails: { method: 'mobile-money', accountName: '', accountNumber: '', instructions: '' },
  contactDetails: { phone: '', whatsapp: '' },
  status: 'available',
  customAvailability: '',
  remainingQuantity: '',
  existingImages: [],
  imageFiles: [],
  promotion: { enabled: false, title: '', percent: '', note: '', startAt: '', endAt: '' },
  rebookSettings: { requestDeadlineHours: 24, rebookIdValidityHours: 72 },
  cancelWindowHours: 6,
  cancelPenaltyPercent: 20,
  promotionHistory: [],
  availabilityTable: {
    columns: [
      { id: 'service', label: 'Option name' },
      { id: 'price', label: 'Price (RWF)' },
      { id: 'priceType', label: 'Price type' },
      { id: 'calculationField', label: 'Calculation field' },
      { id: 'durationUnit', label: 'Duration unit' },
      { id: 'maximumDuration', label: 'Maximum duration' },
      { id: 'availability', label: 'Availability / capacity' },
      { id: 'availableFrom', label: 'Available from' },
      { id: 'availableTo', label: 'Available until' },
      { id: 'availableDays', label: 'Available days' },
      { id: 'availableStartTime', label: 'Open time' },
      { id: 'availableEndTime', label: 'Close time' },
      { id: 'requiresTime', label: 'Times required' },
      { id: 'details', label: 'Details / amenities' },
    ],
    rows: [{ id: 'row_1', cells: { service: '', price: '' } }],
  },
  bookingMode: 'manual',
  bookingForm: {
    title: 'Booking Request',
    description: '',
    isPublished: true,
    fields: [
      { id: 'field_name', type: 'text', label: 'Full Name', placeholder: 'Your full name', helpText: '', defaultValue: '', required: true, enabled: true, options: [], validation: {} },
      { id: 'field_phone', type: 'tel', label: 'Phone Number', placeholder: '078xxxxxxx', helpText: '', defaultValue: '', required: true, enabled: true, options: [], validation: {} },
      { id: 'field_date', type: 'date', label: 'Booking Date', placeholder: '', helpText: '', defaultValue: '', required: true, enabled: true, options: [], validation: {} },
    ],
  },
};

const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const normalizeTableForForm = (table) => {
  const columns = EMPTY_FORM.availabilityTable.columns;
  const rows = Array.isArray(table?.rows) && table.rows.length
    ? table.rows.map((row, index) => ({
        id: row.id || `row_${index + 1}`,
        cells: { ...(row.cells || {}) },
      }))
    : [{ id: 'row_1', cells: {} }];

  return { columns, rows, updatedAt: table?.updatedAt || null };
};

const normalizeLocationForForm = (service) => normalizeLocationDetails({
  ...service.locationDetails,
  ...service.serviceLocation,
});

const normalizeServiceLocationForForm = (service) => {
  const source = service.serviceLocation || {};
  const admin = normalizeLocationDetails({ ...service.locationDetails, ...source });
  return {
    ...admin,
    fullAddress: source.fullAddress || source.formattedAddress || service.contactDetails?.exactAddress || service.location || '',
    formattedAddress: source.formattedAddress || source.fullAddress || '',
    placeName: source.placeName || '',
    placeId: source.placeId || source.googlePlaceId || '',
    latitude: source.latitude ?? service.contactDetails?.latitude ?? null,
    longitude: source.longitude ?? service.contactDetails?.longitude ?? null,
    locationSource: source.locationSource || 'map_click',
    isExactLocationVerified: Boolean(source.isExactLocationVerified),
  };
};

const validateImageFiles = (files) => {
  const maxSize = 5 * 1024 * 1024;
  const accepted = files.filter((file) => file.type.startsWith('image/') && file.size <= maxSize);
  return {
    accepted: accepted.slice(0, 3),
    rejected: files.length !== accepted.length || files.length > 3,
  };
};

const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
};

const formatDashboardDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const FIELD_TYPES = [
  ['text', 'Short answer'],
  ['textarea', 'Long answer'],
  ['number', 'Number'],
  ['email', 'Email address'],
  ['tel', 'Phone number'],
  ['date', 'Date'],
  ['time', 'Time'],
  ['datetime-local', 'Date and time'],
  ['select', 'Dropdown menu'],
  ['radio', 'Choose one option'],
  ['checkbox', 'Choose multiple options'],
  ['file', 'Upload a file'],
  ['url', 'Website link'],
];

const FORM_TEMPLATES = [
  {
    id: 'general',
    label: 'Simple Booking',
    description: 'Good for most services.',
    fields: [
      { type: 'text', label: 'Full Name', placeholder: 'Customer name', required: true },
      { type: 'tel', label: 'Phone Number', placeholder: '078xxxxxxx', required: true },
      { type: 'date', label: 'Booking Date', placeholder: '', required: true },
      { type: 'textarea', label: 'Special Requests', placeholder: 'Anything we should know?', required: false },
    ],
  },
  {
    id: 'transport',
    label: 'Car / Transport',
    description: 'Pickup, return, passengers, and driver option.',
    fields: [
      { type: 'text', label: 'Pickup Location', placeholder: 'Where should pickup happen?', required: true },
      { type: 'text', label: 'Return Location', placeholder: 'Where should drop-off happen?', required: true },
      { type: 'date', label: 'Pickup Date', required: true },
      { type: 'time', label: 'Pickup Time', required: true },
      { type: 'number', label: 'Number of Passengers', placeholder: 'Example: 4', required: true },
      { type: 'radio', label: 'Driver Needed?', required: true, options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'hotel',
    label: 'Hotel / Rooms',
    description: 'Check-in, check-out, guests, and room preference.',
    fields: [
      { type: 'date', label: 'Check-in Date', required: true },
      { type: 'date', label: 'Check-out Date', required: true },
      { type: 'number', label: 'Number of Guests', placeholder: 'Example: 2', required: true },
      { type: 'select', label: 'Room Type', required: false, options: ['Standard', 'Deluxe', 'Suite'] },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Reservation date, time, table size, and notes.',
    fields: [
      { type: 'date', label: 'Reservation Date', required: true },
      { type: 'time', label: 'Reservation Time', required: true },
      { type: 'number', label: 'Number of Guests', required: true },
      { type: 'textarea', label: 'Food allergies or notes', required: false },
    ],
  },
];

const QUICK_QUESTIONS = [
  {
    group: 'Customer Details',
    items: [
      { label: 'Customer name', type: 'text', placeholder: 'Full name', required: true },
      { label: 'Phone number', type: 'tel', placeholder: '078xxxxxxx', required: true },
      { label: 'Email address', type: 'email', placeholder: 'name@example.com', required: false },
    ],
  },
  {
    group: 'Date, Time, and Quantity',
    items: [
      { label: 'Booking date', type: 'date', required: true },
      { label: 'Preferred time', type: 'time', required: false },
      { label: 'Start date and time', type: 'datetime-local', required: false },
      { label: 'Number of people', type: 'number', placeholder: 'Example: 2', required: true, validation: { min: 1 } },
    ],
  },
  {
    group: 'Choices',
    items: [
      { label: 'Service type', type: 'select', placeholder: 'Choose service', required: true, options: ['Standard', 'Premium', 'VIP'] },
      { label: 'Preferred contact method', type: 'radio', required: false, options: ['Phone', 'Email', 'WhatsApp'] },
      { label: 'Extra services needed', type: 'checkbox', required: false, options: ['Transport', 'Guide', 'Food', 'Airport pickup'] },
    ],
  },
  {
    group: 'Extra Information',
    items: [
      { label: 'Special requests', type: 'textarea', placeholder: 'Write any extra details here', required: false },
      { label: 'Upload document', type: 'file', required: false, validation: { maxFileSizeMb: 5, acceptedFileTypes: 'image/*,.pdf' } },
      { label: 'Website or reference link', type: 'url', placeholder: 'https://example.com', required: false },
    ],
  },
];

const normalizeBookingFormForForm = (bookingForm) => ({
  title: bookingForm?.title || 'Booking Request',
  description: bookingForm?.description || '',
  isPublished: bookingForm?.isPublished !== false,
  fields: Array.isArray(bookingForm?.fields) && bookingForm.fields.length
    ? bookingForm.fields.map((field, index) => ({
        id: field.id || `field_${index + 1}`,
        type: field.type || 'text',
        label: field.label || `Field ${index + 1}`,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        defaultValue: field.defaultValue || '',
        required: Boolean(field.required),
        enabled: field.enabled !== false,
        options: Array.isArray(field.options) ? field.options : [],
        validation: field.validation || {},
      }))
    : EMPTY_FORM.bookingForm.fields,
});

export default function HotelDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams();
  const view = ['services', 'bookings', 'finance'].includes(section) ? section : 'dashboard';
  const basePath = getDashboardRoute(user) || '/dashboard/seller';
  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [viewingService, setViewingService] = useState(null);
  const [bookingSubTab, setBookingSubTab] = useState('bookings');
  const [financeSubTab, setFinanceSubTab] = useState('finance');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [editingService, setEditingService] = useState(null);
  const [approvalBooking, setApprovalBooking] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [globalBookingMode, setGlobalBookingMode] = useState('manual');
  const [payoutDetails, setPayoutDetails] = useState(null);
  const [finance, setFinance] = useState(null);
  const token = getAuthData()?.token;

  const loadData = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [overviewResp, servicesResp, bookingsResp, settingsResp, payoutResp, financeResp] = await Promise.all([
        hotelApi.getOverview(token),
        hotelApi.getMyServices(token),
        hotelApi.getMyBookings(token),
        publicApi.getMarketplaceSettings().catch(() => ({ settings: { bookingMode: 'manual' } })),
        hotelApi.getPayoutDetails(token).catch(() => ({ payoutDetails: null })),
        hotelApi.getFinance(token).catch(() => null),
      ]);
      setOverview(overviewResp);
      setServices(withoutDrafts(servicesResp.services || []));
      setBookings(bookingsResp.bookings || []);
      setGlobalBookingMode(settingsResp.settings?.bookingMode || 'manual');
      setPayoutDetails(payoutResp.payoutDetails || null);
      setFinance(financeResp);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`, { replace: true });
      return;
    }
    if (!isSellerRole(user.role)) {
      navigate(getDashboardRoute(user));
      return;
    }
    Promise.resolve().then(() => loadData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    if (!token || !user || !isSellerRole(user.role)) return undefined;
    joinRealtimeChannel('business', user.businessId || user.hotelId);
    joinRealtimeChannel('user', user.id || user._id);
    return subscribeToRealtime(
      [REALTIME_EVENTS.SERVICE_CHANGED, REALTIME_EVENTS.BOOKING_CHANGED, 'newBooking', 'serviceUpdated', 'bookingStatusChanged'],
      () => loadData({ silent: true })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const stats = useMemo(() => {
    const activeServices = services.filter((service) => service.status === 'available' && service.isActive !== false);
    const completedBookings = bookings.filter((booking) => booking.status === 'completed');
    const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled');
    const revenue = bookings
      .filter((booking) => ['confirmed', 'active', 'completed'].includes(booking.status))
      .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
    return {
      totalServices: services.length,
      activeServices: activeServices.length,
      totalBookings: bookings.length,
      activeBookings: bookings.filter((booking) => ['pending', 'confirmed', 'active'].includes(booking.status)).length,
      completedBookings: completedBookings.length,
      cancellationRate: bookings.length ? Math.round((cancelledBookings.length / bookings.length) * 100) : 0,
      revenue,
      availableQuantity: services.length,
    };
  }, [services, bookings]);

  const startEdit = (service) => {
    setEditingService(service);
    setForm({
      title: service.title || service.name || '',
      description: service.description || '',
      serviceLocation: normalizeServiceLocationForForm(service),
      locationDetails: normalizeLocationForForm(service),
      category: service.category || service.serviceType || 'hotel-rooms',
      payoutDetails: {
        method: service.payoutDetails?.method || 'mobile-money',
        accountName: service.payoutDetails?.accountName || '',
        accountNumber: service.payoutDetails?.accountNumber || '',
        instructions: service.payoutDetails?.instructions || '',
      },
      contactDetails: {
        phone: service.contactDetails?.phone || '',
        whatsapp: service.contactDetails?.whatsapp || '',
      },
      status: service.status === 'unavailable' ? 'unavailable' : service.availabilityText ? 'custom' : 'available',
      customAvailability: service.availabilityText || '',
      remainingQuantity: service.availabilityText || '',
      existingImages: Array.isArray(service.images) ? service.images.filter(Boolean).slice(0, 3) : [],
      imageFiles: [],
      promotion: {
        enabled: service.promotion?.enabled === true,
        title: service.promotion?.title || '',
        percent: service.promotion?.percent || service.promotion?.promotionPercent || '',
        note: service.promotion?.note || service.promotion?.description || '',
        startAt: toDateTimeInput(service.promotion?.startAt),
        endAt: toDateTimeInput(service.promotion?.endAt),
      },
      rebookSettings: {
        requestDeadlineHours: Number(service.rebookSettings?.requestDeadlineHours ?? 24),
        rebookIdValidityHours: Number(service.rebookSettings?.rebookIdValidityHours ?? 72),
      },
      cancelWindowHours: Number(service.cancelWindowHours ?? service.cancellationTerms?.windowHours ?? 6),
      cancelPenaltyPercent: Number(service.cancelPenaltyPercent ?? service.cancellationTerms?.penaltyPercent ?? 20),
      promotionHistory: Array.isArray(service.promotionHistory) ? service.promotionHistory : [],
      availabilityTable: normalizeTableForForm(service.availabilityTable),
      bookingForm: normalizeBookingFormForForm(service.bookingForm),
      bookingMode: service.bookingMode || 'manual',
    });
    setShowEditor(true);
    setViewingService(null);
    if (view !== 'services') navigate(`${basePath}/services`);
  };

  const resetForm = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setShowEditor(false);
    setViewingService(null);
  };

  const openViewDetails = async (service) => {
    setShowEditor(false);
    setViewingService(service);
    if (token) {
      try {
        const response = await hotelApi.getService(token, service._id || service.id);
        setViewingService(response.service || response);
      } catch {
        setViewingService(service);
      }
    }
  };

  const saveService = async (event) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setInfo('');
    let uploadedImageUrls = [];
    try {
      if (form.imageFiles?.length) {
        const uploadResponse = await hotelApi.uploadServiceImages(token, form.imageFiles);
        uploadedImageUrls = uploadResponse.urls || [];
      }
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
      return;
    }

    const normalizedStatus = form.status === 'unavailable' ? 'unavailable' : 'available';
    const availabilityText = form.status === 'custom' ? form.customAvailability : form.remainingQuantity;
    const quantityMatch = String(form.remainingQuantity || form.customAvailability || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
    const locationDetails = normalizeLocationDetails(form.serviceLocation);
    const payload = {
      title: form.title,
      description: form.description,
      serviceLocation: form.serviceLocation,
      locationDetails,
      contactDetails: form.contactDetails,
      serviceType: 'rental',
      category: form.category,
      pricing: { amount: 0, unit: 'service', currency: 'RWF' },
      priceText: '',
      availableQuantity: quantityMatch ? Number(quantityMatch[0]) : normalizedStatus === 'available' ? 1 : 0,
      availabilityText,
      status: normalizedStatus,
      images: [...(form.existingImages || []), ...uploadedImageUrls].slice(0, 3),
      promotion: form.promotion,
      rebookSettings: form.rebookSettings,
      cancelWindowHours: Number(form.cancelWindowHours || 6),
      cancelPenaltyPercent: Number(form.cancelPenaltyPercent || 20),
      cancellationPolicy: {
        windowHours: Number(form.cancelWindowHours || 6),
        penaltyPercent: Number(form.cancelPenaltyPercent || 20),
      },
      availabilityTable: form.availabilityTable,
      bookingForm: form.bookingForm,
      isActive: true,
    };
    try {
      const response = editingService
        ? await hotelApi.updateService(token, editingService._id, payload)
        : await hotelApi.createService(token, payload);
      setInfo(response.message);
      resetForm();
      setShowEditor(false);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (service, status) => {
    const structuredLocation = normalizeLocationForForm(service);
    const serviceLocation = normalizeServiceLocationForForm(service);
    const hasLocation = isAdministrativeLocationComplete(serviceLocation) && serviceLocation.latitude && serviceLocation.longitude;
    const hasPayout = payoutDetails?.accountName && (payoutDetails?.accountNumber || payoutDetails?.msisdn);
    const hasPriceRows = service.availabilityTable?.rows?.some((row) => row.cells?.service && row.cells?.price);
    if (!hasLocation || !hasPayout || !hasPriceRows) {
      if (!hasPayout) {
        setFinanceSubTab('payout');
        navigate(`${basePath}/finance`);
        setInfo('Save your MoMo or bank payout details before customers can pay this listing.');
        return;
      }
      startEdit(service);
      setInfo('Complete the exact location, payout account, and Service / Price table before changing availability.');
      return;
    }
    startEdit(service);
    const payload = {
      title: service.title || service.name,
      description: service.description,
      locationDetails: structuredLocation,
      serviceLocation,
      payoutDetails: service.payoutDetails,
      contactDetails: service.contactDetails || EMPTY_FORM.contactDetails,
      serviceType: service.serviceType || 'rental',
      category: service.category,
      pricing: service.pricing,
      priceText: '',
      availableQuantity: status === 'available' ? 1 : 0,
      availabilityText: service.availabilityText || '',
      status,
      images: service.images || [],
      promotion: service.promotion || EMPTY_FORM.promotion,
      rebookSettings: service.rebookSettings || EMPTY_FORM.rebookSettings,
      availabilityTable: service.availabilityTable || EMPTY_FORM.availabilityTable,
      bookingForm: service.bookingForm || EMPTY_FORM.bookingForm,
      isActive: true,
    };
    try {
      const response = await hotelApi.updateService(token, service._id, payload);
      setInfo(response.message);
      resetForm();
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm('Delete this business item?')) return;
    try {
      const response = await hotelApi.deleteService(token, serviceId);
      setInfo(response.message);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateBookingStatus = async (bookingId, statusOrPayload) => {
    try {
      const payload = typeof statusOrPayload === 'string' ? { status: statusOrPayload } : statusOrPayload;
      const response = await hotelApi.updateBookingStatus(token, bookingId, payload);
      setInfo(response.message);
      setApprovalBooking(null);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!user || !isSellerRole(user.role)) return null;

  const pageMeta = {
    dashboard: { title: t('dash.analytics', language), subtitle: t('sellerDash.yourListings', language) },
    services: { title: t('dash.services', language), subtitle: t('sellerDash.yourListings', language) },
    bookings: { title: t('dash.bookings', language), subtitle: t('customerDash.manage', language) },
    finance: { title: t('dash.finance', language), subtitle: t('payouts', language) },
  }[view];
  const visibleServices = services.filter((service) => {
    const approval = serviceApprovalStatus(service);
    return serviceStatusFilter === 'all' || approval === serviceStatusFilter;
  });
  const openAddService = () => {
    resetForm();
    setShowEditor(true);
    if (view !== 'services') navigate(`${basePath}/services`);
  };

  return (
    <DashboardLayout>
      <main className="seller-dashboard-main py-6 sm:py-8">
        <div className="seller-dashboard-shell max-w-7xl mx-auto px-4">
          <div className="seller-dashboard-header mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{pageMeta.title}</h1>
              <p className="text-gray-600">{pageMeta.subtitle}</p>
            </div>
            <div className="seller-dashboard-actions flex gap-2">
              <button onClick={() => loadData()} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold">{t('refresh', language)}</button>
            </div>
          </div>

          {(error || info) && <div className="mb-4 space-y-2">{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{info}</p>}</div>}

          {view === 'dashboard' && (
            <div className="seller-dashboard-metrics grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Metric label={t('dash.services', language)} value={stats.totalServices} />
              <Metric label={t('revenue', language)} value={formatRwf(overview?.stats?.earnings ?? stats.revenue)} />
              <Metric label={t('heldMoney', language)} value={formatRwf(overview?.stats?.pendingPayout ?? overview?.stats?.pendingSettlement ?? 0)} />
              <Metric label={t('dash.bookings', language)} value={stats.totalBookings} />
            </div>
          )}
          {view === 'finance' && !payoutDetails?.accountNumber && !payoutDetails?.msisdn && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('sellerDash.customersCannotPay', language)}</p>
          )}

          {view === 'bookings' && (
            <div className="seller-dashboard-tabs mb-6 flex gap-2 overflow-x-auto">
              {[['bookings', t('dash.bookings', language)], ['rebook-requests', t('admin.rebookRequests', language)], ['verification', t('verify.title', language)]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setBookingSubTab(id)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${bookingSubTab === id ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>{label}</button>
              ))}
            </div>
          )}
          {view === 'finance' && (
            <div className="seller-dashboard-tabs mb-6 flex gap-2 overflow-x-auto">
              {[['finance', t('dash.finance', language)], ['payout', t('payout', language)]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFinanceSubTab(id)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${financeSubTab === id ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>{label}</button>
              ))}
            </div>
          )}

          {view === 'services' && viewingService && !showEditor ? (
            <div>
              <button type="button" onClick={() => setViewingService(null)} className="mb-4 text-sm font-semibold text-primary">{t('sellerDash.backToServices', language)}</button>
              <h2 className="mb-4 text-2xl font-black text-slate-950">{viewingService.title || viewingService.name || t('admin.serviceDetails', language)}</h2>
              <ServiceDetailsView service={viewingService} />
            </div>
          ) : (
          <section className="seller-dashboard-content bg-white rounded-2xl shadow-sm p-4">
            {loading ? <p className="p-4 text-gray-600">{t('sellerDash.loadingDashboard', language)}</p> : null}
            {!loading && view === 'dashboard' && <Analytics stats={stats} services={services} />}
            {!loading && view === 'services' && !showEditor && (
              <ServiceGrid
                services={visibleServices}
                statusFilter={serviceStatusFilter}
                setStatusFilter={setServiceStatusFilter}
                onAdd={openAddService}
                onView={openViewDetails}
                onEdit={startEdit}
                onDelete={deleteService}
                onStatus={updateStatus}
              />
            )}
            {view === 'services' && showEditor && (
              <div>
                <button type="button" onClick={resetForm} className="mb-4 text-sm font-semibold text-primary">{t('sellerDash.backToServices', language)}</button>
                <ServiceForm form={form} setForm={setForm} onSubmit={saveService} saving={saving} editing={Boolean(editingService)} globalBookingMode={globalBookingMode} />
              </div>
            )}
            {!loading && view === 'bookings' && bookingSubTab === 'bookings' && <BookingList bookings={bookings} onStatus={updateBookingStatus} onApproveBooking={setApprovalBooking} onCompleted={() => loadData({ silent: true })} />}
            {!loading && view === 'bookings' && bookingSubTab === 'rebook-requests' && <SellerRebookRequests />}
            {!loading && view === 'bookings' && bookingSubTab === 'verification' && <SellerBookingVerification token={token} />}
            {!loading && view === 'finance' && financeSubTab === 'finance' && <FinancePanel finance={finance} />}
            {!loading && view === 'finance' && financeSubTab === 'payout' && (
              <PayoutDetailsForm
                key={`${payoutDetails?.method || ''}-${payoutDetails?.accountNumber || payoutDetails?.msisdn || ''}-${payoutDetails?.accountName || ''}`}
                token={token}
                initial={payoutDetails}
                onSaved={() => loadData({ silent: true })}
              />
            )}
          </section>
          )}
        </div>
      </main>
      {approvalBooking && <SellerBookingApprovalModal booking={approvalBooking} onClose={() => setApprovalBooking(null)} onSubmit={(payload) => updateBookingStatus(approvalBooking._id || approvalBooking.id, payload)} />}
    </DashboardLayout>
  );
}

function Metric({ label, value }) {
  return <div className="seller-metric rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-primary">{value}</p></div>;
}

function canSellerReviewBooking(booking) {
  return ['pending', 'reviewing', 'requested'].includes(String(booking.status || '').toLowerCase());
}

function ServiceGrid({ services, statusFilter, setStatusFilter, onAdd, onView, onEdit, onDelete, onStatus }) {
  const { language } = useLanguage();
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{t('dash.services', language)}</h2>
          <p className="text-sm text-slate-500">{t('sellerDash.yourListings', language)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold">
            <option value="all">{t('sellerDash.all', language)}</option>
            <option value="pending">{t('pending', language)}</option>
            <option value="approved">{t('rebook.approved', language)}</option>
            <option value="rejected">{t('rejected', language)}</option>
          </select>
          <button type="button" onClick={onAdd} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">+ {t('sellerDash.addService', language)}</button>
        </div>
      </div>
      {!services.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
          <p className="font-black text-slate-900">{t('sellerDash.noServicesYet', language)}</p>
          <p className="mt-1 text-sm text-slate-600">{t('sellerDash.noServicesLead', language)}</p>
          <button type="button" onClick={onAdd} className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">{t('sellerDash.addService', language)}</button>
        </div>
      ) : (
        <div className="seller-service-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button type="button" onClick={onAdd} className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-blue-50/60 p-4 text-center text-primary hover:bg-blue-50">
            <span className="text-3xl font-black">+</span>
            <span className="mt-2 text-sm font-bold">{t('sellerDash.addService', language)}</span>
          </button>
          {services.map((service) => (
            <div key={service._id} className="seller-service-card rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">{service.title || service.name}</h3>
                  <p className="text-sm text-gray-600">{getCategoryDisplayLabel(service.serviceType || service.category, language)}</p>
                </div>
                <div className="grid gap-1 text-right">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-800">{serviceApprovalStatus(service)}</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{service.availabilityText || formatStatus(service.status, language)}</span>
                </div>
              </div>
              <p className="seller-service-description mt-3 text-sm text-gray-600">{service.description || t('serviceView.noDescription', language)}</p>
              <p className="mt-3 text-sm font-semibold text-primary">{t('sellerDash.pricesInTable', language)}</p>
              {Array.isArray(service.images) && service.images.length > 0 && (
                <div className="seller-service-images mt-4 grid grid-cols-3 gap-2">
                  {service.images.slice(0, 3).map((image, index) => (
                    <div key={image} className="relative">
                      <img src={image} alt={service.title || service.name} className="h-20 w-full rounded-lg object-cover" />
                      {index === 0 && service.promotion?.enabled && Number(service.promotion?.percent || 0) > 0 && (
                        <span className="absolute left-1 top-1 rounded bg-amber-400 px-2 py-1 text-[10px] font-black text-amber-950">-{Number(service.promotion.percent)}%</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {service.availabilityTable?.columns?.length > 0 && (
                <p className="seller-service-meta mt-3 text-xs font-semibold text-gray-500">
                  Availability table: {service.availabilityTable.rows?.length || 0} rows, {service.availabilityTable.columns.length} columns
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onView(service)} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">{t('sellerDash.viewDetails', language)}</button>
                <button type="button" onClick={() => onEdit(service)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">{t('edit', language)}</button>
                <button type="button" onClick={() => onStatus(service, service.status === 'available' ? 'unavailable' : 'available')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">{service.status === 'available' ? t('sellerDash.notAvailable', language) : t('sellerDash.available', language)}</button>
                <button type="button" onClick={() => onDelete(service._id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{t('delete', language)}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SellerBookingApprovalModal({ booking, onSubmit, onClose }) {
  const { language } = useLanguage();
  const [decision, setDecision] = useState({
    totalPrice: booking.totalPrice || booking.bookingDetails?.listedPriceRwf || '',
    paymentDeadlineHours: booking.paymentDeadlineHours || 24,
    paymentReason: booking.paymentReason || 'Approved service payment',
    note: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const set = (key, value) => setDecision((prev) => ({ ...prev, [key]: value }));
  const canApprove = Number(decision.totalPrice) > 0 && Number(decision.paymentDeadlineHours) > 0 && decision.paymentReason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">{t('sellerDash.manualApproval', language)}</p>
            <h2 className="text-xl font-bold text-gray-900">{booking.bookingDetails?.requestedService || booking.serviceId?.title || booking.assignmentLabel || 'Booking request'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">{t('close', language)}</button>
        </div>
        <DetailGrid data={{
          [t('sellerDash.customer', language)]: booking.touristId?.name || booking.userId?.name || t('sellerDash.customer', language),
          [t('email', language)]: booking.touristId?.email || booking.userId?.email || '-',
          [t('sellerDash.quantity', language)]: booking.quantity || booking.guests || 1,
          [t('status', language)]: booking.status,
        }} />
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <h3 className="font-bold text-green-950">{t('sellerDash.approveSend', language)}</h3>
          <p className="mt-1 text-sm text-green-800">{t('sellerDash.approveSendLead', language)}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">{t('sellerDash.finalPrice', language)}</span>
              <input type="number" min="1" value={decision.totalPrice} onChange={(event) => set('totalPrice', event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">{t('sellerDash.paymentDeadlineHours', language)}</span>
              <input type="number" min="1" value={decision.paymentDeadlineHours} onChange={(event) => set('paymentDeadlineHours', event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-gray-700">{t('sellerDash.paymentReason', language)}</span>
            <input value={decision.paymentReason} onChange={(event) => set('paymentReason', event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-gray-700">{t('sellerDash.optionalNote', language)}</span>
            <textarea rows={3} value={decision.note} onChange={(event) => set('note', event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" />
          </label>
          <button
            type="button"
            disabled={!canApprove}
            onClick={() => onSubmit({
              status: 'confirmed',
              totalPrice: Number(decision.totalPrice),
              paymentDeadlineHours: Number(decision.paymentDeadlineHours),
              paymentReason: decision.paymentReason.trim(),
              note: decision.note.trim(),
            })}
            className="mt-4 rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('sellerDash.approveSend', language)}
          </button>
        </div>
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-bold text-red-950">{t('sellerDash.rejectRequest', language)}</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder={t('rebook.reason', language)} className="min-w-0 flex-1 rounded-xl border border-red-200 bg-white px-4 py-3" />
            <button type="button" disabled={!rejectReason.trim()} onClick={() => onSubmit({ status: 'cancelled', reason: rejectReason.trim() })} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{t('sellerDash.rejectBooking', language)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingList({ bookings, onStatus, onApproveBooking, onCompleted }) {
  const { language } = useLanguage();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('bookingId');
  const openedFocusId = useRef('');

  useEffect(() => {
    const match = findBookingByFocusId(bookings, focusId);
    if (!match) return undefined;
    const key = String(match._id || match.id || focusId);
    if (openedFocusId.current === key) return undefined;
    openedFocusId.current = key;
    const timer = window.setTimeout(() => {
      if (canSellerReviewBooking(match)) onApproveBooking(match);
      else setSelectedBooking(match);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bookings, focusId, onApproveBooking]);

  if (!bookings.length) return <p className="p-4 text-gray-600">{t('sellerDash.noBookingsYet', language)}</p>;
  return (
    <>
      <CompleteBookingPanel onCompleted={onCompleted} />
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200"><th className="py-3 px-2 text-left">{t('sellerDash.bookingId', language)}</th><th className="py-3 px-2 text-left">{t('sellerDash.customer', language)}</th><th className="py-3 px-2 text-left">{t('sellerDash.service', language)}</th><th className="py-3 px-2 text-left">{t('sellerDash.quantity', language)}</th><th className="py-3 px-2 text-left">{t('sellerDash.booking', language)}</th><th className="py-3 px-2 text-left">{t('sellerDash.payment', language)}</th><th className="py-3 px-2 text-left">{t('sellerDash.paid', language)}</th><th className="py-3 px-2 text-right">{t('actions', language)}</th></tr></thead>
          <tbody>{bookings.map((booking) => {
            const focused = String(booking._id) === String(focusId) || String(booking.id) === String(focusId) || String(booking.bookingCode || '') === String(focusId);
            return (
              <tr key={booking._id} className={`border-b border-gray-100 ${focused ? 'bg-blue-50' : ''}`}>
                <td className="py-3 px-2 font-mono text-xs text-slate-600">{booking._id}</td>
                <td className="py-3 px-2">{booking.userId?.name || booking.touristId?.name || t('sellerDash.customer', language)}</td>
                <td className="py-3 px-2">{booking.bookingDetails?.requestedService || booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace}</td>
                <td className="py-3 px-2">{booking.quantity || 1}</td>
                <td className="py-3 px-2">{booking.status}</td>
                <td className="py-3 px-2">{booking.paymentStatus || 'unpaid'}</td>
                <td className="py-3 px-2">{formatRwf(booking.amountPaid || 0)}</td>
                <td className="py-3 px-2 text-right space-x-2">
                  <button onClick={() => setSelectedBooking(booking)} className="text-primary hover:underline">{t('view', language)}</button>
                  {canSellerReviewBooking(booking) && <button onClick={() => onApproveBooking(booking)} className="text-green-700 hover:underline">{t('sellerDash.review', language)}</button>}
                  {booking.status === 'confirmed' && <button onClick={() => onStatus(booking._id, 'cancelled')} className="text-primary hover:underline">{t('cancelled', language)}</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {bookings.map((booking) => {
          const focused = String(booking._id) === String(focusId) || String(booking.id) === String(focusId) || String(booking.bookingCode || '') === String(focusId);
          return (
          <article key={booking._id} className={`rounded-xl border bg-white p-4 shadow-sm ${focused ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-primary">{t('sellerDash.bookingId', language)} {String(booking._id || '').slice(-8) || '-'}</p><h3 className="mt-1 truncate font-black text-slate-900">{booking.bookingDetails?.requestedService || booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace}</h3><p className="mt-1 text-sm text-slate-500">{booking.touristId?.name || t('sellerDash.customer', language)}</p></div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">{booking.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">{t('sellerDash.payment', language)}</span><strong>{booking.paymentStatus || 'unpaid'}</strong></p><p className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-500">{t('sellerDash.paid', language)}</span><strong>{formatRwf(booking.amountPaid || 0)}</strong></p></div>
            <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSelectedBooking(booking)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white">{t('view', language)}</button>{canSellerReviewBooking(booking) && <button onClick={() => onApproveBooking(booking)} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white">{t('sellerDash.review', language)}</button>}{booking.status === 'confirmed' && <button onClick={() => onStatus(booking._id, 'cancelled')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold capitalize text-slate-700">{t('cancelled', language)}</button>}</div>
          </article>
          );
        })}
      </div>
      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </>
  );
}

function Analytics({ stats, services }) {
  const low = services.filter((service) => Number(service.availableQuantity || 0) <= 2);
  const pending = services.filter((service) => serviceApprovalStatus(service) === 'pending').length;
  const approved = services.filter((service) => serviceApprovalStatus(service) === 'approved').length;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Metric label="Active bookings" value={stats.activeBookings} />
      <Metric label="Completed" value={stats.completedBookings} />
      <Metric label="Cancellation rate" value={`${stats.cancellationRate}%`} />
      <Metric label="Low availability" value={low.length} />
      <Metric label="Pending services" value={pending} />
      <Metric label="Approved services" value={approved} />
    </div>
  );
}

function ServiceForm({ form, setForm, onSubmit, saving, editing, globalBookingMode }) {
  const { language } = useLanguage();
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setServiceLocation = (serviceLocation) => setForm((prev) => ({
    ...prev,
    serviceLocation,
    locationDetails: normalizeLocationDetails(serviceLocation),
  }));
  const setContact = (key, value) => setForm((prev) => ({ ...prev, contactDetails: { ...prev.contactDetails, [key]: value } }));
  const setPromotion = (key, value) => setForm((prev) => ({ ...prev, promotion: { ...prev.promotion, [key]: value } }));
  const setRebookSetting = (key, value) => setForm((prev) => ({ ...prev, rebookSettings: { ...prev.rebookSettings, [key]: value } }));
  const updateTable = (updater) => setForm((prev) => ({ ...prev, availabilityTable: updater(prev.availabilityTable) }));
  return (
    <form onSubmit={onSubmit} className="seller-service-form grid gap-4 md:grid-cols-2">
      <Input label={t('serviceName', language)} value={form.title} onChange={(value) => set('title', value)} required />
      <CategorySelect value={form.category} onChange={(value) => set('category', value)} />
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-black text-blue-950">{t('sellerDash.bookingMode', language, { mode: globalBookingMode === 'service-level' ? form.bookingMode : globalBookingMode })}</p>
        <p className="mt-1 text-xs leading-5 text-blue-800">{t('sellerDash.bookingModeHelp', language)}</p>
      </div>
      <ServiceLocationPicker value={form.serviceLocation} onChange={setServiceLocation} />
      <Select label={t('sellerDash.availability', language)} value={form.status} onChange={(value) => set('status', value)} options={[['available', t('sellerDash.available', language)], ['unavailable', t('sellerDash.notAvailable', language)], ['custom', t('custom', language)]]} />
      {form.status === 'custom' ? (
        <Input label={t('customAvailability', language)} value={form.customAvailability} onChange={(value) => set('customAvailability', value)} placeholder={t('businessRegister.remainingExample', language)} required />
      ) : (
        <Input label={t('remainingQuantity', language)} value={form.remainingQuantity} onChange={(value) => set('remainingQuantity', value)} placeholder={t('businessRegister.remainingExample', language)} />
      )}
      <TextArea label={t('description', language)} value={form.description} onChange={(value) => set('description', value)} required />
      <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="font-bold text-emerald-950">{t('sellerDash.contactAfterPay', language)}</h3>
        <p className="mt-1 text-sm text-emerald-800">{t('sellerDash.contactAfterPayLead', language)}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label={t('primaryPhone', language)} type="tel" value={form.contactDetails.phone} onChange={(value) => setContact('phone', value)} placeholder="Example: +250 788 000 000" required />
          <Input label={t('secondPhone', language)} type="tel" value={form.contactDetails.whatsapp} onChange={(value) => setContact('whatsapp', value)} placeholder={t('optional', language)} />
        </div>
      </div>
      <div className="md:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <label className="flex items-center gap-3 font-bold text-amber-950">
          <input type="checkbox" checked={form.promotion.enabled} onChange={(event) => setPromotion('enabled', event.target.checked)} />
          Add a promotion to this service
        </label>
        <p className="mt-1 text-sm text-amber-800">{t('sellerDash.promoHelp', language)}</p>
        {form.promotion.enabled && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Promotion title" value={form.promotion.title} onChange={(value) => setPromotion('title', value)} placeholder="Example: Happy Hours!" required />
            <Input label="Promotion percent" type="number" value={form.promotion.percent} onChange={(value) => setPromotion('percent', value)} placeholder="Example: 25" required />
            <div className="md:col-span-2">
              <TextArea label="Promotion note" value={form.promotion.note} onChange={(value) => setPromotion('note', value)} />
            </div>
            <Input label="Promotion starts" type="datetime-local" value={form.promotion.startAt} onChange={(value) => setPromotion('startAt', value)} required />
            <Input label="Promotion ends" type="datetime-local" value={form.promotion.endAt} onChange={(value) => setPromotion('endAt', value)} required />
          </div>
        )}
        {form.promotionHistory.length > 0 && (
          <details className="mt-4 rounded-lg border border-amber-200 bg-white/80 p-3">
            <summary className="cursor-pointer text-sm font-bold text-amber-900">View promotion history ({form.promotionHistory.length})</summary>
            <div className="mt-3 grid gap-2">
              {[...form.promotionHistory].reverse().map((item, index) => (
                <div key={item._id || `${item.title}-${index}`} className="rounded-lg border border-amber-100 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-amber-800">{item.title}</strong>
                    <span className="text-xs font-semibold text-slate-500">Recorded {formatDashboardDate(item.recordedAt)}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{Number(item.percent || 0)}% discount{item.note || item.description ? ` · ${item.note || item.description}` : ''}</p>
                  <p className="mt-1 text-xs font-semibold text-orange-600">{formatDashboardDate(item.startAt)} – {formatDashboardDate(item.endAt)}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-bold text-blue-950">{t('sellerDash.rebookDeadlines', language)}</h3>
        <p className="mt-1 text-sm text-blue-800">{t('sellerDash.rebookDeadlinesLead', language)}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="Request cutoff (hours before booking)" type="number" value={form.rebookSettings.requestDeadlineHours} onChange={(value) => setRebookSetting('requestDeadlineHours', Number(value))} required />
          <Input label="Re-book ID validity (hours)" type="number" value={form.rebookSettings.rebookIdValidityHours} onChange={(value) => setRebookSetting('rebookIdValidityHours', Number(value))} required />
        </div>
      </div>
      <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-bold text-blue-950">{t('sellerDash.guestCancelRules', language)}</h3>
        <p className="mt-1 text-sm text-blue-800">{t('sellerDash.guestCancelRulesLead', language)}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label={t('cancelWindowHours', language)} type="number" value={form.cancelWindowHours ?? 6} onChange={(value) => set('cancelWindowHours', Number(value))} required />
          <Input label={t('cancelPenaltyPercent', language)} type="number" value={form.cancelPenaltyPercent ?? 20} onChange={(value) => set('cancelPenaltyPercent', Number(value))} required />
        </div>
      </div>
      <label className="seller-photo-input block">
        <span className="text-sm font-semibold text-gray-700">{t('sellerDash.photos', language)}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            const { accepted, rejected } = validateImageFiles(files);
            const remainingSlots = Math.max(0, 3 - form.existingImages.length);
            set('imageFiles', accepted.slice(0, remainingSlots));
            if (rejected || accepted.length > remainingSlots) {
              event.target.value = '';
              window.alert(t('imageLimit', language));
            }
          }}
          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3"
        />
        <span className="mt-1 block text-xs text-gray-500">{t('sellerDash.photoHint', language)}</span>
      </label>
      {(form.existingImages.length > 0 || form.imageFiles.length > 0) && (
        <div className="seller-photo-grid md:col-span-2 grid grid-cols-3 gap-3">
          {form.existingImages.map((image) => (
            <div key={image} className="seller-photo-item relative min-w-0">
              <img src={image} alt="Business" className="h-24 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => set('existingImages', form.existingImages.filter((item) => item !== image))}
                className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-red-700"
              >
                {t('admin.remove', language)}
              </button>
            </div>
          ))}
          {form.imageFiles.map((file) => (
            <div key={`${file.name}-${file.size}`} className="seller-photo-item min-w-0 break-words rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-600">
              New photo: {file.name}
            </div>
          ))}
        </div>
      )}
      <AvailabilityTableBuilder table={form.availabilityTable} updateTable={updateTable} />
      <details className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-black text-slate-900">{t('sellerDash.optionalQuestions', language)}</summary>
        <p className="mt-2 text-sm text-slate-500">{t('sellerDash.optionalQuestionsLead', language)}</p>
        <div className="mt-4"><BookingFormBuilder bookingForm={form.bookingForm} setBookingForm={(bookingForm) => set('bookingForm', bookingForm)} /></div>
      </details>
      <button type="submit" disabled={saving} className="md:col-span-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? t('savingEllipsis', language) : editing ? t('editService', language) : t('addService', language)}</button>
    </form>
  );
}

function BookingFormBuilder({ bookingForm, setBookingForm }) {
  const { language } = useLanguage();
  const update = (patch) => setBookingForm({ ...bookingForm, ...patch });
  const makeField = (question = {}) => ({
    id: makeId('field'),
    type: question.type || 'text',
    label: question.label || 'New Question',
    placeholder: question.placeholder || '',
    helpText: question.helpText || '',
    defaultValue: question.defaultValue || '',
    required: Boolean(question.required),
    enabled: true,
    options: question.options || [],
    validation: question.type === 'file'
      ? { maxFileSizeMb: 5, acceptedFileTypes: 'image/*,.pdf', ...(question.validation || {}) }
      : question.validation || {},
  });
  const updateField = (fieldId, patch) => update({
    fields: bookingForm.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field),
  });
  const addField = () => update({
    fields: [...bookingForm.fields, makeField({ label: 'New Question' })],
  });
  const addQuickQuestion = (question) => update({
    fields: [...bookingForm.fields, makeField(question)],
  });
  const deleteField = (fieldId) => update({ fields: bookingForm.fields.filter((field) => field.id !== fieldId) });
  const duplicateField = (field) => update({ fields: [...bookingForm.fields, { ...field, id: makeId('field'), label: `${field.label} Copy` }] });
  const moveField = (fieldId, direction) => {
    const index = bookingForm.fields.findIndex((field) => field.id === fieldId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= bookingForm.fields.length) return;
    const fields = [...bookingForm.fields];
    const [field] = fields.splice(index, 1);
    fields.splice(nextIndex, 0, field);
    update({ fields });
  };
  const applyTemplate = (template) => {
    const confirmed = bookingForm.fields.length <= 1 || window.confirm('Replace the current form questions with this template?');
    if (!confirmed) return;
    update({
      title: `${template.label} Request`,
      description: template.description,
      isPublished: true,
      fields: template.fields.map((fieldItem, index) => ({
        id: makeId(`field_${index + 1}`),
        type: fieldItem.type,
        label: fieldItem.label,
        placeholder: fieldItem.placeholder || '',
        helpText: '',
        defaultValue: '',
        required: Boolean(fieldItem.required),
        enabled: true,
        options: fieldItem.options || [],
        validation: {},
      })),
    });
  };

  return (
    <div className="seller-booking-builder md:col-span-2 min-w-0 rounded-xl border border-gray-200 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{t('sellerDash.optionalCustomerQuestions', language)}</h3>
          <p className="text-sm text-gray-500">{t('sellerDash.optionalCustomerQuestionsLead', language)}</p>
        </div>
        <button type="button" onClick={addField} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">{t('sellerDash.addField', language)}</button>
      </div>
      <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-bold">{t('sellerDash.howToUse', language)}</p>
        <p className="mt-1">{t('sellerDash.howToUseBody', language)}</p>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {FORM_TEMPLATES.map((template) => (
          <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-primary">
            <span className="block font-bold text-gray-900">{template.label}</span>
            <span className="mt-1 block text-xs text-gray-500">{template.description}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">{t('sellerDash.fieldLibrary', language)}</p>
        <p className="mt-1 text-sm text-gray-500">{t('sellerDash.fieldLibraryLead', language)}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {QUICK_QUESTIONS.map((group) => (
            <div key={group.group} className="rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-bold text-gray-900">{group.group}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((question) => (
                  <button key={question.label} type="button" onClick={() => addQuickQuestion(question)} className="rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 shadow-sm hover:text-primary">
                    + {question.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Input label="Form Name" value={bookingForm.title} onChange={(value) => update({ title: value })} placeholder="Example: Car Rental Request" />
          <TextArea label="Short Message Above Form" value={bookingForm.description} onChange={(value) => update({ description: value })} />
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={bookingForm.isPublished} onChange={(event) => update({ isPublished: event.target.checked })} />
            Show this form to customers
          </label>
          {bookingForm.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-900">Question {index + 1}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${field.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{field.enabled ? 'Visible' : 'Hidden'}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input label="Question" value={field.label} onChange={(value) => updateField(field.id, { label: value })} />
                <Select label="Answer Type" value={field.type} onChange={(value) => updateField(field.id, { type: value })} options={FIELD_TYPES} />
                <Input label="Example Answer" value={field.placeholder} onChange={(value) => updateField(field.id, { placeholder: value })} />
                <Input label="Pre-filled Answer" value={field.defaultValue} onChange={(value) => updateField(field.id, { defaultValue: value })} />
              </div>
              <TextArea label="Small Help Note" value={field.helpText} onChange={(value) => updateField(field.id, { helpText: value })} />
              {['select', 'radio', 'checkbox'].includes(field.type) && (
                <Input label="Choices" value={(field.options || []).join(', ')} onChange={(value) => updateField(field.id, { options: value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Example: Haircut, Hair Coloring, Beard Trim" />
              )}
              {field.type === 'file' && (
                <div className="grid gap-2 md:grid-cols-2">
                  <Input label="Accepted File Types" value={field.validation?.acceptedFileTypes || ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), acceptedFileTypes: value } })} placeholder="image/*,.pdf" />
                  <Input label="Max File Size MB" type="number" value={field.validation?.maxFileSizeMb || 5} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), maxFileSizeMb: value } })} />
                </div>
              )}
              <details className="mt-3 rounded-lg bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">{t('sellerDash.moreSettings', language)}</summary>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {field.type === 'number' && (
                    <>
                      <Input label="Minimum Number" type="number" value={field.validation?.min ?? ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), min: value } })} />
                      <Input label="Maximum Number" type="number" value={field.validation?.max ?? ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), max: value } })} />
                    </>
                  )}
                  {['text', 'email', 'tel', 'url'].includes(field.type) && (
                    <Input label="Validation Pattern" value={field.validation?.pattern || ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), pattern: value } })} placeholder="Optional advanced rule" />
                  )}
                </div>
              </details>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} />{t('sellerDash.mustAnswer', language)}</label>
                <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"><input type="checkbox" checked={field.enabled} onChange={(event) => updateField(field.id, { enabled: event.target.checked })} />{t('sellerDash.showQuestion', language)}</label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={index === 0} onClick={() => moveField(field.id, -1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">{t('sellerDash.moveEarlier', language)}</button>
                <button type="button" disabled={index === bookingForm.fields.length - 1} onClick={() => moveField(field.id, 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">{t('sellerDash.moveLater', language)}</button>
                <button type="button" onClick={() => duplicateField(field)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">{t('sellerDash.copyQuestion', language)}</button>
                <button type="button" onClick={() => deleteField(field.id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{t('sellerDash.removeQuestion', language)}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <div className="mb-3 rounded-lg bg-white p-3 text-sm text-gray-600">
            <p className="font-bold text-gray-900">{t('sellerDash.customerPreview', language)}</p>
            <p>{t('sellerDash.customerPreviewLead', language)}</p>
          </div>
          <h4 className="font-bold text-gray-900">{bookingForm.title || 'Booking Request'}</h4>
          {bookingForm.description && <p className="mt-1 text-sm text-gray-600">{bookingForm.description}</p>}
          <div className="mt-4 grid gap-3">
            {bookingForm.fields.filter((field) => field.enabled).map((field) => <PreviewField key={field.id} field={field} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field }) {
  const common = "mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 bg-white";
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{field.label}{field.required ? ' *' : ''}</span>
      {field.helpText && <span className="block text-xs text-gray-500">{field.helpText}</span>}
      {field.type === 'textarea' ? <textarea disabled placeholder={field.placeholder} className={common} /> : ['select', 'radio', 'checkbox'].includes(field.type) ? (
        <select disabled className={common}><option>{field.options?.[0] || field.placeholder || 'Option'}</option></select>
      ) : <input disabled type={field.type === 'file' ? 'text' : field.type} placeholder={field.placeholder} className={common} />}
    </label>
  );
}

function AvailabilityTableBuilder({ table, updateTable }) {
  const { language } = useLanguage();
  const rows = table?.rows || [];
  const [selectedRowId, setSelectedRowId] = useState(rows[0]?.id || '');
  const [detailsRow, setDetailsRow] = useState(null);
  const selectedRow = rows.find((row) => row.id === selectedRowId) || rows[0] || null;
  const selected = selectedRow?.cells || {};

  const addRow = () => {
    const id = makeId('row');
    updateTable((current) => ({
      ...current,
      rows: [...(current.rows || []), { id, cells: { service: '', price: '', priceType: '', calculationField: '', durationUnit: '', maximumDuration: '', availability: '', availableFrom: '', availableTo: '', availableDays: '', availableStartTime: '', availableEndTime: '', requiresTime: '', details: '' } }],
    }));
    setSelectedRowId(id);
  };

  const deleteRow = (rowId) => {
    const remaining = rows.filter((row) => row.id !== rowId);
    updateTable((current) => ({ ...current, rows: remaining }));
    if (selectedRowId === rowId) setSelectedRowId(remaining[0]?.id || '');
  };

  const updateCell = (rowId, columnId, value) => updateTable((current) => ({
    ...current,
    rows: current.rows.map((row) => row.id === rowId
      ? { ...row, cells: { ...(row.cells || {}), [columnId]: value } }
      : row),
  }));

  const people = 2;
  const quantity = 1;
  const duration = 2;
  const basePrice = Number(selected.price || 0);
  const previewTotal = calculatePreviewTotal(selected.priceType, basePrice, people, quantity, duration);
  const priceTypeLabel = PRICE_TABLE_OPTIONS.priceType.find(([value]) => value === selected.priceType)?.[1] || t('sellerDash.priceType', language);

  return (
    <section className="seller-price-builder md:col-span-2 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-5">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[1.05fr_1fr_.58fr]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg font-black text-primary">1</span>
              <div><h3 className="font-black text-slate-950">{t('sellerDash.priceOptions', language)} <span className="font-medium text-slate-500">{t('sellerDash.sellerView', language)}</span></h3><p className="mt-1 text-xs text-slate-500">{t('sellerDash.priceOptionsLead', language)}</p></div>
            </div>
            <button type="button" onClick={addRow} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">+ Add option</button>
          </div>

          <div className="grid grid-cols-[1.45fr_.65fr_.8fr_.65fr_.55fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <span>{t('sellerDash.optionName', language)}</span><span>{t('sellerDash.price', language)}</span><span>{t('sellerDash.priceType', language)}</span><span>{t('sellerDash.availability', language)}</span><span>{t('sellerDash.details', language)}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const cells = row.cells || {};
              const active = row.id === selectedRow?.id;
              return <button key={row.id} type="button" onClick={() => setSelectedRowId(row.id)} className={`grid w-full grid-cols-[1.45fr_.65fr_.8fr_.65fr_.55fr] items-center gap-2 px-4 py-4 text-left text-xs transition ${active ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                <span className="flex min-w-0 items-center gap-2 font-bold text-slate-900"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">▣</span><span className="truncate">{cells.service || t('sellerDash.newOption', language)}</span></span>
                <span className="font-black text-primary">{Number(cells.price || 0).toLocaleString()}</span>
                <span className="capitalize text-slate-600">{String(cells.priceType || t('notSet', language)).replace(/-/g, ' ')}</span>
                <span className="font-semibold text-emerald-600">● {Number(cells.availability || 0)} {t('sellerDash.available', language).toLowerCase()}</span>
                <span onClick={(event) => { event.stopPropagation(); setDetailsRow(row); }} className="font-bold text-primary">{t('sellerDash.viewDetails', language)}</span>
              </button>;
            })}
          </div>
          {!rows.length && <p className="p-6 text-center text-sm text-slate-500">{t('sellerDash.addFirstOption', language)}</p>}

          {selectedRow && <div className="border-t border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-black text-slate-900">{t('sellerDash.editSelected', language)}</h4><button type="button" onClick={() => deleteRow(selectedRow.id)} className="text-xs font-bold text-red-600">{t('sellerDash.deleteOption', language)}</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StudioField label={t('sellerDash.optionName', language)} value={selected.service || ''} onChange={(value) => updateCell(selectedRow.id, 'service', value)} />
              <StudioField label={`${t('sellerDash.price', language)} (RWF)`} type="number" value={selected.price || ''} onChange={(value) => updateCell(selectedRow.id, 'price', value)} />
              <StudioSelect label={t('sellerDash.priceType', language)} value={selected.priceType || ''} options={PRICE_TABLE_OPTIONS.priceType} onChange={(value) => updateCell(selectedRow.id, 'priceType', value)} />
              <StudioSelect label={t('serviceView.calculatedBy', language)} value={selected.calculationField || ''} options={PRICE_TABLE_OPTIONS.calculationField} onChange={(value) => updateCell(selectedRow.id, 'calculationField', value)} />
              <StudioSelect label={t('serviceView.durationUnit', language)} value={selected.durationUnit || ''} options={PRICE_TABLE_OPTIONS.durationUnit} onChange={(value) => updateCell(selectedRow.id, 'durationUnit', value)} />
              <StudioField label={t('serviceView.maximumDuration', language)} type="number" value={selected.maximumDuration || ''} onChange={(value) => updateCell(selectedRow.id, 'maximumDuration', value)} />
              <StudioField label={t('serviceView.capacity', language)} type="number" value={selected.availability || ''} onChange={(value) => updateCell(selectedRow.id, 'availability', value)} />
              <StudioField label={t('serviceView.availableFrom', language)} type="date" value={selected.availableFrom || ''} onChange={(value) => updateCell(selectedRow.id, 'availableFrom', value)} />
              <StudioField label={t('serviceView.availableUntil', language)} type="date" value={selected.availableTo || ''} onChange={(value) => updateCell(selectedRow.id, 'availableTo', value)} />
              <StudioField label={`${t('serviceView.startTime', language)} ${t('booking.optional', language)}`} type="time" value={selected.availableStartTime || ''} onChange={(value) => updateCell(selectedRow.id, 'availableStartTime', value)} />
              <StudioField label={`${t('serviceView.endTime', language)} ${t('booking.optional', language)}`} type="time" value={selected.availableEndTime || ''} onChange={(value) => updateCell(selectedRow.id, 'availableEndTime', value)} />
              <StudioSelect label={t('serviceView.timeRequired', language)} value={selected.requiresTime || ''} options={TIME_REQUIREMENT_OPTIONS} onChange={(value) => updateCell(selectedRow.id, 'requiresTime', value)} />
              <fieldset className="sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">{t('sellerDash.availableDays', language)}</span>
                <p className="mt-1 text-[11px] text-slate-500">{t('sellerDash.leaveUnchecked', language)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(([key, label]) => {
                    const selectedDays = String(selected.availableDays || '').split(',').filter(Boolean);
                    const checked = selectedDays.includes(key);
                    return (
                      <label key={key} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${checked ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 bg-white text-slate-600'}`}>
                        <input
                          type="checkbox"
                          className="mr-1.5 align-middle"
                          checked={checked}
                          onChange={() => updateCell(selectedRow.id, 'availableDays', toggleAvailableDay(selected.availableDays, key))}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">{t('sellerDash.detailsAmenities', language)}</span><textarea rows={2} value={selected.details || ''} onChange={(event) => updateCell(selectedRow.id, 'details', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder={t('sellerDash.detailsPlaceholder', language)} /></label>
            </div>
          </div>}

          <div className="m-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">ⓘ These options appear in the customer booking form. Prices and availability stay synchronized with automatic bookings.</div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">●</span><div><h3 className="font-black text-slate-950">{t('sellerDash.formPreview', language)} <span className="font-medium text-slate-500">{t('sellerDash.customerView', language)}</span></h3><p className="mt-1 text-xs text-slate-500">{t('sellerDash.formPreviewLead', language)}</p></div></div>
          <label className="block text-xs font-bold text-slate-700">{t('sellerDash.chooseService', language)} <span className="text-red-500">*</span><select value={selectedRow?.id || ''} onChange={(event) => setSelectedRowId(event.target.value)} className="mt-1 w-full rounded-lg border-2 border-blue-500 bg-white px-3 py-3 text-sm"><option value="">{t('sellerDash.chooseOption', language)}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.cells?.service || t('sellerDash.newOption', language)} — {formatRwf(Number(row.cells?.price || 0))} {String(row.cells?.priceType || '').replace(/-/g, ' ')}</option>)}</select></label>
          {selectedRow && <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-3 text-xs"><strong className="text-primary">▥ &nbsp;{selected.service || t('sellerDash.selectedOption', language)} — {formatRwf(basePrice)}</strong><button type="button" onClick={() => setDetailsRow(selectedRow)} className="font-bold text-primary">{t('sellerDash.viewDetails', language)} ↗</button></div>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PreviewInput label={t('booking.fullName', language)} placeholder={t('booking.fullName', language)} />
            <PreviewInput label={t('booking.phoneNumber', language)} placeholder="+250 7XX XXX XXX" />
            <PreviewInput label={t('email', language)} placeholder="you@example.com" />
            <PreviewInput label={t('booking.bookingDate', language)} placeholder={t('booking.date', language)} />
            {parseOptionAvailability(selectedRow).requiresEndDate && <PreviewInput label={t('booking.endBookingDate', language)} placeholder={t('booking.endDate', language)} />}
            <PreviewInput label={parseOptionAvailability(selectedRow).requiresTime ? t('booking.startTime', language) : `${t('booking.startTime', language)} ${t('booking.optional', language)}`} placeholder={t('booking.startTime', language)} />
            <PreviewInput label={parseOptionAvailability(selectedRow).requiresTime ? t('booking.endTime', language) : `${t('booking.endTime', language)} ${t('booking.optional', language)}`} placeholder={t('booking.endTime', language)} />
            <PreviewInput label={t('booking.numberOfPeople', language)} placeholder="2" />
            <PreviewInput label={t('booking.quantityUnits', language)} placeholder="1" />
            <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-700">{t('sellerDash.specialRequest', language)} <span className="font-normal text-slate-400">{t('booking.optional', language)}</span></span><textarea disabled rows={4} placeholder={t('sellerDash.specialRequestPlaceholder', language)} className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
          </div>
        </div>

        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-primary">▦</span><h3 className="text-sm font-black text-slate-950">{t('sellerDash.quotePreview', language)}</h3></div>
          <dl className="mt-5 space-y-4 text-xs text-slate-600">
            <QuoteLine label={t('payment.selectedService', language)} value={selected.service || t('sellerDash.chooseOption', language)} />
            <QuoteLine label={t('sellerDash.priceType', language)} value={priceTypeLabel} />
            <QuoteLine label={t('booking.numberOfPeople', language)} value={people} />
            <QuoteLine label={t('booking.quantityUnits', language)} value={quantity} />
            <QuoteLine label={t('booking.bookingDuration', language)} value={`${duration} ${selected.durationUnit || t('sellerDash.quantity', language).toLowerCase()}`} />
          </dl>
          <div className="my-5 border-t border-slate-200" />
          <QuoteLine label={t('booking.totalPrice', language)} value={formatRwf(previewTotal)} strong />
          <p className="mt-4 text-xs text-slate-500">{t('sellerDash.guestsPayFull', language)}</p>
          <button type="button" disabled className="mt-7 w-full rounded-xl bg-primary px-3 py-3 text-sm font-black text-white opacity-90">▣ &nbsp; {t('booking.payInFull', language)}</button>
          <p className="mt-3 text-center text-[10px] text-slate-500">♢ Your payment is secure and protected.</p>
        </aside>
      </div>

      {detailsRow && <OptionDetailsModal row={detailsRow} onClose={() => setDetailsRow(null)} />}
    </section>
  );
}

function CompleteBookingPanel({ onCompleted }) {
  const { language } = useLanguage();
  const [code, setCode] = useState('');
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const token = getAuthData()?.token;

  const verify = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setSummary(null);
    try {
      const response = await hotelApi.verifyBookingCode(token, code.trim());
      setSummary(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!summary?.bookingId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await hotelApi.completeVerifiedBooking(token, {
        bookingId: summary.bookingId,
        code: code.trim(),
      });
      setMessage(response.message);
      setCode('');
      setSummary(null);
      onCompleted?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="font-black text-blue-950">{t('sellerDash.completeBooking', language)}</h3>
      <p className="mt-1 text-sm text-blue-800">{t('sellerDash.completeBookingLead', language)}</p>
      <form onSubmit={verify} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t('bookingCode', language)} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono uppercase" />
        <button disabled={busy || !code.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? `${t('verify.checking', language)}...` : t('booking.verifyId', language)}</button>
      </form>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {summary && (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm">
          <dl className="grid gap-3 md:grid-cols-3">
            <Detail label={t('sellerDash.bookingId', language)} value={summary.bookingId} />
            <Detail label={t('sellerDash.customer', language)} value={summary.customerName} />
            <Detail label={t('sellerDash.service', language)} value={summary.serviceName} />
            <Detail label={t('booking.bookingDate', language)} value={summary.bookingDate ? new Date(summary.bookingDate).toLocaleString() : '-'} />
            <Detail label={t('customerDash.amountPaid', language)} value={formatRwf(summary.depositAmount || summary.amountPaid || 0)} />
            <Detail label={t('payment.remainingAtVenue', language)} value={formatRwf(summary.remainingAmount || 0)} />
          </dl>
          <button type="button" disabled={busy} onClick={complete} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{t('sellerDash.completeBooking', language)}</button>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-all font-semibold text-slate-800">{value || '-'}</dd></div>;
}

function calculatePreviewTotal(priceType, price, people, quantity, duration) {
  if (priceType === 'per-person') return price * people;
  if (['per-night', 'per-day', 'per-hour'].includes(priceType)) return price * quantity * duration;
  if (['per-room', 'per-item', 'per-ticket', 'per-session'].includes(priceType)) return price * quantity;
  return price;
}

function StudioField({ label, value, onChange, type = 'text' }) {
  return <label><span className="text-xs font-bold text-slate-600">{label}</span><input type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>;
}

function StudioSelect({ label, value, onChange, options }) {
  return <label><span className="text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function PreviewInput({ label, placeholder }) {
  return <label><span className="text-xs font-bold text-slate-700">{label} <span className="text-red-500">*</span></span><input disabled placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:text-slate-500" /></label>;
}

function QuoteLine({ label, value, strong = false }) {
  return <div className="flex items-start justify-between gap-3"><dt className={strong ? 'font-black text-slate-900' : ''}>{label}</dt><dd className={`text-right ${strong ? 'text-base font-black text-primary' : 'font-semibold text-slate-700'}`}>{value}</dd></div>;
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return <label className="block"><span className="text-sm font-semibold text-gray-700">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function Select({ label, value, onChange, options, required = false, disabled = false }) {
  return <label className="block"><span className="text-sm font-semibold text-gray-700">{label}</span><select required={required} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-blue-50 disabled:font-bold disabled:text-blue-950">{options.map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{option}</option>)}</select></label>;
}

const PRICE_TABLE_OPTIONS = {
  priceType: [['fixed', 'Fixed price'], ['per-person', 'Per person'], ['per-room', 'Per room'], ['per-night', 'Per night'], ['per-day', 'Per day'], ['per-hour', 'Per hour'], ['per-item', 'Per item'], ['per-ticket', 'Per ticket'], ['per-package', 'Per package'], ['per-session', 'Per session']],
  calculationField: [['people', 'Number of people'], ['quantity', 'Quantity / units'], ['duration', 'Booking duration'], ['package', 'Selected package'], ['fixed', 'Fixed price']],
  durationUnit: [['minutes', 'Minutes'], ['hours', 'Hours'], ['days', 'Days'], ['nights', 'Nights'], ['same-day', 'Same day only'], ['none', 'No duration needed']],
};

function CategorySelect({ value, onChange }) {
  const { language } = useLanguage();
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{t('sellerDash.category', language)}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">
        {SERVICE_CATEGORIES.map(([group, options]) => (
          <optgroup key={group} label={getCategoryGroupDisplayLabel(group, language)}>
            {options.map(([categoryValue, label]) => <option key={categoryValue} value={categoryValue}>{getCategoryDisplayLabel(categoryValue, language) || label}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, required = false }) {
  return <label className="block md:col-span-2"><span className="text-sm font-semibold text-gray-700">{label}</span><textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function formatStatus(status, language) {
  return status === 'unavailable' ? t('sellerDash.notAvailable', language) : t('sellerDash.available', language);
}

function BookingDetailModal({ booking, onClose }) {
  const { language } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">{t('sellerDash.bookingDetails', language)}</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">{t('close', language)}</button>
        </div>
        <DetailGrid data={{
          [t('sellerDash.bookingId', language)]: booking._id,
          [t('sellerDash.customer', language)]: booking.touristId?.name || booking.userId?.name || t('sellerDash.customer', language),
          [t('email', language)]: booking.touristId?.email || booking.userId?.email || '-',
          [t('customerDash.business', language)]: booking.hotelId?.name || booking.preferredHotelId?.name || booking.destinationPlace,
          [t('status', language)]: booking.status,
          [t('sellerDash.payment', language)]: booking.paymentStatus || 'unpaid',
          [t('customerDash.amountPaid', language)]: formatRwf(booking.amountPaid || 0),
          [t('customerDash.paymentPurpose', language)]: booking.paymentReason || '-',
          [t('sellerDash.quantity', language)]: booking.quantity || booking.guests || 1,
          [t('booking.date', language)]: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-',
        }} />
        <BookingPromotionSnapshot promotion={booking.promotionSnapshot} />
        <ResponseList responses={booking.bookingDetails?.customResponses?.length ? Object.fromEntries(booking.bookingDetails.customResponses.map((item) => [item.label, item.value])) : booking.bookingDetails} />
      </div>
    </div>
  );
}

function SellerBookingVerification({ token }) {
  const { language } = useLanguage();
  const [lookup, setLookup] = useState('');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!lookup.trim()) return;
    setError('');
    setBooking(null);
    try {
      const response = await hotelApi.verifyBooking(token, lookup.trim().replace(/^.*\/verify\//, ''));
      setBooking(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row">
        <input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder={t('verify.bookingId', language)} className="flex-1 rounded-xl border border-gray-300 px-4 py-3" />
        <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white">{t('verify.title', language)}</button>
      </form>
      <p className="text-sm text-gray-500">Staff can paste a scanned QR verification URL or enter the booking ID.</p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {booking && <div className="rounded-xl border border-gray-200 p-4"><BookingDetailBody booking={booking} /></div>}
    </div>
  );
}

function BookingDetailBody({ booking }) {
  const { language } = useLanguage();
  return (
    <>
      <DetailGrid data={{
        [t('sellerDash.bookingId', language)]: booking._id,
        [t('sellerDash.customer', language)]: booking.touristId?.name || booking.userId?.name || t('sellerDash.customer', language),
        [t('email', language)]: booking.touristId?.email || booking.userId?.email || '-',
        [t('customerDash.business', language)]: booking.hotelId?.name || booking.preferredHotelId?.name || booking.destinationPlace,
        [t('status', language)]: booking.status,
        [t('sellerDash.payment', language)]: booking.paymentStatus || 'unpaid',
        [t('customerDash.amountPaid', language)]: formatRwf(booking.amountPaid || 0),
        [t('customerDash.paymentPurpose', language)]: booking.paymentReason || '-',
        [t('sellerDash.quantity', language)]: booking.quantity || booking.guests || 1,
        [t('booking.date', language)]: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-',
      }} />
      <BookingPromotionSnapshot promotion={booking.promotionSnapshot} />
      <ResponseList responses={booking.bookingDetails?.customResponses?.length ? Object.fromEntries(booking.bookingDetails.customResponses.map((item) => [item.label, item.value])) : booking.bookingDetails} />
    </>
  );
}

function BookingPromotionSnapshot({ promotion }) {
  const { language } = useLanguage();
  if (!promotion?.title) return null;
  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-amber-700">{t('customerDash.promotionApplied', language)}</p>
      <h3 className="mt-1 font-black text-amber-900">{promotion.title}</h3>
      <p className="mt-1 text-sm text-slate-700">Saved {promotion.percent || promotion.promotionPercent || 0}% on this service.</p>
      {(promotion.note || promotion.description) && <p className="mt-1 text-sm text-slate-700">{promotion.note || promotion.description}</p>}
      <p className="mt-2 text-xs font-semibold text-orange-600">Valid {formatDashboardDate(promotion.startAt)} – {formatDashboardDate(promotion.endAt)}</p>
    </div>
  );
}

function DetailGrid({ data }) {
  return <dl className="grid gap-3 md:grid-cols-2">{Object.entries(data).map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt><dd className="mt-1 break-all text-sm font-semibold text-gray-900">{String(value || '-')}</dd></div>)}</dl>;
}

function ResponseList({ responses }) {
  const { language } = useLanguage();
  const entries = Object.entries(responses || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return <p className="mt-4 text-sm text-gray-500">{t('sellerDash.noBookingsYet', language)}</p>;
  return <div className="mt-4"><h3 className="font-bold text-gray-900">{t('serviceView.bookingForm', language)}</h3><div className="mt-2 grid gap-2">{entries.map(([key, value]) => <div key={key} className="rounded-lg border border-gray-200 p-3"><p className="text-xs font-semibold uppercase text-gray-500">{key}</p><p className="break-all text-sm text-gray-800">{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</p></div>)}</div></div>;
}

function PayoutDetailsForm({ token, initial, onSaved }) {
  const { language } = useLanguage();
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({
    method: initial?.method === 'bank' ? 'bank' : 'momo',
    providerId: initial?.providerId || '',
    accountName: initial?.accountName || '',
    accountNumber: initial?.accountNumber || initial?.msisdn || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsApi.getMethods().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  const providers = form.method === 'bank' ? catalog?.bankProviders || [] : catalog?.mobileMoneyProviders || [];

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await hotelApi.savePayoutDetails(token, form);
      setMessage(response.message || t('profilePage.payoutSavedMsg', language));
      onSaved?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid max-w-2xl gap-4">
      <h3 className="text-xl font-black text-slate-950">{t('profilePage.paymentInfo', language)}</h3>
      <p className="text-sm text-slate-600">{t('profilePage.paymentLead', language)}</p>
      <Select label={t('payoutMethod', language)} value={form.method} onChange={(value) => setForm((prev) => ({ ...prev, method: value, providerId: '' }))} options={[['momo', t('mobileMoney', language)], ['bank', t('bank', language)]]} />
      <label className="block"><span className="text-sm font-semibold text-gray-700">{t('providerLabel', language)}</span>
        <select required value={form.providerId} onChange={(event) => setForm((prev) => ({ ...prev, providerId: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">
          <option value="">{t('selectProvider', language)}</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
      </label>
      <Input label={t('accountName', language)} value={form.accountName} onChange={(value) => setForm((prev) => ({ ...prev, accountName: value }))} required />
      <Input label={form.method === 'bank' ? t('accountNumber', language) : t('profilePage.momoNumber', language)} value={form.accountNumber} onChange={(value) => setForm((prev) => ({ ...prev, accountNumber: value }))} required />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <button disabled={saving} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? t('savingEllipsis', language) : t('profilePage.savePayout', language)}</button>
    </form>
  );
}

function FinancePanel({ finance }) {
  const { language } = useLanguage();
  const summary = finance?.summary || {};
  const rows = finance?.transactions || [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{finance?.message || t('profilePage.paymentLead', language)}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label={t('heldMoney', language)} value={formatRwf(summary.grossCollected)} />
        <Metric label={t('payouts', language)} value={formatRwf(summary.pendingPayout ?? summary.heldPayout)} />
        <Metric label={t('payment.failed', language)} value={formatRwf(summary.failedPayout)} />
      </div>
      {!rows.length ? <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">{t('sellerDash.noBookingsYet', language)}</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-3">{t('sellerDash.booking', language)}</th><th className="py-2 pr-3">{t('sellerDash.paid', language)}</th><th className="py-2 pr-3">{t('status', language)}</th><th className="py-2 pr-3">{t('payout', language)}</th><th className="py-2 pr-3">{t('customerDash.destination', language)}</th><th className="py-2">{t('admin.message', language)}</th></tr></thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx._id || tx.payoutReference} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{tx.bookingId?.bookingCode || tx.bookingId?._id || '-'}</td>
                  <td className="py-2 pr-3">{formatRwf(tx.amount)}</td>
                  <td className="py-2 pr-3">{payoutStatusLabel(tx.payoutStatus)}</td>
                  <td className="py-2 pr-3">{tx.payoutReference || '-'}</td>
                  <td className="py-2 pr-3">{tx.payoutAccount || '-'}</td>
                  <td className="py-2">{tx.payoutMessage || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
