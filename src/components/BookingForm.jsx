import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { bookingApi, getAuthData, publicApi, rebookApi } from '../lib/api';
import { amountDueNow, completeBookingPayment, listingCancelHours, listingCancelPenalty } from '../lib/payments';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import DepositPaymentModal from './DepositPaymentModal';
import PhoneNumberField from './PhoneNumberField';
import OptionDetailsModal from './OptionDetailsModal';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';
import { isValidPhoneNumber } from '../lib/phone';
import {
  formatDays,
  formatDisplayDate,
  formatTime,
  optionMaxDate,
  optionMinDate,
  parseOptionAvailability,
  validateOptionSchedule,
} from '../lib/availability';
import AdministrativeLocationFields from './AdministrativeLocationFields';
import { emptyLocationDetails, formatLocationLine, isAdministrativeLocationComplete, normalizeLocationDetails } from '../lib/places';

const TODAY = new Date().toISOString().split('T')[0];
const OUTDATED_RULE = /30%|remaining balance is paid|advance money is not refunded|pay the 30%/i;

const currentBookingRules = (listing, language) => {
  const hours = listingCancelHours(listing);
  const penalty = listingCancelPenalty(listing);
  const refund = 100 - penalty;
  return [
    t('booking.ruleAccurate', language),
    t('booking.rulePayFull', language),
    t('booking.ruleWallet', language),
    t('booking.ruleCancel', language, { hours, refund, penalty }),
    t('booking.ruleAfter', language),
  ];
};

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
  customerLocationDetails: emptyLocationDetails(),
  paymentMethod: 'mobile-money',
  agreeToTerms: false,
  packageType: '',
  quantity: '1',
};

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
  const bookingConfig = useMemo(() => getBookingConfig({ business, service, language }), [business, service, language]);
  const customFields = useMemo(
    () => (business?.bookingForm?.isPublished ? (business.bookingForm.fields || []).filter((item) => item.enabled !== false) : []),
    [business]
  );
  const offers = business?.availabilityTable?.rows || [];
  const selectedOfferRow = offers.find((row) => row.cells?.service === selectedOffer);
  const optionSchedule = useMemo(
    () => parseOptionAvailability(selectedOfferRow, { ...business, ...service }),
    [selectedOfferRow, business, service]
  );
  const dateMin = optionMinDate(optionSchedule, TODAY);
  const dateMax = optionMaxDate(optionSchedule);
  const overnightHours = Boolean(optionSchedule.openTime && optionSchedule.closeTime && optionSchedule.openTime > optionSchedule.closeTime);
  const activePromotion = getVisiblePromotion(business?.promotion);
  const effectiveMode = marketplaceSettings.bookingMode === 'service-level'
    ? business?.bookingMode || service?.bookingMode || 'manual'
    : marketplaceSettings.bookingMode || 'manual';
  const isUnavailable = (service?.status || business?.status) === 'unavailable';
  const displayedRules = useMemo(() => {
    const defaults = currentBookingRules(business || service, language);
    const extras = marketplaceRules.filter((rule) => rule && !OUTDATED_RULE.test(rule) && !defaults.includes(rule));
    return [...defaults, ...extras];
  }, [business, service, marketplaceRules, language]);

  const alignedEndBookingDate = (optionSchedule.sameDayOnly || !optionSchedule.requiresEndDate) && values.bookingDate
    ? values.bookingDate
    : values.endBookingDate;
  const bookingValues = { ...values, endBookingDate: alignedEndBookingDate };

  const updateValue = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'bookingDate' && (optionSchedule.sameDayOnly || !optionSchedule.requiresEndDate)) {
        next.endBookingDate = value;
      }
      return next;
    });
  };

  const updateCustomerLocation = (next) => {
    setValues((prev) => ({
      ...prev,
      customerLocationDetails: normalizeLocationDetails(next),
    }));
  };

  const validate = () => {
    if (!service?._id) return t('booking.notAvailableYet', language);
    if (isUnavailable) return t('booking.currentlyNotAvailable', language);
    if (!selectedOffer) return t('booking.chooseFromTable', language);
    if (!values.fullName.trim()) return t('booking.completeName', language);
    if (!isValidPhoneNumber(values.phone)) return t('booking.validPhone', language);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return t('booking.validEmail', language);
    const scheduleError = validateOptionSchedule(optionSchedule, bookingValues, TODAY);
    if (scheduleError) return scheduleError;
    if (Number(values.numberOfPeople) < 1) return t('booking.peopleMin', language);
    if (Number(values.quantity) < 1) return t('booking.quantityMin', language);
    if (!isAdministrativeLocationComplete(values.customerLocationDetails)) return t('booking.selectCountryCity', language);
    if (!values.agreeToTerms) return t('booking.agreeTerms', language);
    if (useRebook && !rebookId.trim()) return t('booking.enterRebookId', language);
    if (useRebook && verifiedRebookId !== rebookId.trim().toUpperCase()) return t('booking.verifyRebookFirst', language);
    const missingCustom = customFields.find((item) => item.required && (Array.isArray(customValues[item.id]) ? customValues[item.id].length === 0 : !String(customValues[item.id] || '').trim()));
    if (missingCustom) return t('booking.completeField', language, { label: missingCustom.label });
    return '';
  };

  const verifyRebook = async () => {
    if (!rebookId.trim()) {
      setError(t('booking.enterRebookId', language));
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
      const customerLocationDetails = normalizeLocationDetails(values.customerLocationDetails);
      const customerLocationText = formatLocationLine(customerLocationDetails);
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
        endDate: bookingValues.endBookingDate || values.bookingDate,
        endBookingDate: bookingValues.endBookingDate || values.bookingDate,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
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
          endBookingDate: bookingValues.endBookingDate || values.bookingDate,
          startTime: values.startTime || '',
          endTime: values.endTime || '',
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
        <p className="text-gray-600">{t('booking.noBookableService', language)}</p>
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
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label={t('booking.closeForm', language)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {Array.isArray(service.rules) && service.rules.length > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">{t('booking.providerRules', language)}</p>
          <ul className="mt-2 list-disc pl-5">
            {service.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </div>
      )}

      {displayedRules.length > 0 && (
        <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-bold">{t('booking.marketplaceRules', language)}</p>
          <ul className="mt-2 list-disc pl-5">{displayedRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </div>
      )}

      <label className="mb-5 block">
        <span className="text-sm font-bold text-gray-800">{t('booking.chooseService', language)}</span>
        <select disabled={Boolean(quoteResult)} value={selectedOffer} onChange={(event) => setSelectedOffer(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:bg-gray-100" required>
          <option value="">{t('booking.selectFromTable', language)}</option>
          {offers.map((row) => (
            <option key={row.id} value={row.cells?.service}>{row.cells?.service} — {formatRwf(Number(row.cells?.price || 0))}</option>
          ))}
        </select>
      </label>

      {selectedOfferRow && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong>{selectedOfferRow.cells?.service}</strong>
              <p className="mt-1 capitalize">{String(selectedOfferRow.cells?.priceType || t('booking.manualQuote', language)).replace(/-/g, ' ')}</p>
              <p className="mt-1 text-xs">
                {optionSchedule.capacity > 0 ? t('booking.slots', language, { n: optionSchedule.capacity }) : t('booking.capacityOnRequest', language)}
                {' · '}
                {optionSchedule.availableFrom || optionSchedule.availableTo
                  ? `${formatDisplayDate(optionSchedule.availableFrom)} – ${optionSchedule.availableTo ? formatDisplayDate(optionSchedule.availableTo) : t('booking.open', language)}`
                  : t('booking.noDateWindow', language)}
              </p>
            </div>
            <button type="button" onClick={() => setDetailsOpen(true)} className="rounded-lg bg-white px-3 py-2 font-bold text-primary">{t('booking.viewDetails', language)}</button>
          </div>
        </div>
      )}

      {activePromotion && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">{activePromotion.title}: {t('details.savePercent', language, { percent: activePromotion.percent })}</p>
          <p className="mt-1">{t('details.valid', language, { start: formatDate(activePromotion.startAt), end: formatDate(activePromotion.endAt) })}</p>
          {activePromotion.note && <p className="mt-1 text-amber-800">{activePromotion.note}</p>}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FixedInput label={t('booking.fullName', language)} value={values.fullName} onChange={(value) => updateValue('fullName', value)} required />
        <PhoneNumberField label={t('booking.phoneNumber', language)} value={values.phone} onChange={(value) => updateValue('phone', value)} required />
        <FixedInput label={t('booking.email', language)} type="email" value={values.email} onChange={(value) => updateValue('email', value)} required />
        <FixedInput
          label={t('booking.bookingDate', language)}
          type="date"
          min={dateMin}
          max={dateMax || undefined}
          value={values.bookingDate}
          onChange={(value) => updateValue('bookingDate', value)}
          required
          hint={dateHint(optionSchedule, dateMin, dateMax, language)}
        />
        {(optionSchedule.requiresEndDate || optionSchedule.sameDayOnly) && (
          <FixedInput
            label={t('booking.endBookingDate', language)}
            type="date"
            min={values.bookingDate || dateMin}
            max={dateMax || undefined}
            value={alignedEndBookingDate}
            onChange={(value) => updateValue('endBookingDate', value)}
            required={optionSchedule.requiresEndDate}
            hint={optionSchedule.sameDayOnly ? t('booking.sameDayOnly', language) : t('booking.stayInsideDates', language)}
          />
        )}
        <FixedInput
          label={t('booking.startTime', language)}
          type="time"
          min={overnightHours ? undefined : optionSchedule.openTime || undefined}
          max={overnightHours ? undefined : optionSchedule.closeTime || undefined}
          value={values.startTime}
          onChange={(value) => updateValue('startTime', value)}
          required={optionSchedule.requiresTime}
          hint={timeHint(optionSchedule, 'start', language)}
        />
        <FixedInput
          label={t('booking.endTime', language)}
          type="time"
          min={overnightHours ? undefined : optionSchedule.openTime || undefined}
          max={overnightHours ? undefined : optionSchedule.closeTime || undefined}
          value={values.endTime}
          onChange={(value) => updateValue('endTime', value)}
          required={optionSchedule.requiresTime}
          hint={timeHint(optionSchedule, 'end', language)}
        />
        <FixedInput label={t('booking.numberOfPeople', language)} type="number" min="1" value={values.numberOfPeople} onChange={(value) => updateValue('numberOfPeople', value)} required />
        <FixedInput label={t('booking.quantityUnits', language)} type="number" min="1" value={values.quantity} onChange={(value) => updateValue('quantity', value)} required />
        <CustomerLocationFields location={values.customerLocationDetails} onChange={updateCustomerLocation} />
        <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{t('booking.paymentMethod', language)}</span><select value={values.paymentMethod} onChange={(event) => updateValue('paymentMethod', event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3"><option value="mobile-money">{t('booking.mobileMoney', language)}</option><option value="bank">{t('bank', language)}</option></select></label>
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
          {t('booking.useRebook', language)}
        </label>
        {useRebook && <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={rebookId} onChange={(event) => { setRebookId(event.target.value.toUpperCase()); setVerifiedRebookId(''); }} placeholder="RBK-2026-00124" className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono uppercase" />
          <button type="button" disabled={verifyingRebook} onClick={verifyRebook} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{verifyingRebook ? t('booking.verifying', language) : t('booking.verifyId', language)}</button>
        </div>}
        {useRebook && verifiedRebookId && <p className="mt-2 text-xs font-bold text-emerald-700">{t('booking.rebookVerified', language)}</p>}
      </div>

      <label className="mb-5 flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700"><input type="checkbox" checked={values.agreeToTerms} onChange={(event) => updateValue('agreeToTerms', event.target.checked)} required /><AgreeTermsText /></label>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-700">
        {effectiveMode === 'automatic' ? t('booking.automaticHint', language) : t('booking.manualHint', language)}
      </div>

      {isUnavailable && <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">{t('booking.currentlyUnavailable', language)}</div>}
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
          quoteResult ? t('booking.quoteCreated', language) : t('submitBookingRequest', language)
        )}
      </button>

      {quoteResult && <QuoteCard result={quoteResult} paymentMethod={values.paymentMethod} onPaid={(booking) => onSuccess?.(booking)} />}
      {detailsOpen && <OptionDetailsModal row={selectedOfferRow} listing={{ ...business, ...service }} onClose={() => setDetailsOpen(false)} />}
    </form>
  );
}

function AgreeTermsText() {
  const { language } = useLanguage();
  const template = t('booking.agreeFull', language, { terms: '___TERMS___', payments: '___PAYMENTS___' });
  const [before, rest] = template.split('___TERMS___');
  const [mid, after] = (rest || '').split('___PAYMENTS___');
  return (
    <span>
      {before}
      <a href="/terms" className="font-semibold text-primary">{t('termsShort', language)}</a>
      {mid}
      <a href="/payments" className="font-semibold text-primary">{t('payment.paymentsRefunds', language)}</a>
      {after}
    </span>
  );
}

function FixedInput({ label, value, onChange, type = 'text', min, max, required = false, hint }) {
  const { language } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}{required ? '' : <span className="font-normal text-gray-400"> {t('booking.optional', language)}</span>}
      </span>
      <input type={type} min={min} max={max} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function dateHint(option, minDate, maxDate, language) {
  const windowText = maxDate
    ? t('booking.pickDateRange', language, { min: formatDisplayDate(minDate), max: formatDisplayDate(maxDate) })
    : t('booking.pickDateAfter', language, { min: formatDisplayDate(minDate) });
  const days = option.availableDays.length ? ` ${t('booking.availableDays', language, { days: formatDays(option.availableDays) })}` : '';
  if (!option.availableFrom && !option.availableTo) {
    return `${windowText} ${t('booking.noClosingDate', language)}${days}`;
  }
  return `${windowText}${days}`;
}

function timeHint(option, kind, language) {
  const kindLabel = kind === 'start' ? t('booking.startKind', language) : t('booking.endKind', language);
  if (!option.requiresTime) {
    return t('booking.timeOptional', language);
  }
  if (option.openTime && option.closeTime) {
    return t('booking.timeBetween', language, { kind: kindLabel, open: formatTime(option.openTime), close: formatTime(option.closeTime) });
  }
  return t('booking.timeRequired', language, { kind: kindLabel });
}

function CustomerLocationFields({ location, onChange }) {
  const { language } = useLanguage();
  return (
    <fieldset className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-black text-blue-950">{t('booking.customerLocation', language)}</legend>
      <p className="mt-1 text-xs font-semibold text-blue-800">{t('booking.customerLocationHelp', language)}</p>
      <div className="mt-4">
        <AdministrativeLocationFields value={location} onChange={onChange} />
      </div>
    </fieldset>
  );
}

function QuoteCard({ result, paymentMethod, onPaid }) {
  const { language } = useLanguage();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const pay = async (paymentDetails) => {
    const response = await completeBookingPayment(getAuthData()?.token, result.booking._id, { paymentMethod: paymentDetails.paymentMethod || paymentMethod, senderAccount: paymentDetails.senderAccount, email: paymentDetails.email, cname: paymentDetails.cname });
    setPaymentOpen(false);
    onPaid(response.booking);
  };
  const { quote } = result;
  const snapshot = result.booking.priceSnapshot || {};
  const people = quote.people ?? quote.numberOfPeople ?? result.booking.bookingDetails?.numberOfPeople ?? 1;
  const quantity = quote.quantity ?? result.booking.quantity ?? result.booking.bookingDetails?.quantity ?? 1;
  const totalUnits = quote.totalConsumptionUnits ?? result.booking.totalConsumptionUnits ?? Number(people || 1) * Number(quantity || 1);
  return <><aside className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-blue-700">{t('booking.quotePreview', language)}</p><h3 className="mt-1 text-xl font-black">{snapshot.name}</h3><dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between"><dt>{t('booking.priceType', language)}</dt><dd className="capitalize">{String(snapshot.priceType || '').replace(/-/g, ' ')}</dd></div><div className="flex justify-between"><dt>{t('booking.numberOfPeople', language)}</dt><dd>{people}</dd></div><div className="flex justify-between"><dt>{t('booking.quantityUnits', language)}</dt><dd>{quantity}</dd></div><div className="flex justify-between"><dt>{t('booking.totalUnits', language)}</dt><dd>{totalUnits}</dd></div>{quote.duration && <div className="flex justify-between"><dt>{t('booking.bookingDuration', language)}</dt><dd>{quote.duration} {snapshot.durationUnit}</dd></div>}{snapshot.promotionApplied && <><div className="flex justify-between"><dt>{t('booking.originalPrice', language)}</dt><dd className="font-bold">{formatRwf(snapshot.originalPrice)}</dd></div><div className="flex justify-between"><dt>{t('booking.percentOff', language, { title: snapshot.promotionTitle, percent: snapshot.promotionPercent })}</dt><dd className="font-bold text-emerald-700">-{formatRwf(snapshot.discountAmount)}</dd></div><div className="flex justify-between"><dt>{t('booking.finalAfterPromo', language)}</dt><dd className="font-black">{formatRwf(snapshot.finalPrice)}</dd></div></>}<div className="flex justify-between"><dt>{snapshot.promotionApplied ? t('booking.finalTotal', language) : t('booking.totalPrice', language)}</dt><dd className="font-black">{formatRwf(quote.total)}</dd></div><div className="flex justify-between"><dt>{t('booking.payNow', language)}</dt><dd className="font-black text-primary">{formatRwf(amountDueNow(result.booking) || quote.total || quote.deposit)}</dd></div></dl><p className="mt-4 rounded-xl bg-white p-3 text-sm">{quote.reason}</p><button type="button" onClick={() => setPaymentOpen(true)} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-black text-white">{t('booking.payInFull', language)}</button></aside>{paymentOpen && <DepositPaymentModal booking={result.booking} customer={getAuthData()?.user} onClose={() => setPaymentOpen(false)} onConfirm={pay} />}</>;
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

function getBookingConfig({ business, service, language }) {
  const categoryText = [
    service?.category,
    service?.serviceType,
    business?.serviceCategory,
    business?.bookingModel,
    business?.businessType,
    business?.type,
  ].join(' ').toLowerCase();

  if (/(car|motorbike|taxi|bus|transport|charter)/.test(categoryText)) {
    return config('transport', t('booking.types.transport', language), 'day');
  }
  if (/(hotel|resort|homestay|guesthouse|camp|vacation|accommodation)/.test(categoryText)) {
    return config('accommodation', t('booking.types.accommodation', language), 'night');
  }
  if (/(restaurant|bar|coffee|cafe|food|beverage)/.test(categoryText)) {
    return config('food', t('booking.types.food', language), 'booking');
  }
  if (/(event|wedding|conference|venue|entertainment)/.test(categoryText)) {
    return config('event', t('booking.types.event', language), 'event');
  }
  if (/(tour|activity|experience|gear)/.test(categoryText)) {
    return config('activity', t('booking.types.activity', language), 'person');
  }
  if (/(spa|wellness|childcare|appointment)/.test(categoryText)) {
    return config('appointment', t('booking.types.appointment', language), 'hour');
  }
  if (/(shopping|souvenir|craft|market)/.test(categoryText)) {
    return config('shopping', t('booking.types.shopping', language), 'item');
  }
  return config('general', t('booking.types.service', language), 'service');
}

function config(type, label, unitLabel) {
  return { type, label, unitLabel };
}

function DynamicField({ field: item, value, onChange }) {
  const { language } = useLanguage();
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
          <option value="">{t('booking.selectField', language, { label: item.label })}</option>
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
              window.alert(t('booking.maxFileSize', language, { n: item.validation?.maxFileSizeMb || 5 }));
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
