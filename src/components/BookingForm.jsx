import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import SchemaFields from './SchemaFields';
import { bookingApi, categoriesApi, getAuthData, publicApi, rebookApi } from '../lib/api';
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
import CustomerLocationPicker from './CustomerLocationPicker';
import { emptyLocationDetails, formatLocationLine, isCustomerMapLocationComplete, normalizeLocationDetails } from '../lib/places';
import { emptyListingAttributes, validateSchemaValues, categorySupportsOptions } from '../lib/serviceSchema';
import { MAX_UPLOAD_FILE_SIZE_MB } from '../lib/uploads';
import { resolveCustomerBookingRules } from '../lib/bookingRules';

const TODAY = new Date().toISOString().split('T')[0];

const clampBookingDate = (minDate, maxDate) => {
  if (TODAY >= minDate && (!maxDate || TODAY <= maxDate)) return TODAY;
  return minDate || TODAY;
};

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
  bookingDate: TODAY,
  endBookingDate: TODAY,
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
  const [bookingAttributes, setBookingAttributes] = useState({});
  const [bookingAttributeErrors, setBookingAttributeErrors] = useState({});
  const [liveBookingSchema, setLiveBookingSchema] = useState([]);
  const [liveSchemaLoaded, setLiveSchemaLoaded] = useState(false);
  const [consumptionPolicy, setConsumptionPolicy] = useState({
    requireConsumptionStartDate: true,
    requireConsumptionEndDate: false,
    requireConsumptionStartTime: false,
    requireConsumptionEndTime: false,
  });
  const [publicAvailability, setPublicAvailability] = useState(null);
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
      setLiveSchemaLoaded(false);
      setLiveBookingSchema([]);
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
            const snapshotSchema = found.schemaSnapshot?.bookingFieldSchema
              || service?.schemaSnapshot?.bookingFieldSchema
              || [];
            setBookingAttributes(emptyListingAttributes(snapshotSchema));
            const supportsOptions = categorySupportsOptions(
              found.supportsOptions,
              found.schemaSnapshot?.supportsOptions,
              found.category?.supportsOptions,
              service?.supportsOptions
            );
            const firstOffer = supportsOptions
              ? (found.availabilityTable?.rows?.[0]?.cells?.service || '')
              : (service?.title || service?.name || found.name || 'Service');
            setSelectedOffer(firstOffer);
          setValues((prev) => ({
            ...prev,
            destinationPlace: service?.title || service?.name || found.name || '',
            destinationLocation: service?.location || found.location || '',
            vehicleType: service?.title || service?.name || found.name || '',
            email: getAuthData()?.user?.email || '',
            fullName: getAuthData()?.user?.name || '',
            phone: getAuthData()?.user?.phone || '',
            bookingDate: prev.bookingDate || TODAY,
            endBookingDate: prev.endBookingDate || prev.bookingDate || TODAY,
          }));
          // Always load the live category booking schema so the form matches backend
          // validation (category config is the source of truth, not a stale snapshot).
          const categoryKey = found.categoryId || found.category?._id || found.categorySlug || found.type;
          if (categoryKey) {
            setLiveSchemaLoaded(false);
            categoriesApi.get(categoryKey).then((resp) => {
              const schema = resp.category?.bookingFieldSchema || [];
              setLiveBookingSchema(schema);
              setBookingAttributes(emptyListingAttributes(schema));
            }).catch(() => {
              setLiveBookingSchema([]);
            }).finally(() => {
              setLiveSchemaLoaded(true);
            });
          } else {
            setLiveBookingSchema([]);
            setLiveSchemaLoaded(true);
          }
        } else {
          setLiveBookingSchema([]);
          setLiveSchemaLoaded(true);
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
  const bookingFieldSchema = useMemo(() => {
    // Once the live category is loaded, it wins — even when empty (no extra booking fields).
    if (liveSchemaLoaded) return liveBookingSchema;
    return business?.schemaSnapshot?.bookingFieldSchema
      || service?.schemaSnapshot?.bookingFieldSchema
      || liveBookingSchema
      || [];
  }, [business, service, liveBookingSchema, liveSchemaLoaded]);
  const customFields = useMemo(
    () => (
      bookingFieldSchema.length
        ? []
        : (business?.bookingForm?.isPublished ? (business.bookingForm.fields || []).filter((item) => item.enabled !== false) : [])
    ),
    [business, bookingFieldSchema]
  );
  const supportsOptions = categorySupportsOptions(
    business?.supportsOptions,
    business?.schemaSnapshot?.supportsOptions,
    business?.category?.supportsOptions,
    service?.supportsOptions,
    service?.schemaSnapshot?.supportsOptions,
    service?.category?.supportsOptions
  );
  const basePrice = Number(business?.basePrice ?? service?.basePrice ?? business?.price ?? service?.pricing?.amount ?? 0);
  const offers = supportsOptions ? (business?.availabilityTable?.rows || []) : [];
  const selectedOfferRow = supportsOptions
    ? offers.find((row) => row.cells?.service === selectedOffer)
    : null;

  useEffect(() => {
    if (!hotelId || !business) return undefined;
    const optionId = supportsOptions
      ? (selectedOfferRow?.optionId || selectedOfferRow?.id || null)
      : null;
    let cancelled = false;
    publicApi.getServiceAvailability(hotelId, optionId).then((response) => {
      if (cancelled) return;
      setPublicAvailability(response.availability || null);
      if (response.consumptionPolicy) setConsumptionPolicy(response.consumptionPolicy);
    }).catch(() => {
      if (!cancelled) setPublicAvailability(null);
    });
    return () => { cancelled = true; };
  }, [hotelId, business, supportsOptions, selectedOffer, selectedOfferRow?.optionId, selectedOfferRow?.id]);

  const optionSchedule = useMemo(
    () => parseOptionAvailability(
      supportsOptions ? selectedOfferRow : {},
      { ...business, ...service, availableDays: supportsOptions ? undefined : '' }
    ),
    [selectedOfferRow, business, service, supportsOptions]
  );
  const dateMin = optionMinDate(optionSchedule, TODAY);
  const dateMax = optionMaxDate(optionSchedule);
  const overnightHours = Boolean(optionSchedule.openTime && optionSchedule.closeTime && optionSchedule.openTime > optionSchedule.closeTime);
  const preferredBookingDate = clampBookingDate(dateMin, dateMax);
  const bookingDateValue = (
    values.bookingDate
    && values.bookingDate >= dateMin
    && (!dateMax || values.bookingDate <= dateMax)
  ) ? values.bookingDate : preferredBookingDate;
  const activePromotion = getVisiblePromotion(business?.promotion);
  const effectiveMode = marketplaceSettings.bookingMode === 'service-level'
    ? business?.bookingMode || service?.bookingMode || 'manual'
    : marketplaceSettings.bookingMode || 'manual';
  const isUnavailable = (service?.status || business?.status) === 'unavailable';
  const displayedRules = useMemo(() => (
    resolveCustomerBookingRules({
      marketplaceRules,
      listing: business || service,
      fallbackRules: currentBookingRules(business || service, language),
    })
  ), [business, service, marketplaceRules, language]);

  const alignedEndBookingDate = (optionSchedule.sameDayOnly || !optionSchedule.requiresEndDate)
    ? bookingDateValue
    : (values.endBookingDate || bookingDateValue);
  const bookingValues = { ...values, bookingDate: bookingDateValue, endBookingDate: alignedEndBookingDate };

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
    if (supportsOptions && !selectedOffer) return t('booking.chooseFromTable', language);
    if (!values.fullName.trim()) return t('booking.completeName', language);
    if (!isValidPhoneNumber(values.phone)) return t('booking.validPhone', language);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return t('booking.validEmail', language);
    const scheduleError = validateOptionSchedule(optionSchedule, bookingValues, TODAY);
    if (scheduleError) return scheduleError;
    if (Number(values.numberOfPeople) < 1) return t('booking.peopleMin', language);
    if (Number(values.quantity) < 1) return t('booking.quantityMin', language);
    if (!isCustomerMapLocationComplete(values.customerLocationDetails)) return t('booking.selectMapLocation', language);
    if (!values.agreeToTerms) return t('booking.agreeTerms', language);
    if (useRebook && !rebookId.trim()) return t('booking.enterRebookId', language);
    if (useRebook && verifiedRebookId !== rebookId.trim().toUpperCase()) return t('booking.verifyRebookFirst', language);
    if (bookingFieldSchema.length) {
      const schemaErrors = validateSchemaValues(bookingFieldSchema, bookingAttributes);
      if (Object.keys(schemaErrors).length) {
        setBookingAttributeErrors(schemaErrors);
        const first = Object.values(schemaErrors)[0];
        return first || t('booking.completeField', language, { label: 'booking details' });
      }
      setBookingAttributeErrors({});
    }
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
      const listedPrice = supportsOptions
        ? (selectedOfferRow?.cells?.price || '')
        : basePrice;
      const response = await bookingApi.bookService(authData.token, {
        serviceId: service._id,
        optionId: supportsOptions
          ? (selectedOfferRow?.optionId || selectedOfferRow?.id || undefined)
          : undefined,
        rebookId: useRebook ? verifiedRebookId : undefined,
        numberOfPeople,
        quantity,
        totalConsumptionUnits: numberOfPeople * quantity,
        totalPrice: 0,
        startDate: bookingValues.bookingDate,
        endDate: bookingValues.endBookingDate || bookingValues.bookingDate,
        endBookingDate: bookingValues.endBookingDate || bookingValues.bookingDate,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        consumption: {
          consumptionStartDate: bookingValues.bookingDate,
          consumptionEndDate: bookingValues.endBookingDate || bookingValues.bookingDate,
          consumptionStartTime: values.startTime || '',
          consumptionEndTime: values.endTime || '',
        },
        destinationPlace: values.destinationPlace,
        destinationLocation: values.destinationLocation,
        vehicleType: values.vehicleType,
        packageType: values.packageType,
        customerLocation: customerLocationText,
        customerLocationDetails,
        bookingAttributes: bookingFieldSchema.length ? bookingAttributes : undefined,
        bookingDetails: {
          customerLocationDetails,
          serviceName: service.title || service.name,
          requestedService: supportsOptions ? selectedOffer : (service.title || service.name),
          selectedOptionId: supportsOptions
            ? (selectedOfferRow?.optionId || selectedOfferRow?.id)
            : undefined,
          listedPriceRwf: listedPrice,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          bookingDate: bookingValues.bookingDate,
          endBookingDate: bookingValues.endBookingDate || bookingValues.bookingDate,
          startTime: values.startTime || '',
          endTime: values.endTime || '',
          consumption: {
            consumptionStartDate: bookingValues.bookingDate,
            consumptionEndDate: bookingValues.endBookingDate || bookingValues.bookingDate,
            consumptionStartTime: values.startTime || '',
            consumptionEndTime: values.endTime || '',
          },
          numberOfPeople,
          quantity,
          totalConsumptionUnits: numberOfPeople * quantity,
          customerLocation: customerLocationText,
          paymentMethod: values.paymentMethod,
          serviceCategory: service.category || business?.serviceCategory,
          bookingType: bookingConfig.type,
          providerRules: Array.isArray(service.rules) ? service.rules : [],
          customFormTitle: business?.bookingForm?.title || '',
          bookingAttributes: bookingFieldSchema.length ? bookingAttributes : undefined,
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-950">{service.title || service.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {business.location} · {bookingConfig.label}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t('booking.closeForm', language)}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <label className="flex items-start gap-3 text-sm font-bold text-blue-950">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={useRebook}
            onChange={(event) => { setUseRebook(event.target.checked); setVerifiedRebookId(''); setError(''); }}
          />
          <span>{t('booking.useRebook', language)}</span>
        </label>
        {useRebook && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={rebookId}
              onChange={(event) => { setRebookId(event.target.value.toUpperCase()); setVerifiedRebookId(''); }}
              placeholder="RBK-2026-00124"
              className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2.5 font-mono uppercase"
            />
            <button type="button" disabled={verifyingRebook} onClick={verifyRebook} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {verifyingRebook ? t('booking.verifying', language) : t('booking.verifyId', language)}
            </button>
          </div>
        )}
        {useRebook && verifiedRebookId && <p className="mt-2 text-xs font-bold text-emerald-700">{t('booking.rebookVerified', language)}</p>}
      </div>

      {Array.isArray(service.rules) && service.rules.length > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">{t('booking.providerRules', language)}</p>
          <ul className="mt-2 list-disc pl-5">{service.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </div>
      )}

      {displayedRules.length > 0 && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-bold">{t('booking.marketplaceRules', language)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{displayedRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </div>
      )}

      <section className="mb-6 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-400">{t('booking.chooseService', language)}</h3>
        {supportsOptions ? (
          <>
            <select
              disabled={Boolean(quoteResult)}
              value={selectedOffer}
              onChange={(event) => setSelectedOffer(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
              required
            >
              <option value="">{t('booking.selectFromTable', language)}</option>
              {offers.map((row) => (
                <option key={row.id} value={row.cells?.service}>{row.cells?.service} — {formatRwf(Number(row.cells?.price || 0))}</option>
              ))}
            </select>
            {selectedOfferRow && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{selectedOfferRow.cells?.service}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {optionSchedule.availableFrom || optionSchedule.availableTo
                      ? `${formatDisplayDate(optionSchedule.availableFrom)} – ${optionSchedule.availableTo ? formatDisplayDate(optionSchedule.availableTo) : t('booking.open', language)}`
                      : t('booking.noDateWindow', language)}
                  </p>
                </div>
                <button type="button" onClick={() => setDetailsOpen(true)} className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-bold text-primary shadow-sm">
                  {t('booking.viewDetails', language)}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="text-lg font-black">{service.title || service.name}</p>
            <p className="mt-1 font-bold text-primary">{basePrice > 0 ? formatRwf(basePrice) : t('booking.manualQuote', language)}</p>
          </div>
        )}
      </section>

      {activePromotion && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">{activePromotion.title}: {t('details.savePercent', language, { percent: activePromotion.percent })}</p>
          <p className="mt-1">{t('details.valid', language, { start: formatDate(activePromotion.startAt), end: formatDate(activePromotion.endAt) })}</p>
          {activePromotion.note && <p className="mt-1 text-amber-800">{activePromotion.note}</p>}
        </div>
      )}

      <section className="mb-6">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">{t('booking.yourDetails', language)}</h3>
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-bold text-slate-900">Booking submitted: today</p>
          <p className="mt-1 text-xs text-slate-500">The system records booking time automatically. Below, choose when you will start and finish consuming the service.</p>
          {publicAvailability && !publicAvailability.isAnytime && (
            <p className="mt-2 text-xs font-semibold text-emerald-800">
              Available
              {publicAvailability.windowStartDate || publicAvailability.windowEndDate
                ? ` ${publicAvailability.windowStartDate || '…'} → ${publicAvailability.windowEndDate || '…'}`
                : ''}
              {(publicAvailability.daysOfWeek || []).length ? ` · days: ${publicAvailability.daysOfWeek.join(', ')}` : ''}
              {publicAvailability.dayStartTime || publicAvailability.dayEndTime
                ? ` · ${publicAvailability.dayStartTime || '…'}–${publicAvailability.dayEndTime || '…'}`
                : ''}
              {publicAvailability.trackCapacity
                ? ` · ${publicAvailability.capacityRemaining ?? publicAvailability.capacityTotal} left`
                : ''}
            </p>
          )}
          {publicAvailability?.isAnytime && (
            <p className="mt-2 text-xs font-semibold text-emerald-800">This service/option is available anytime.</p>
          )}
        </div>
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-2">
          <FixedInput label={t('booking.fullName', language)} value={values.fullName} onChange={(value) => updateValue('fullName', value)} required />
          <PhoneNumberField label={t('booking.phoneNumber', language)} value={values.phone} onChange={(value) => updateValue('phone', value)} required />
          <FixedInput label={t('booking.email', language)} type="email" value={values.email} onChange={(value) => updateValue('email', value)} required />
          <FixedInput
            label="Consumption start date"
            type="date"
            min={dateMin}
            max={dateMax || undefined}
            value={bookingDateValue}
            onChange={(value) => updateValue('bookingDate', value)}
            required={consumptionPolicy.requireConsumptionStartDate !== false}
            hint={dateHint(optionSchedule, dateMin, dateMax, language)}
          />
          {(consumptionPolicy.requireConsumptionEndDate || optionSchedule.requiresEndDate || optionSchedule.sameDayOnly) && (
            <FixedInput
              label="Consumption end date"
              type="date"
              min={bookingDateValue || dateMin}
              max={dateMax || undefined}
              value={alignedEndBookingDate}
              onChange={(value) => updateValue('endBookingDate', value)}
              required={Boolean(consumptionPolicy.requireConsumptionEndDate || optionSchedule.requiresEndDate)}
              hint={optionSchedule.sameDayOnly ? t('booking.sameDayOnly', language) : t('booking.stayInsideDates', language)}
            />
          )}
          <FixedInput
            label="Consumption start time"
            type="time"
            min={overnightHours ? undefined : optionSchedule.openTime || undefined}
            max={overnightHours ? undefined : optionSchedule.closeTime || undefined}
            value={values.startTime}
            onChange={(value) => updateValue('startTime', value)}
            required={Boolean(consumptionPolicy.requireConsumptionStartTime || optionSchedule.requiresTime)}
            hint={timeHint(optionSchedule, 'start', language)}
          />
          <FixedInput
            label="Consumption end time"
            type="time"
            min={overnightHours ? undefined : optionSchedule.openTime || undefined}
            max={overnightHours ? undefined : optionSchedule.closeTime || undefined}
            value={values.endTime}
            onChange={(value) => updateValue('endTime', value)}
            required={Boolean(consumptionPolicy.requireConsumptionEndTime || optionSchedule.requiresTime)}
            hint={timeHint(optionSchedule, 'end', language)}
          />
          <FixedInput label={t('booking.numberOfPeople', language)} type="number" min="1" value={values.numberOfPeople} onChange={(value) => updateValue('numberOfPeople', value)} required />
          <FixedInput label={t('booking.quantityUnits', language)} type="number" min="1" value={values.quantity} onChange={(value) => updateValue('quantity', value)} required />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('booking.paymentMethod', language)}</span>
            <select value={values.paymentMethod} onChange={(event) => updateValue('paymentMethod', event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="mobile-money">{t('booking.mobileMoney', language)}</option>
              <option value="bank">{t('bank', language)}</option>
            </select>
          </label>
        </div>
      </section>

      <div className="mb-6">
        <CustomerLocationPicker value={values.customerLocationDetails} onChange={updateCustomerLocation} />
      </div>

      {bookingFieldSchema.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">{t('booking.bookingDetails', language)}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('booking.requiredFields', language)}</p>
          <div className="mt-4">
            <SchemaFields
              schema={bookingFieldSchema}
              values={bookingAttributes}
              errors={bookingAttributeErrors}
              onChange={(next) => {
                setBookingAttributes(next);
                setBookingAttributeErrors({});
              }}
            />
          </div>
        </div>
      )}

      {customFields.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {customFields.map((item) => (
            <DynamicField
              key={item.id || item.name}
              field={item}
              value={customFields.length ? customValues[item.id] : values[item.name] || ''}
              onChange={(value) => (customFields.length ? setCustomValues((prev) => ({ ...prev, [item.id]: value })) : updateValue(item.name, value))}
            />
          ))}
        </div>
      )}

      <label className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
        <input type="checkbox" className="mt-0.5" checked={values.agreeToTerms} onChange={(event) => updateValue('agreeToTerms', event.target.checked)} required />
        <AgreeTermsText />
      </label>

      <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {effectiveMode === 'automatic' ? t('booking.automaticHint', language) : t('booking.manualHint', language)}
      </div>

      {isUnavailable && <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{t('booking.currentlyUnavailable', language)}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={loading || isUnavailable || Boolean(quoteResult)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
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
      {detailsOpen && selectedOfferRow && <OptionDetailsModal row={selectedOfferRow} listing={{ ...business, ...service }} onClose={() => setDetailsOpen(false)} />}
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
    <label className="flex h-full flex-col">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}{required ? '' : <span className="font-normal text-slate-400"> {t('booking.optional', language)}</span>}
      </span>
      <input type={type} min={min} max={max} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
      {hint ? <span className="mt-1 block min-h-[2.5rem] text-xs leading-5 text-slate-500">{hint}</span> : <span className="mt-1 block min-h-[2.5rem]" aria-hidden="true" />}
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
            const maxBytes = Number(item.validation?.maxFileSizeMb || MAX_UPLOAD_FILE_SIZE_MB) * 1024 * 1024;
            if (file.size > maxBytes) {
              event.target.value = '';
              window.alert(t('booking.maxFileSize', language, { n: item.validation?.maxFileSizeMb || MAX_UPLOAD_FILE_SIZE_MB }));
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
