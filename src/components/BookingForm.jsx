import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { bookingApi, getAuthData, publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const initialDetails = {
  destinationPlace: '',
  destinationLocation: '',
  checkIn: '',
  checkOut: '',
  reservationDate: '',
  reservationTime: '',
  pickupLocation: '',
  dropoffLocation: '',
  vehicleType: '',
  durationHours: '1',
  durationDays: '1',
  packageType: '',
  specialRequests: '',
  quantity: '1',
};

export default function BookingForm({ hotelId, onClose, onSuccess }) {
  const [business, setBusiness] = useState(null);
  const [details, setDetails] = useState(initialDetails);
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
        if (found?.location) {
          setDetails((prev) => ({ ...prev, destinationLocation: found.location }));
        }
      } finally {
        setLoadingBusiness(false);
      }
    };

    loadBusiness();
    return subscribeToRealtime(
      [REALTIME_EVENTS.CATALOG_CHANGED, REALTIME_EVENTS.HOTEL_CHANGED, REALTIME_EVENTS.SERVICE_CHANGED, REALTIME_EVENTS.ROOM_CHANGED],
      loadBusiness
    );
  }, [hotelId]);

  const unitCount = useMemo(() => {
    if (!business) return 0;

    if (business.pricingModel === 'per_night' || business.bookingModel === 'rental') {
      if (!details.checkIn || !details.checkOut) return 0;
      const start = new Date(details.checkIn);
      const end = new Date(details.checkOut);
      if (end <= start) return 0;
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }

    if (business.pricingModel === 'per_hour') {
      return Math.max(1, Number(details.durationHours) || 1);
    }

    if (business.pricingModel === 'per_day') {
      return Math.max(1, Number(details.durationDays) || 1);
    }

    if (business.pricingModel === 'per_person') {
      return Math.max(1, Number(details.quantity) || 1);
    }

    return 1;
  }, [business, details]);

  const totalPrice = (business?.basePrice || 0) * unitCount;

  const updateDetail = (key, value) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!details.destinationPlace || !details.destinationLocation) {
      return t('pleaseProvideDestination', language);
    }

    if (business.bookingModel === 'accommodation' || business.bookingModel === 'rental') {
      if (!details.checkIn || !details.checkOut) return t('pleaseSelectDates', language);
      if (unitCount <= 0) return t('checkoutAfterCheckin', language);
    }

    if (business.bookingModel === 'transport') {
      if (!details.pickupLocation || !details.dropoffLocation || !details.reservationDate) {
        return t('pleaseCompleteBookingDetails', language);
      }
    }

    if (['restaurant', 'event', 'activity', 'appointment', 'childcare'].includes(business.bookingModel)) {
      if (!details.reservationDate) return t('pleaseSelectReservationDate', language);
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
      const response = await bookingApi.requestBooking(authData.token, {
        hotelId: business?.id || null,
        destinationPlace: details.destinationPlace,
        destinationLocation: details.destinationLocation,
        checkIn: details.checkIn || null,
        checkOut: details.checkOut || null,
        guests: Number(details.quantity) || 1,
        quantity: unitCount || 1,
        totalPrice,
        reservationDate: details.reservationDate || null,
        reservationTime: details.reservationTime,
        pickupLocation: details.pickupLocation,
        dropoffLocation: details.dropoffLocation,
        vehicleType: details.vehicleType,
        durationHours: Number(details.durationHours) || 0,
        durationDays: Number(details.durationDays) || 0,
        packageType: details.packageType,
        specialRequests: details.specialRequests,
        bookingDetails: details,
      });

      onSuccess?.(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingBusiness) return <LoadingSpinner />;

  if (!business) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
        <p className="text-gray-600">{t('hotelNotAvailable', language)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{business.name}</h2>
          <p className="text-gray-600">
            {business.location} - {business.bookingModel}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <TextField label={t('placeToVisit', language)} value={details.destinationPlace} onChange={(value) => updateDetail('destinationPlace', value)} placeholder={t('placeToVisitPlaceholder', language)} className="col-span-2" />
        <TextField label={t('destinationLocation', language)} value={details.destinationLocation} onChange={(value) => updateDetail('destinationLocation', value)} placeholder={t('destinationLocationPlaceholder', language)} className="col-span-2" />

        {['accommodation', 'rental'].includes(business.bookingModel) && (
          <>
            <DateField label={t('checkIn', language)} value={details.checkIn} onChange={(value) => updateDetail('checkIn', value)} />
            <DateField label={t('checkOut', language)} value={details.checkOut} onChange={(value) => updateDetail('checkOut', value)} min={details.checkIn} />
          </>
        )}

        {business.bookingModel === 'transport' && (
          <>
            <TextField label={t('pickupLocation', language)} value={details.pickupLocation} onChange={(value) => updateDetail('pickupLocation', value)} />
            <TextField label={t('dropoffLocation', language)} value={details.dropoffLocation} onChange={(value) => updateDetail('dropoffLocation', value)} />
            <DateField label={t('tripDate', language)} value={details.reservationDate} onChange={(value) => updateDetail('reservationDate', value)} />
            <TextField label={t('vehicleType', language)} value={details.vehicleType} onChange={(value) => updateDetail('vehicleType', value)} />
            {business.pricingModel === 'per_day' && (
              <NumberField label={t('durationDays', language)} value={details.durationDays} onChange={(value) => updateDetail('durationDays', value)} />
            )}
          </>
        )}

        {business.bookingModel === 'restaurant' && (
          <>
            <DateField label={t('reservationDate', language)} value={details.reservationDate} onChange={(value) => updateDetail('reservationDate', value)} />
            <TimeField label={t('reservationTime', language)} value={details.reservationTime} onChange={(value) => updateDetail('reservationTime', value)} />
          </>
        )}

        {business.bookingModel === 'event' && (
          <>
            <DateField label={t('eventDate', language)} value={details.reservationDate} onChange={(value) => updateDetail('reservationDate', value)} />
            <NumberField label={t('durationHours', language)} value={details.durationHours} onChange={(value) => updateDetail('durationHours', value)} />
          </>
        )}

        {business.bookingModel === 'activity' && (
          <>
            <DateField label={t('activityDate', language)} value={details.reservationDate} onChange={(value) => updateDetail('reservationDate', value)} />
            <TextField label={t('packageType', language)} value={details.packageType} onChange={(value) => updateDetail('packageType', value)} />
          </>
        )}

        {['appointment', 'childcare'].includes(business.bookingModel) && (
          <>
            <DateField label={t('appointmentDate', language)} value={details.reservationDate} onChange={(value) => updateDetail('reservationDate', value)} />
            <TimeField label={t('appointmentTime', language)} value={details.reservationTime} onChange={(value) => updateDetail('reservationTime', value)} />
            <NumberField label={t('durationHours', language)} value={details.durationHours} onChange={(value) => updateDetail('durationHours', value)} />
          </>
        )}

        <NumberField
          label={getQuantityLabel(business.bookingModel, language)}
          value={details.quantity}
          onChange={(value) => updateDetail('quantity', value)}
          className="col-span-2"
        />
        <TextArea label={t('specialRequests', language)} value={details.specialRequests} onChange={(value) => updateDetail('specialRequests', value)} />
      </div>

      {unitCount > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              {formatRwf(business.basePrice)} x {unitCount} {t(business.pricingUnit || 'service', language)}
            </span>
            <span className="font-medium">{formatRwf(totalPrice)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
            <span className="font-bold text-gray-900">{t('estimatedTotal', language)}</span>
            <span className="font-bold text-primary text-lg">{formatRwf(totalPrice)}</span>
          </div>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
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

function getQuantityLabel(bookingModel, language) {
  if (bookingModel === 'restaurant') return t('tableSize', language);
  if (bookingModel === 'transport') return t('passengers', language);
  if (bookingModel === 'event') return t('attendeeCount', language);
  if (bookingModel === 'activity') return t('participantCount', language);
  if (bookingModel === 'childcare') return t('childCount', language);
  return t('guests', language);
}

function TextField({ label, value, onChange, placeholder = '', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
    </label>
  );
}

function DateField({ label, value, onChange, min = new Date().toISOString().split('T')[0] }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} min={min || new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
    </label>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
    </label>
  );
}

function NumberField({ label, value, onChange, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input type="number" min="1" value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block col-span-2">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
    </label>
  );
}
