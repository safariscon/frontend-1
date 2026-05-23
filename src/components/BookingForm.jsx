import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { bookingApi, getAuthData, publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const TODAY = new Date().toISOString().split('T')[0];

const BASE_VALUES = {
  destinationPlace: '',
  destinationLocation: '',
  pickupLocation: '',
  dropoffLocation: '',
  startDate: '',
  endDate: '',
  reservationTime: '',
  vehicleType: '',
  packageType: '',
  durationHours: '1',
  durationDays: '1',
  quantity: '1',
  specialRequests: '',
};

const FIELD_SETS = {
  transport: [
    field('destinationPlace', 'Place You Want To Visit', 'text', 'e.g. Volcanoes National Park', true, 'col-span-2'),
    field('destinationLocation', 'Destination Location', 'text', 'Kigali', true, 'col-span-2'),
    field('pickupLocation', 'Pickup location', 'text', '', true),
    field('dropoffLocation', 'Destination', 'text', '', true),
    field('startDate', 'Trip date', 'date', '', true),
    field('vehicleType', 'Vehicle type', 'text', '', false),
    field('durationDays', 'Duration days', 'number', '', true),
    field('quantity', 'Passengers', 'number', '', true, 'col-span-2'),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  accommodation: [
    field('startDate', 'Check-in date', 'date', '', true),
    field('endDate', 'Check-out date', 'date', '', true),
    field('quantity', 'Guests', 'number', '', true, 'col-span-2'),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  food: [
    field('startDate', 'Reservation date', 'date', '', true),
    field('reservationTime', 'Reservation time', 'time', '', false),
    field('quantity', 'Guests / table size', 'number', '', true, 'col-span-2'),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  event: [
    field('startDate', 'Event date', 'date', '', true),
    field('durationHours', 'Duration hours', 'number', '', false),
    field('quantity', 'Attendees', 'number', '', true, 'col-span-2'),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  activity: [
    field('destinationPlace', 'Place You Want To Visit', 'text', 'e.g. Nyungwe Canopy Walk', true, 'col-span-2'),
    field('destinationLocation', 'Destination Location', 'text', '', true, 'col-span-2'),
    field('startDate', 'Activity date', 'date', '', true),
    field('packageType', 'Package type', 'text', '', false),
    field('quantity', 'Participants', 'number', '', true, 'col-span-2'),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  appointment: [
    field('startDate', 'Appointment date', 'date', '', true),
    field('reservationTime', 'Appointment time', 'time', '', false),
    field('durationHours', 'Duration hours', 'number', '', false),
    field('quantity', 'People', 'number', '', true),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  shopping: [
    field('quantity', 'Quantity', 'number', '', true),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
  general: [
    field('startDate', 'Date', 'date', '', true),
    field('quantity', 'Quantity', 'number', '', true),
    field('specialRequests', 'Special requests', 'textarea', '', false, 'col-span-2'),
  ],
};

function field(name, label, type, placeholder = '', required = false, className = '') {
  return { name, label, type, placeholder, required, className };
}

export default function BookingForm({ hotelId, onClose, onSuccess }) {
  const [business, setBusiness] = useState(null);
  const [values, setValues] = useState(BASE_VALUES);
  const [loading, setLoading] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const response = await publicApi.getHotels();
        const businesses = normalizeHotels(response.businesses || response.hotels || []);
        const found = businesses.find((item) => String(item.id) === String(hotelId));
        setBusiness(found || null);
        if (found) {
          const service = getSelectedService(found);
          setValues((prev) => ({
            ...prev,
            destinationPlace: service?.title || service?.name || found.name || '',
            destinationLocation: service?.location || found.location || '',
          }));
        }
      } finally {
        setLoadingBusiness(false);
      }
    };

    loadBusiness();
    return subscribeToRealtime(
      [REALTIME_EVENTS.CATALOG_CHANGED, REALTIME_EVENTS.HOTEL_CHANGED, REALTIME_EVENTS.SERVICE_CHANGED],
      loadBusiness
    );
  }, [hotelId]);

  const service = useMemo(() => getSelectedService(business), [business]);
  const bookingConfig = useMemo(() => getBookingConfig({ business, service }), [business, service]);
  const unitPrice = useMemo(() => getServiceUnitPrice(service), [service]);
  const unitCount = useMemo(() => getUnitCount(bookingConfig, values), [bookingConfig, values]);
  const totalPrice = unitPrice * unitCount;
  const isUnavailable = service?.status && service.status !== 'available';

  const updateValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!service?._id) return 'This service is not available for booking yet.';
    if (isUnavailable) return 'This service is currently not available.';
    const missing = bookingConfig.fields.find((item) => item.required && !String(values[item.name] || '').trim());
    if (missing) return `Please complete ${missing.label}.`;
    if (values.endDate && values.startDate && new Date(values.endDate) <= new Date(values.startDate)) {
      return 'End date must be after start date.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const authData = getAuthData();
    if (!authData?.token) {
      setError(t('pleaseLoginAgain', language));
      return;
    }

    setLoading(true);
    try {
      const response = await bookingApi.bookService(authData.token, {
        serviceId: service._id,
        quantity: getReservableQuantity(bookingConfig, values),
        startDate: values.startDate || null,
        endDate: values.endDate || values.startDate || null,
        durationHours: Number(values.durationHours) || 0,
        durationDays: Number(values.durationDays) || 0,
        reservationTime: values.reservationTime,
        destinationPlace: values.destinationPlace,
        destinationLocation: values.destinationLocation,
        pickupLocation: values.pickupLocation,
        dropoffLocation: values.dropoffLocation,
        vehicleType: values.vehicleType,
        packageType: values.packageType,
        specialRequests: values.specialRequests,
        bookingDetails: {
          ...values,
          passengers: bookingConfig.type === 'transport' ? values.quantity : undefined,
          guests: bookingConfig.type === 'accommodation' ? values.quantity : undefined,
          serviceCategory: service.category || business?.serviceCategory,
          bookingType: bookingConfig.type,
          providerRules: Array.isArray(service.rules) ? service.rules : [],
        },
      });

      onSuccess?.(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingBusiness) return <LoadingSpinner />;

  if (!business || !service) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
        <p className="text-gray-600">No bookable service was found for this provider.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{service.title || service.name}</h2>
          <p className="text-gray-600">
            {business.location} - {bookingConfig.label}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Close booking form">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {Array.isArray(service.rules) && service.rules.length > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Provider rules</p>
          <ul className="mt-2 list-disc pl-5">
            {service.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {bookingConfig.fields.map((item) => (
          <DynamicField
            key={item.name}
            field={item}
            value={values[item.name] || ''}
            onChange={(value) => updateValue(item.name, value)}
          />
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">
            {service.priceText || formatRwf(unitPrice)} x {unitCount} {bookingConfig.unitLabel}
          </span>
          <span className="font-medium">{formatRwf(totalPrice)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
          <span className="font-bold text-gray-900">{t('estimatedTotal', language)}</span>
          <span className="font-bold text-primary text-lg">{formatRwf(totalPrice)}</span>
        </div>
      </div>

      {isUnavailable && <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">This service is currently not available for booking.</div>}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading || isUnavailable}
        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            {t('sending', language)}
          </>
        ) : (
          t('submitBookingRequest', language)
        )}
      </button>
    </form>
  );
}

function getReservableQuantity(configData, values) {
  if (['transport', 'accommodation', 'appointment', 'event'].includes(configData.type)) return 1;
  return Math.max(1, Number(values.quantity) || 1);
}


function getSelectedService(business) {
  if (!business) return null;
  if (business.primaryService?._id) return business.primaryService;
  if (Array.isArray(business.serviceItems) && business.serviceItems.length) return business.serviceItems[0];
  return null;
}

function getBookingConfig({ business, service }) {
  const categoryText = [
    service?.category,
    service?.serviceType,
    business?.serviceCategory,
    business?.bookingModel,
    business?.businessType,
    business?.type,
  ].join(' ').toLowerCase();

  if (/(car|motorbike|taxi|bus|transport|charter)/.test(categoryText)) {
    return config('transport', 'transport', 'day', FIELD_SETS.transport);
  }
  if (/(hotel|resort|homestay|guesthouse|camp|vacation|accommodation)/.test(categoryText)) {
    return config('accommodation', 'accommodation', 'night', FIELD_SETS.accommodation);
  }
  if (/(restaurant|bar|coffee|cafe|food|beverage)/.test(categoryText)) {
    return config('food', 'food', 'booking', FIELD_SETS.food);
  }
  if (/(event|wedding|conference|venue|entertainment)/.test(categoryText)) {
    return config('event', 'event', 'event', FIELD_SETS.event);
  }
  if (/(tour|activity|experience|gear)/.test(categoryText)) {
    return config('activity', 'activity', 'person', FIELD_SETS.activity);
  }
  if (/(spa|wellness|childcare|appointment)/.test(categoryText)) {
    return config('appointment', 'appointment', 'hour', FIELD_SETS.appointment);
  }
  if (/(shopping|souvenir|craft|market)/.test(categoryText)) {
    return config('shopping', 'shopping', 'item', FIELD_SETS.shopping);
  }
  return config('general', 'service', 'service', FIELD_SETS.general);
}

function config(type, label, unitLabel, fields) {
  return { type, label, unitLabel, fields };
}

function getServiceUnitPrice(service) {
  const explicitAmount = Number(service?.pricing?.amount || 0);
  if (explicitAmount > 0) return explicitAmount;
  const match = String(service?.priceText || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function getUnitCount(configData, values) {
  if (configData.type === 'accommodation') {
    if (!values.startDate || !values.endDate) return 1;
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 1;
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }
  if (configData.type === 'transport') return Math.max(1, Number(values.durationDays) || 1);
  if (configData.type === 'appointment') return Math.max(1, Number(values.durationHours) || 1);
  return Math.max(1, Number(values.quantity) || 1);
}

function DynamicField({ field: item, value, onChange }) {
  const className = item.className || '';
  if (item.type === 'textarea') {
    return (
      <label className={`block ${className}`}>
        <span className="block text-sm font-medium text-gray-700 mb-1">{item.label}</span>
        <textarea required={item.required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
      </label>
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{item.label}</span>
      <input
        type={item.type}
        min={item.type === 'date' ? TODAY : item.type === 'number' ? '1' : undefined}
        required={item.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={item.placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
      />
    </label>
  );
}
