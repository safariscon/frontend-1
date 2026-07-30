import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { bookingApi, getAuthData, publicApi, rebookApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import DepositPaymentModal from './DepositPaymentModal';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';

const TODAY = new Date().toISOString().split('T')[0];

const BASE_VALUES = {
  destinationPlace: '',
  destinationLocation: '',
  vehicleType: '',
  phone: '',
  fullName: '',
  email: '',
  bookingDate: '',
  endBookingDate: '',
  startTime: '',
  endTime: '',
  numberOfPeople: '1',
  customerLocation: '',
  customerLocationDetails: {
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
  },
  paymentMethod: 'mobile-money',
  agreeToTerms: false,
  packageType: '',
  quantity: '1',
};

const RWANDA_PROVINCES = ['Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'];

const RWANDA_DISTRICTS = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi', 'Gisagara', 'Huye', 'Kamonyi', 'Karongi',
  'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga', 'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare', 'Nyamagabe',
  'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu', 'Ruhango', 'Rulindo', 'Rusizi', 'Rutsiro', 'Rwamagana',
];

export default function BookingForm({ hotelId, onClose, onSuccess }) {
  const [searchParams] = useSearchParams();
  const initialRebookId = searchParams.get('rebookId') || '';
  const [business, setBusiness] = useState(null);
  const [values, setValues] = useState(BASE_VALUES);
  const [customValues, setCustomValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState('');
  const [marketplaceRules, setMarketplaceRules] = useState([]);
  const [marketplaceSettings, setMarketplaceSettings] = useState({ bookingMode: 'manual' });
  const [quoteResult, setQuoteResult] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [useRebook, setUseRebook] = useState(Boolean(initialRebookId));
  const [rebookId, setRebookId] = useState(initialRebookId);
  const [verifiedRebookId, setVerifiedRebookId] = useState('');
  const [verifyingRebook, setVerifyingRebook] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const [response, settingsResponse] = await Promise.all([
          publicApi.getHotels(),
          publicApi.getMarketplaceSettings().catch(() => ({ settings: {} })),
        ]);
        setMarketplaceRules(settingsResponse.settings?.bookingRules || []);
        setMarketplaceSettings(settingsResponse.settings || { bookingMode: 'manual' });
        const businesses = normalizeHotels(response.businesses || response.hotels || []);
        const found = businesses.find((item) => String(item.id) === String(hotelId));
          setBusiness(found || null);
          if (found) {
          const service = getSelectedService(found);
          const customDefaults = {};
          const fields = found.bookingForm?.isPublished ? found.bookingForm.fields || [] : [];
          fields.forEach((fieldItem) => {
            customDefaults[fieldItem.id] = fieldItem.type === 'checkbox' ? [] : fieldItem.defaultValue || '';
          });
            setCustomValues(customDefaults);
            const firstOffer = found.availabilityTable?.rows?.[0]?.cells?.service || '';
            setSelectedOffer(firstOffer);
          setValues((prev) => ({
            ...prev,
            destinationPlace: service?.title || service?.name || found.name || '',
            destinationLocation: service?.location || found.location || '',
            vehicleType: service?.title || service?.name || found.name || '',
            email: getAuthData()?.user?.email || '',
            fullName: getAuthData()?.user?.name || '',
            phone: getAuthData()?.user?.phone || '',
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
  const customFields = useMemo(
    () => (business?.bookingForm?.isPublished ? (business.bookingForm.fields || []).filter((item) => item.enabled !== false) : []),
    [business]
  );
  const offers = business?.availabilityTable?.rows || [];
  const selectedOfferRow = offers.find((row) => row.cells?.service === selectedOffer);
  const activePromotion = getVisiblePromotion(business?.promotion);
  const effectiveMode = marketplaceSettings.bookingMode === 'service-level'
    ? business?.bookingMode || service?.bookingMode || 'manual'
    : marketplaceSettings.bookingMode || 'manual';
  const isUnavailable = (service?.status || business?.status) === 'unavailable';

  const updateValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const updateCustomerLocation = (key, value) => {
    setValues((prev) => ({
      ...prev,
      customerLocationDetails: {
        ...prev.customerLocationDetails,
        [key]: value,
      },
    }));
  };

  const validate = () => {
    if (!service?._id) return 'This service is not available for booking yet.';
    if (isUnavailable) return 'This service is currently not available.';
    if (!selectedOffer) return 'Please choose a service from the price table.';
    if (!values.fullName.trim()) return 'Please complete Full name.';
    if (!/^\+?[0-9][0-9\s-]{7,18}$/.test(values.phone)) return 'Please enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return 'Please enter a valid email address.';
    if (!values.bookingDate) return 'Please choose a booking date.';
    if (!values.endBookingDate) return 'Please choose an end booking date.';
    if (new Date(values.endBookingDate) < new Date(values.bookingDate)) return 'End booking date cannot be before the booking date.';
    if (!values.startTime) return 'Please choose a start time.';
    if (!values.endTime) return 'Please choose an end time.';
    if (Number(values.numberOfPeople) < 1) return 'Number of people must be at least 1.';
    if (Number(values.quantity) < 1) return 'Quantity / units must be at least 1.';
    const customerLocationFields = [
      ['province', 'Province'],
      ['district', 'District'],
      ['sector', 'Sector'],
      ['cell', 'Cell'],
      ['village', 'Village'],
    ];
    const missingLocation = customerLocationFields.find(([key]) => !String(values.customerLocationDetails?.[key] || '').trim());
    if (missingLocation) return `Please complete customer ${missingLocation[1]}.`;
    if (!values.agreeToTerms) return 'Please agree to the terms and conditions.';
    if (useRebook && !rebookId.trim()) return 'Enter your Re-book ID.';
    if (useRebook && verifiedRebookId !== rebookId.trim().toUpperCase()) return 'Verify the Re-book ID before submitting.';
    const missingCustom = customFields.find((item) => item.required && (Array.isArray(customValues[item.id]) ? customValues[item.id].length === 0 : !String(customValues[item.id] || '').trim()));
    if (missingCustom) return `Please complete ${missingCustom.label}.`;
    return '';
  };

  const verifyRebook = async () => {
    if (!rebookId.trim()) {
      setError('Enter your Re-book ID.');
      return;
    }
    setVerifyingRebook(true);
    setError('');
    try {
      await rebookApi.verifyId(getAuthData()?.token, rebookId.trim(), service?._id);
      setVerifiedRebookId(rebookId.trim().toUpperCase());
    } catch (requestError) {
      setVerifiedRebookId('');
      setError(requestError.message);
    } finally {
      setVerifyingRebook(false);
    }
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
      const customerLocationDetails = {
        province: values.customerLocationDetails.province.trim(),
        district: values.customerLocationDetails.district.trim(),
        sector: values.customerLocationDetails.sector.trim(),
        cell: values.customerLocationDetails.cell.trim(),
        village: values.customerLocationDetails.village.trim(),
      };
      const customerLocationText = [
        customerLocationDetails.village,
        customerLocationDetails.cell,
        customerLocationDetails.sector,
        customerLocationDetails.district,
        customerLocationDetails.province,
        'Rwanda',
      ].filter(Boolean).join(', ');
      const numberOfPeople = Math.max(1, Number(values.numberOfPeople) || 1);
      const quantity = Math.max(1, Number(values.quantity) || 1);
      const response = await bookingApi.bookService(authData.token, {
        serviceId: service._id,
        rebookId: useRebook ? verifiedRebookId : undefined,
        numberOfPeople,
        quantity,
        totalConsumptionUnits: numberOfPeople * quantity,
        totalPrice: 0,
        startDate: values.bookingDate,
        endDate: values.endBookingDate,
        endBookingDate: values.endBookingDate,
        startTime: values.startTime,
        endTime: values.endTime,
        destinationPlace: values.destinationPlace,
        destinationLocation: values.destinationLocation,
        vehicleType: values.vehicleType,
        packageType: values.packageType,
        customerLocation: customerLocationText,
        customerLocationDetails,
        bookingDetails: {
          customerLocationDetails,
          serviceName: service.title || service.name,
          requestedService: selectedOffer,
          selectedOptionId: selectedOfferRow?.id,
          listedPriceRwf: selectedOfferRow?.cells?.price || '',
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          bookingDate: values.bookingDate,
          endBookingDate: values.endBookingDate,
          startTime: values.startTime,
          endTime: values.endTime,
          numberOfPeople,
          quantity,
          totalConsumptionUnits: numberOfPeople * quantity,
          customerLocation: customerLocationText,
          paymentMethod: values.paymentMethod,
          serviceCategory: service.category || business?.serviceCategory,
          bookingType: bookingConfig.type,
          providerRules: Array.isArray(service.rules) ? service.rules : [],
          customFormTitle: business?.bookingForm?.title || '',
          customResponses: customFields.map((fieldItem) => ({
            fieldId: fieldItem.id,
            label: fieldItem.label,
            type: fieldItem.type,
            value: fieldItem.type === 'file' && customValues[fieldItem.id]?.name
              ? { fileName: customValues[fieldItem.id].name, size: customValues[fieldItem.id].size, type: customValues[fieldItem.id].type }
              : customValues[fieldItem.id],
          })),
        },
      });

      trackAnalytics(ANALYTICS_EVENTS.BOOKING_SUBMITTED, {
        serviceId: service._id,
        bookingId: response.booking?._id,
      });

      if (response.quote) setQuoteResult({ booking: response.booking, quote: response.quote });
      else onSuccess?.(response.booking);
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

      {marketplaceRules.length > 0 && (
        <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-bold">SafarisCon booking rules</p>
          <ul className="mt-2 list-disc pl-5">{marketplaceRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </div>
      )}

      <label className="mb-5 block">
        <span className="text-sm font-bold text-gray-800">Choose a service *</span>
        <select disabled={Boolean(quoteResult)} value={selectedOffer} onChange={(event) => setSelectedOffer(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:bg-gray-100" required>
          <option value="">Select from the seller's table</option>
          {offers.map((row) => (
            <option key={row.id} value={row.cells?.service}>{row.cells?.service} — {formatRwf(Number(row.cells?.price || 0))}</option>
          ))}
        </select>
      </label>

      {selectedOfferRow && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex items-center justify-between gap-3">
            <div><strong>{selectedOfferRow.cells?.service}</strong><p className="mt-1 capitalize">{String(selectedOfferRow.cells?.priceType || 'Manual quote').replace(/-/g, ' ')}</p></div>
            <button type="button" onClick={() => setDetailsOpen(true)} className="rounded-lg bg-white px-3 py-2 font-bold text-primary">View details</button>
          </div>
        </div>
      )}

      {activePromotion && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">{activePromotion.title}: Save {activePromotion.percent}% on this service.</p>
          <p className="mt-1">Valid from {formatDate(activePromotion.startAt)} to {formatDate(activePromotion.endAt)}.</p>
          {activePromotion.note && <p className="mt-1 text-amber-800">{activePromotion.note}</p>}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FixedInput label="Full name" value={values.fullName} onChange={(value) => updateValue('fullName', value)} required />
        <FixedInput label="Phone number" type="tel" value={values.phone} onChange={(value) => updateValue('phone', value)} required />
        <FixedInput label="Email" type="email" value={values.email} onChange={(value) => updateValue('email', value)} required />
        <FixedInput label="Booking date" type="date" min={TODAY} value={values.bookingDate} onChange={(value) => updateValue('bookingDate', value)} required />
        <FixedInput label="End booking date" type="date" min={values.bookingDate || TODAY} value={values.endBookingDate} onChange={(value) => updateValue('endBookingDate', value)} required />
        <FixedInput label="Start time" type="time" value={values.startTime} onChange={(value) => updateValue('startTime', value)} required />
        <FixedInput label="End time" type="time" value={values.endTime} onChange={(value) => updateValue('endTime', value)} required />
        <FixedInput label="Number of people" type="number" min="1" value={values.numberOfPeople} onChange={(value) => updateValue('numberOfPeople', value)} required />
        <FixedInput label="Quantity / units" type="number" min="1" value={values.quantity} onChange={(value) => updateValue('quantity', value)} required />
        <CustomerLocationFields location={values.customerLocationDetails} onChange={updateCustomerLocation} />
        <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Payment method</span><select value={values.paymentMethod} onChange={(event) => updateValue('paymentMethod', event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3"><option value="mobile-money">Mobile Money</option><option value="bank">Bank</option></select></label>
      </div>

      {customFields.length > 0 && <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
        {customFields.map((item) => (
          <DynamicField
            key={item.id || item.name}
            field={item}
            value={customFields.length ? customValues[item.id] : values[item.name] || ''}
            onChange={(value) => customFields.length ? setCustomValues((prev) => ({ ...prev, [item.id]: value })) : updateValue(item.name, value)}
          />
        ))}
      </div>}

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <label className="flex items-center gap-3 text-sm font-bold text-blue-950">
          <input type="checkbox" checked={useRebook} onChange={(event) => { setUseRebook(event.target.checked); setVerifiedRebookId(''); setError(''); }} />
          Use a one-time Re-book ID
        </label>
        {useRebook && <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={rebookId} onChange={(event) => { setRebookId(event.target.value.toUpperCase()); setVerifiedRebookId(''); }} placeholder="RBK-2026-00124" className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono uppercase" />
          <button type="button" disabled={verifyingRebook} onClick={verifyRebook} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{verifyingRebook ? 'Verifying...' : 'Verify ID'}</button>
        </div>}
        {useRebook && verifiedRebookId && <p className="mt-2 text-xs font-bold text-emerald-700">Re-book ID verified. It will be marked used only after this booking is created.</p>}
      </div>

      <label className="mb-5 flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700"><input type="checkbox" checked={values.agreeToTerms} onChange={(event) => updateValue('agreeToTerms', event.target.checked)} required /><span>I agree to the terms and conditions and understand that provider details unlock only after successful deposit payment.</span></label>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-700">
        {effectiveMode === 'automatic' ? 'Automatic booking: the backend validates availability and calculates the exact RWF quote. You can pay the 30% deposit immediately.' : "Manual booking: admin reviews your request and confirms the exact RWF price before the 30% deposit is available."}
      </div>

      {isUnavailable && <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">This service is currently not available for booking.</div>}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading || isUnavailable || Boolean(quoteResult)}
        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            {t('sending', language)}
          </>
        ) : (
          quoteResult ? 'Quote created' : t('submitBookingRequest', language)
        )}
      </button>

      {quoteResult && <QuoteCard result={quoteResult} paymentMethod={values.paymentMethod} onPaid={(booking) => onSuccess?.(booking)} />}
      {detailsOpen && <DetailsModal row={selectedOfferRow} onClose={() => setDetailsOpen(false)} />}
    </form>
  );
}

function FixedInput({ label, value, onChange, type = 'text', min, required = false }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span><input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function CustomerLocationFields({ location, onChange }) {
  return (
    <fieldset className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-black text-blue-950">Customer location</legend>
      <p className="mt-1 text-xs font-semibold text-blue-800">Enter the customer address so the provider can know the exact service location before confirming the booking.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Province *</span>
          <select required value={location.province} onChange={(event) => onChange('province', event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3">
            <option value="">Select province</option>
            {RWANDA_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">District *</span>
          <select required value={location.district} onChange={(event) => onChange('district', event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3">
            <option value="">Select district</option>
            {RWANDA_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
        </label>
        <FixedInput label="Sector" value={location.sector} onChange={(value) => onChange('sector', value)} required />
        <FixedInput label="Cell" value={location.cell} onChange={(value) => onChange('cell', value)} required />
        <FixedInput label="Village" value={location.village} onChange={(value) => onChange('village', value)} required />
      </div>
    </fieldset>
  );
}

function QuoteCard({ result, paymentMethod, onPaid }) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const pay = async (paymentDetails) => {
    const response = await bookingApi.payBooking(getAuthData()?.token, result.booking._id, { paymentMethod: paymentDetails.paymentMethod || paymentMethod, senderAccount: paymentDetails.senderAccount });
    setPaymentOpen(false);
    onPaid(response.booking);
  };
  const { quote } = result;
  const snapshot = result.booking.priceSnapshot || {};
  const people = quote.people ?? quote.numberOfPeople ?? result.booking.bookingDetails?.numberOfPeople ?? 1;
  const quantity = quote.quantity ?? result.booking.quantity ?? result.booking.bookingDetails?.quantity ?? 1;
  const totalUnits = quote.totalConsumptionUnits ?? result.booking.totalConsumptionUnits ?? Number(people || 1) * Number(quantity || 1);
  return <><aside className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-blue-700">Automatic quote preview</p><h3 className="mt-1 text-xl font-black">{snapshot.name}</h3><dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between"><dt>Price type</dt><dd className="capitalize">{String(snapshot.priceType || '').replace(/-/g, ' ')}</dd></div><div className="flex justify-between"><dt>Number of people</dt><dd>{people}</dd></div><div className="flex justify-between"><dt>Quantity / units</dt><dd>{quantity}</dd></div><div className="flex justify-between"><dt>Total consumption units</dt><dd>{totalUnits}</dd></div>{quote.duration && <div className="flex justify-between"><dt>Booking duration</dt><dd>{quote.duration} {snapshot.durationUnit}</dd></div>}{snapshot.promotionApplied && <><div className="flex justify-between"><dt>Original price</dt><dd className="font-bold">{formatRwf(snapshot.originalPrice)}</dd></div><div className="flex justify-between"><dt>{snapshot.promotionTitle} ({snapshot.promotionPercent}% off)</dt><dd className="font-bold text-emerald-700">-{formatRwf(snapshot.discountAmount)}</dd></div><div className="flex justify-between"><dt>Final price after promotion</dt><dd className="font-black">{formatRwf(snapshot.finalPrice)}</dd></div></>}<div className="flex justify-between"><dt>{snapshot.promotionApplied ? 'Final total' : 'Total price'}</dt><dd className="font-black">{formatRwf(quote.total)}</dd></div><div className="flex justify-between"><dt>Deposit required (30%)</dt><dd className="font-black text-primary">{formatRwf(quote.deposit)}</dd></div><div className="flex justify-between"><dt>Remaining balance</dt><dd className="font-bold">{formatRwf(quote.remaining)}</dd></div></dl><p className="mt-4 rounded-xl bg-white p-3 text-sm">{quote.reason}</p><button type="button" onClick={() => setPaymentOpen(true)} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-black text-white">Pay deposit</button></aside>{paymentOpen && <DepositPaymentModal booking={result.booking} customer={getAuthData()?.user} onClose={() => setPaymentOpen(false)} onConfirm={pay} />}</>;
}

function DetailsModal({ row, onClose }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Option details & amenities</p><h3 className="mt-1 text-xl font-black">{row?.cells?.service}</h3></div><button type="button" onClick={onClose} className="text-2xl text-gray-500">×</button></div><p className="mt-4 whitespace-pre-wrap text-gray-700">{row?.cells?.details || 'The seller has not added extra amenities for this option.'}</p><button type="button" onClick={onClose} className="mt-5 rounded-xl bg-primary px-4 py-2 font-bold text-white">Close</button></div></div>;
}

function getVisiblePromotion(promotion) {
  if (!promotion?.enabled || !promotion.title) return null;
  const percent = Number(promotion.percent || promotion.promotionPercent || 0);
  const startAt = new Date(promotion.startAt);
  const endAt = new Date(promotion.endAt);
  const now = new Date();
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt || startAt > now || endAt < now) return null;
  return { title: promotion.title, percent, note: promotion.note || promotion.description || '', startAt, endAt };
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
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
    return config('transport', 'transport', 'day');
  }
  if (/(hotel|resort|homestay|guesthouse|camp|vacation|accommodation)/.test(categoryText)) {
    return config('accommodation', 'accommodation', 'night');
  }
  if (/(restaurant|bar|coffee|cafe|food|beverage)/.test(categoryText)) {
    return config('food', 'food', 'booking');
  }
  if (/(event|wedding|conference|venue|entertainment)/.test(categoryText)) {
    return config('event', 'event', 'event');
  }
  if (/(tour|activity|experience|gear)/.test(categoryText)) {
    return config('activity', 'activity', 'person');
  }
  if (/(spa|wellness|childcare|appointment)/.test(categoryText)) {
    return config('appointment', 'appointment', 'hour');
  }
  if (/(shopping|souvenir|craft|market)/.test(categoryText)) {
    return config('shopping', 'shopping', 'item');
  }
  return config('general', 'service', 'service');
}

function config(type, label, unitLabel) {
  return { type, label, unitLabel };
}

function DynamicField({ field: item, value, onChange }) {
  const fieldName = item.name || item.id;
  const className = item.className || '';
  const type = item.type === 'tel' ? 'tel' : item.type;
  if (item.type === 'select') {
    return (
      <label className={`block ${className}`}>
        <span className="block text-sm font-medium text-gray-700 mb-1">{item.label}</span>
        <select
          required={item.required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Select {item.label}</option>
          {item.options.map((option) => (
            <option key={option} value={option.toLowerCase() === 'yes' ? 'yes' : option.toLowerCase() === 'no' ? 'no' : option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (item.type === 'radio') {
    return (
      <fieldset className={`block ${className}`}>
        <legend className="block text-sm font-medium text-gray-700 mb-1">{item.label}</legend>
        <ChoiceList item={item} value={value} onChange={onChange} mode="radio" />
      </fieldset>
    );
  }

  if (item.type === 'checkbox') {
    return (
      <fieldset className={`block ${className}`}>
        <legend className="block text-sm font-medium text-gray-700 mb-1">{item.label}</legend>
        <ChoiceList item={item} value={Array.isArray(value) ? value : []} onChange={onChange} mode="checkbox" />
      </fieldset>
    );
  }

  if (item.type === 'textarea') {
    return (
      <label className={`block ${className}`}>
        <span className="block text-sm font-medium text-gray-700 mb-1">{item.label}</span>
        <textarea required={item.required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary" />
      </label>
    );
  }
  if (item.type === 'file') {
    return (
      <label className={`block ${className}`}>
        <span className="block text-sm font-medium text-gray-700 mb-1">{item.label}</span>
        {item.helpText && <span className="block text-xs text-gray-500 mb-1">{item.helpText}</span>}
        <input
          type="file"
          required={item.required}
          accept={item.validation?.acceptedFileTypes || undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return onChange('');
            const maxBytes = Number(item.validation?.maxFileSizeMb || 5) * 1024 * 1024;
            if (file.size > maxBytes) {
              event.target.value = '';
              window.alert(`Maximum file size is ${item.validation?.maxFileSizeMb || 5} MB.`);
              return;
            }
            onChange(file);
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </label>
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{item.label}</span>
      <input
        name={fieldName}
        type={type}
        min={item.type === 'date' ? TODAY : item.type === 'number' ? item.validation?.min || '1' : undefined}
        max={item.type === 'number' ? item.validation?.max || undefined : undefined}
        pattern={item.validation?.pattern || undefined}
        required={item.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={item.placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
      />
    </label>
  );
}

function ChoiceList({ item, value, onChange, mode }) {
  return <div className="space-y-2 rounded-xl border border-gray-200 p-3">{(item.options || []).map((option) => <label key={option} className="flex items-center gap-2 text-sm text-gray-700"><input type={mode} checked={mode === 'checkbox' ? value.includes(option) : value === option} onChange={(event) => {
    if (mode === 'radio') return onChange(option);
    onChange(event.target.checked ? [...value, option] : value.filter((entry) => entry !== option));
  }} />{option}</label>)}</div>;
}
