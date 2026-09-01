import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import BookingFields from '../features/domain/BookingFields';
import {
  domainCopy,
  emptyBookingValues,
  joinDateTimeValue,
  mapBookingToSchedule,
  resolveDomain,
  splitDateTimeValue,
  validateBookingClient,
} from '../features/domain/registry';
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
  optionMaxDate,
  optionMinDate,
  parseOptionAvailability,
  validateOptionSchedule,
} from '../lib/availability';
import { addDaysIso, staySearchFromParams } from '../lib/staySearch';
import CustomerLocationPicker from './CustomerLocationPicker';
import { emptyLocationDetails, formatLocationLine, isCustomerMapLocationComplete, normalizeLocationDetails } from '../lib/places';
import { categorySupportsOptions } from '../lib/serviceSchema';
import { MAX_UPLOAD_FILE_SIZE_MB } from '../lib/uploads';
import { resolveCustomerBookingRules } from '../lib/bookingRules';
import StayOptionCard from './listing/StayOptionCard';
import { listingOptions } from '../lib/stayDisplay';

const TODAY = new Date().toISOString().split('T')[0];

const clampBookingDate = (minDate, maxDate) => {
  if (TODAY >= minDate && (!maxDate || TODAY <= maxDate)) return TODAY;
  return minDate || TODAY;
};

const clampStayAttributes = (values, {
  domain,
  dateMin,
  dateMax,
  urlCheckIn,
  urlCheckOut,
  pickupTime,
  returnTime,
}) => {
  if (domain === 'accommodation' && dateMin) {
    let checkIn = values.checkIn || urlCheckIn || dateMin;
    if (checkIn < dateMin) checkIn = dateMin;
    if (dateMax && checkIn > dateMax) checkIn = dateMax;
    let checkOut = values.checkOut || urlCheckOut || addDaysIso(checkIn, 1);
    if (checkOut <= checkIn) checkOut = addDaysIso(checkIn, 1);
    if (dateMax && checkOut > dateMax) {
      const minCheckout = addDaysIso(checkIn, 1);
      checkOut = minCheckout > dateMax ? minCheckout : dateMax;
    }
    if (checkIn === values.checkIn && checkOut === values.checkOut) return values;
    return { ...values, checkIn, checkOut };
  }
  if (domain === 'transport') {
    const pickup = splitDateTimeValue(values.pickupDateTime);
    const ret = splitDateTimeValue(values.returnDateTime);
    let pickupDate = pickup.date || urlCheckIn || '';
    let returnDate = ret.date || urlCheckOut || '';
    if (dateMin && pickupDate && pickupDate < dateMin) pickupDate = dateMin;
    if (dateMax && pickupDate && pickupDate > dateMax) pickupDate = dateMax;
    if (pickupDate && (!returnDate || returnDate <= pickupDate)) {
      returnDate = addDaysIso(pickupDate, 1);
    }
    if (dateMax && returnDate && returnDate > dateMax) returnDate = dateMax;
    const nextPickup = pickupDate ? joinDateTimeValue(pickupDate, pickup.time || pickupTime || '08:00') : values.pickupDateTime;
    const nextReturn = returnDate ? joinDateTimeValue(returnDate, ret.time || returnTime || '18:00') : values.returnDateTime;
    if (nextPickup === values.pickupDateTime && nextReturn === values.returnDateTime) return values;
    return { ...values, pickupDateTime: nextPickup, returnDateTime: nextReturn };
  }
  return values;
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
  const urlStay = staySearchFromParams(searchParams);
  const [business, setBusiness] = useState(null);
  const [values, setValues] = useState(BASE_VALUES);
  const [customValues, setCustomValues] = useState({});
  const [bookingAttributes, setBookingAttributes] = useState({});
  const [bookingAttributeErrors, setBookingAttributeErrors] = useState({});
  const [liveCategory, setLiveCategory] = useState(null);
  const [liveSchemaLoaded, setLiveSchemaLoaded] = useState(false);
  const [publicAvailability, setPublicAvailability] = useState(null);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState('');
  const [step, setStep] = useState(1);
  const [marketplaceRules, setMarketplaceRules] = useState([]);
  const [marketplaceSettings, setMarketplaceSettings] = useState({ bookingMode: 'manual' });
  const [quoteResult, setQuoteResult] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [useRebook, setUseRebook] = useState(Boolean(initialRebookId));
  const [rebookId, setRebookId] = useState(initialRebookId);
  const [verifiedRebookId, setVerifiedRebookId] = useState('');
  const [verifyingRebook, setVerifyingRebook] = useState(false);
  const stayAvailabilityKeyRef = useRef('');
  const { language } = useLanguage();

  useEffect(() => {
    const loadBusiness = async () => {
      setLiveSchemaLoaded(false);
      setLiveCategory(null);
      setAvailabilityReady(false);
      setPublicAvailability(null);
      stayAvailabilityKeyRef.current = '';
      setLoadingBusiness(true);
      try {
        const [detail, settingsResponse] = await Promise.all([
          publicApi.getHotel(hotelId, { checkIn: urlStay.checkIn || undefined, checkOut: urlStay.checkOut || undefined }).catch(() => null),
          publicApi.getMarketplaceSettings().catch(() => ({ settings: {} })),
        ]);
        setMarketplaceRules(settingsResponse.settings?.bookingRules || []);
        setMarketplaceSettings(settingsResponse.settings || { bookingMode: 'manual' });
        let found = detail?.hotel || detail?.service || detail?.business
          ? normalizeHotels([detail.hotel || detail.service || detail.business])[0]
          : null;
        if (!found) {
          const response = await publicApi.getHotels().catch(() => ({ hotels: [] }));
          const businesses = normalizeHotels(response.businesses || response.hotels || []);
          found = businesses.find((item) => String(item.id) === String(hotelId)) || null;
        }
          setBusiness(found || null);
          if (found) {
          const service = getSelectedService(found);
          const customDefaults = {};
          const fields = found.bookingForm?.isPublished ? found.bookingForm.fields || [] : [];
          fields.forEach((fieldItem) => {
            customDefaults[fieldItem.id] = fieldItem.type === 'checkbox' ? [] : fieldItem.defaultValue || '';
          });
            setCustomValues(customDefaults);
            setBookingAttributes({
              ...emptyBookingValues(resolveDomain(found)),
              checkIn: urlStay.checkIn || '',
              checkOut: urlStay.checkOut || '',
            });
            const supportsOptions = categorySupportsOptions(
              found.supportsOptions,
              found.schemaSnapshot?.supportsOptions,
              found.category?.supportsOptions,
              service?.supportsOptions
            );
            const firstOffer = supportsOptions
              ? String(listingOptions(found)[0]?.id || listingOptions(found)[0]?.optionId || found.availabilityTable?.rows?.[0]?.optionId || found.availabilityTable?.rows?.[0]?.id || found.availabilityTable?.rows?.[0]?.cells?.service || '')
              : (service?.title || service?.name || found.name || 'Service');
            const requestedOption = new URLSearchParams(window.location.search).get('optionId') || '';
            setSelectedOffer(requestedOption || firstOffer);
          setValues((prev) => ({
            ...prev,
            destinationPlace: service?.title || service?.name || found.name || '',
            destinationLocation: typeof found.location === 'string' ? found.location : (found.locationDetails?.district || ''),
            vehicleType: service?.title || service?.name || found.name || '',
            email: getAuthData()?.user?.email || '',
            fullName: getAuthData()?.user?.name || '',
            phone: getAuthData()?.user?.phone || '',
            bookingDate: prev.bookingDate || TODAY,
            endBookingDate: prev.endBookingDate || prev.bookingDate || TODAY,
          }));
          const categoryKey = found.categoryId || found.category?._id || found.categorySlug || found.type;
          if (categoryKey) {
            setLiveSchemaLoaded(false);
            categoriesApi.get(categoryKey).then((resp) => {
              setLiveCategory(resp.category || null);
              setBookingAttributes({
                ...emptyBookingValues(resolveDomain(resp.category || found)),
                checkIn: urlStay.checkIn || '',
                checkOut: urlStay.checkOut || '',
              });
            }).catch(() => {
              setLiveCategory(null);
            }).finally(() => {
              setLiveSchemaLoaded(true);
            });
          } else {
            setLiveCategory(null);
            setLiveSchemaLoaded(true);
          }
        } else {
          setLiveCategory(null);
          setLiveSchemaLoaded(true);
        }
      } catch (loadError) {
        setBusiness(null);
        setLiveCategory(null);
        setLiveSchemaLoaded(true);
        setError(loadError.message || t('booking.noBookableService', language));
      } finally {
        setLoadingBusiness(false);
      }
    };

    loadBusiness();
    return subscribeToRealtime(
      [REALTIME_EVENTS.CATALOG_CHANGED, REALTIME_EVENTS.HOTEL_CHANGED, REALTIME_EVENTS.SERVICE_CHANGED],
      loadBusiness
    );
  }, [hotelId, language, urlStay.checkIn, urlStay.checkOut]);

  const service = useMemo(() => getSelectedService(business), [business]);
  const bookingConfig = useMemo(() => getBookingConfig({ business, service, language }), [business, service, language]);
  const domain = resolveDomain(liveCategory || business);
  const copy = domainCopy(liveCategory || business);
  const listingAttrs = business?.listingAttributes || {};
  const bookingFieldSchema = useMemo(() => {
    if (liveSchemaLoaded) return liveCategory?.bookingFieldSchema || [];
    return business?.schemaSnapshot?.bookingFieldSchema || service?.schemaSnapshot?.bookingFieldSchema || [];
  }, [business, service, liveCategory, liveSchemaLoaded]);
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
  const catalogOffers = useMemo(
    () => (supportsOptions ? listingOptions(business) : []),
    [business, supportsOptions]
  );
  const offers = useMemo(
    () => catalogOffers.map((row) => {
      const isSelected = [row.id, row.optionId].some((value) => String(value || '') === String(selectedOffer));
      if (!isSelected || publicAvailability?.remaining == null) return row;
      const remaining = Number(publicAvailability.remaining);
      return {
        ...row,
        remaining,
        availableForDates: remaining > 0,
        cells: { ...(row.cells || {}), remaining, availability: remaining },
      };
    }),
    [catalogOffers, selectedOffer, publicAvailability]
  );
  const selectedOfferRow = supportsOptions
    ? offers.find((row) => [row.id, row.optionId, row.cells?.service].some((value) => String(value || '') === String(selectedOffer)))
    : null;

  const optionSchedule = useMemo(
    () => {
      const parsed = parseOptionAvailability(
        supportsOptions ? (selectedOfferRow || {}) : {},
        { ...(business || {}), ...(service || {}), availableDays: supportsOptions ? undefined : '' }
      );
      const dateOnly = (value) => {
        const text = String(value || '').slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
      };
      if (publicAvailability) {
        parsed.availableFrom = dateOnly(publicAvailability.windowStartDate) || parsed.availableFrom;
        parsed.availableTo = dateOnly(publicAvailability.windowEndDate) || parsed.availableTo;
      }
      if (selectedOfferRow?.availableFrom) parsed.availableFrom = dateOnly(selectedOfferRow.availableFrom) || parsed.availableFrom;
      if (selectedOfferRow?.availableTo) parsed.availableTo = dateOnly(selectedOfferRow.availableTo) || parsed.availableTo;
      return parsed;
    },
    [selectedOfferRow, business, service, supportsOptions, publicAvailability]
  );
  const dateMin = optionMinDate(optionSchedule, TODAY);
  const dateMax = optionMaxDate(optionSchedule);
  const stayAttributes = clampStayAttributes(bookingAttributes, {
    domain,
    dateMin,
    dateMax,
    urlCheckIn: urlStay.checkIn,
    urlCheckOut: urlStay.checkOut,
    pickupTime: listingAttrs.pickupTime,
    returnTime: listingAttrs.returnTime,
  });
  const pickupDate = splitDateTimeValue(stayAttributes.pickupDateTime).date;
  const returnDate = splitDateTimeValue(stayAttributes.returnDateTime).date;
  const preferredBookingDate = clampBookingDate(dateMin, dateMax);

  useEffect(() => {
    if (!hotelId || !business) return undefined;
    const optionId = supportsOptions
      ? (selectedOfferRow?.optionId || selectedOfferRow?.id || null)
      : null;
    const stayKey = `${hotelId}:${optionId || ''}`;
    const waitingForStay = stayAvailabilityKeyRef.current !== stayKey;
    if (waitingForStay) {
      stayAvailabilityKeyRef.current = stayKey;
    }
    let cancelled = false;
    publicApi.getServiceAvailability(hotelId, optionId, {
      checkIn: stayAttributes.checkIn || pickupDate || urlStay.checkIn || undefined,
      checkOut: stayAttributes.checkOut || returnDate || urlStay.checkOut || undefined,
    }).then((response) => {
      if (cancelled) return;
      setPublicAvailability({
        ...(response.availability || {}),
        remaining: response.remaining,
        quantity: response.quantity,
      });
      setAvailabilityReady(true);
    }).catch(() => {
      if (cancelled) return;
      setPublicAvailability(selectedOfferRow?.availability || {});
      setAvailabilityReady(true);
    });
    return () => { cancelled = true; };
  }, [hotelId, business, supportsOptions, selectedOffer, selectedOfferRow?.optionId, selectedOfferRow?.id, selectedOfferRow?.availability, stayAttributes.checkIn, stayAttributes.checkOut, pickupDate, returnDate, urlStay.checkIn, urlStay.checkOut]);
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

  const validateStayStep = () => {
    if (!service?._id) return t('booking.notAvailableYet', language);
    if (isUnavailable) return t('booking.currentlyNotAvailable', language);
    if (supportsOptions && (!selectedOffer || !selectedOfferRow)) return t('booking.chooseFromTable', language);
    if (useRebook && !rebookId.trim()) return t('booking.enterRebookId', language);
    if (useRebook && verifiedRebookId !== rebookId.trim().toUpperCase()) return t('booking.verifyRebookFirst', language);
    const schemaErrors = validateBookingClient(domain, stayAttributes, {
      listing: { ...business, listingAttributes: business?.listingAttributes, subtype: liveCategory?.subtype, categorySlug: business?.categorySlug },
      inventory: selectedOfferRow || {},
      language,
    });
    if (Object.keys(schemaErrors).length) {
      setBookingAttributeErrors(schemaErrors);
      return Object.values(schemaErrors)[0] || t('booking.completeField', language, { label: 'stay details' });
    }
    setBookingAttributeErrors({});
    const mapped = mapBookingToSchedule(domain, stayAttributes);
    const scheduleError = validateOptionSchedule(
      optionSchedule,
      {
        ...bookingValues,
        bookingDate: mapped.startDate || bookingValues.bookingDate,
        endBookingDate: mapped.endDate || bookingValues.endBookingDate,
        startTime: mapped.startTime || bookingValues.startTime,
        endTime: mapped.endTime || bookingValues.endTime,
      },
      TODAY
    );
    if (scheduleError) return scheduleError;
    if (publicAvailability?.remaining != null && Number(publicAvailability.remaining) <= 0) {
      return t('booking.fullyBookedForDates', language);
    }
    return '';
  };

  const validateDetailsStep = () => {
    if (!String(values.fullName || '').trim()) return t('booking.completeName', language);
    if (!isValidPhoneNumber(values.phone)) return t('booking.validPhone', language);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email || '').trim())) return t('booking.validEmail', language);
    if (Number(values.quantity) < 1) return t('booking.quantityMin', language);
    if (!isCustomerMapLocationComplete(values.customerLocationDetails)) return t('booking.selectMapLocation', language);
    const missingCustom = customFields.find((item) => item.required && (Array.isArray(customValues[item.id]) ? customValues[item.id].length === 0 : !String(customValues[item.id] || '').trim()));
    if (missingCustom) return t('booking.completeField', language, { label: missingCustom.label });
    return '';
  };

  const validatePaymentStep = () => {
    if (!values.paymentMethod) return t('booking.completeField', language, { label: t('booking.paymentMethod', language) });
    if (!values.agreeToTerms) return t('booking.agreeTerms', language);
    return '';
  };

  const validateStep = (currentStep) => {
    if (currentStep <= 1) {
      const stayError = validateStayStep();
      if (stayError) return stayError;
    }
    if (currentStep === 1) return '';
    if (currentStep <= 2) {
      const detailsError = validateDetailsStep();
      if (detailsError) return detailsError;
    }
    if (currentStep === 2) return '';
    return validatePaymentStep();
  };

  const goToNextStep = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return false;
    }
    setError('');
    setStep((current) => Math.min(3, current + 1));
    return true;
  };

  const goToPreviousStep = () => {
    setError('');
    setStep((current) => Math.max(1, current - 1));
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

    const stayError = validateStayStep();
    if (stayError) {
      setError(stayError);
      setStep(1);
      return;
    }
    const detailsError = validateDetailsStep();
    if (detailsError) {
      setError(detailsError);
      setStep(2);
      return;
    }
    const paymentError = validatePaymentStep();
    if (paymentError) {
      setError(paymentError);
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
      const schedule = mapBookingToSchedule(domain, stayAttributes);
      const numberOfPeople = Math.max(1, Number(schedule.numberOfPeople || values.numberOfPeople) || 1);
      const quantity = Math.max(1, Number(values.quantity) || 1);
      const startDate = schedule.startDate || bookingValues.bookingDate;
      const endDate = schedule.endDate || bookingValues.endBookingDate || startDate;
      const startTime = schedule.startTime || values.startTime || '';
      const endTime = schedule.endTime || values.endTime || '';
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
        guests: schedule.guests || numberOfPeople,
        totalConsumptionUnits: numberOfPeople * quantity,
        totalPrice: 0,
        startDate,
        endDate,
        endBookingDate: endDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        consumption: {
          consumptionStartDate: startDate,
          consumptionEndDate: endDate,
          consumptionStartTime: startTime,
          consumptionEndTime: endTime,
        },
        destinationPlace: values.destinationPlace,
        destinationLocation: values.destinationLocation,
        vehicleType: values.vehicleType,
        packageType: values.packageType,
        customerLocation: customerLocationText,
        customerLocationDetails,
        bookingAttributes: stayAttributes,
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
          bookingDate: startDate,
          endBookingDate: endDate,
          startTime,
          endTime,
          consumption: {
            consumptionStartDate: startDate,
            consumptionEndDate: endDate,
            consumptionStartTime: startTime,
            consumptionEndTime: endTime,
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
          bookingAttributes: stayAttributes,
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

  if (loadingBusiness || Boolean(business && !availabilityReady)) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
        <LoadingSpinner />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          {copy.kind === 'rental' ? 'Loading this rental…' : copy.kind === 'stay' ? 'Loading this stay…' : 'Loading this service…'}
        </p>
      </div>
    );
  }

  if (!business || !service) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <p className="font-bold text-slate-900">{t('booking.noBookableService', language)}</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {onClose ? (
          <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            Back to listing
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (quoteResult) return;
        if (step !== 3) {
          goToNextStep();
          return;
        }
        handleSubmit(event);
      }}
      className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-950">{service.title || service.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {typeof business.location === 'string' ? business.location : (business.locationDetails?.district || business.catalogLocation?.city || '')} · {bookingConfig.label}
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
          <ul className="mt-2 list-disc pl-5">{service.rules.map((rule) => <li key={String(rule)}>{typeof rule === 'string' ? rule : null}</li>)}</ul>
        </div>
      )}

      {displayedRules.length > 0 && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-bold">{t('booking.marketplaceRules', language)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{displayedRules.map((rule) => <li key={String(rule)}>{String(rule)}</li>)}</ul>
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-2">
        {['Stay', 'Your details', 'Payment'].map((label, index) => (
          <div key={label} className={`rounded-xl px-3 py-2 text-center text-xs font-black uppercase tracking-wide ${step === index + 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>
      {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

      {step === 1 && (
        <>
          <section className="mb-6 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-400">{t('booking.chooseService', language)}</h3>
            {supportsOptions ? (
              <div className="space-y-3">
                {offers.map((row) => (
                  <StayOptionCard
                    key={row.id || row.optionId}
                    option={row}
                    selected={String(row.id || row.optionId) === String(selectedOffer)}
                    selectable={!quoteResult}
                    onSelect={(next) => setSelectedOffer(String(next.id || next.optionId))}
                    copy={copy}
                    ctaLabel={copy.kind === 'rental' ? 'Book this vehicle' : 'Book this option'}
                    guests={stayAttributes.guests}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p className="text-lg font-black">{service.title || service.name}</p>
                <p className="mt-1 font-bold text-primary">{basePrice > 0 ? formatRwf(basePrice) : t('booking.manualQuote', language)}</p>
              </div>
            )}
          </section>
          <div className="mb-6">
            <BookingFields
              category={liveCategory || business}
              listing={business}
              option={selectedOfferRow}
              availability={publicAvailability || selectedOfferRow?.availability || {}}
              remaining={publicAvailability?.remaining}
              quantity={publicAvailability?.quantity || selectedOfferRow?.quantity}
              values={stayAttributes}
              errors={bookingAttributeErrors}
              dateMin={dateMin}
              dateMax={dateMax || undefined}
              onChange={(next) => {
                setBookingAttributes(next);
                setBookingAttributeErrors({});
              }}
            />
            <button type="button" onClick={goToNextStep} className="mt-4 w-full rounded-xl bg-primary py-3.5 font-bold text-white">
              Continue to your details
            </button>
          </div>
        </>
      )}

      {activePromotion && step === 1 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">{activePromotion.title}: {t('details.savePercent', language, { percent: activePromotion.percent })}</p>
          <p className="mt-1">{t('details.valid', language, { start: formatDate(activePromotion.startAt), end: formatDate(activePromotion.endAt) })}</p>
          {activePromotion.note && <p className="mt-1 text-amber-800">{activePromotion.note}</p>}
        </div>
      )}

      {step === 2 && (
        <>
      <section className="mb-6">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">{t('booking.yourDetails', language)}</h3>
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-bold text-slate-900">Guest details</p>
          <p className="mt-1 text-xs text-slate-500">Dates are on the previous step. Add who is booking, then continue to payment.</p>
          {publicAvailability?.remaining != null ? (
            <p className="mt-2 text-xs font-semibold text-emerald-800">
              {Number(publicAvailability.remaining) <= 0
                ? 'This option is not available for the selected dates.'
                : `${publicAvailability.remaining} of ${publicAvailability.quantity || publicAvailability.remaining} left for these dates`}
            </p>
          ) : publicAvailability?.trackCapacity ? (
            <p className="mt-2 text-xs font-semibold text-emerald-800">{publicAvailability.capacityRemaining ?? publicAvailability.capacityTotal} left for this option</p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-2">
          <FixedInput label={t('booking.fullName', language)} value={values.fullName} onChange={(value) => updateValue('fullName', value)} required />
          <PhoneNumberField label={t('booking.phoneNumber', language)} value={values.phone} onChange={(value) => updateValue('phone', value)} required />
          <FixedInput label={t('booking.email', language)} type="email" value={values.email} onChange={(value) => updateValue('email', value)} required />
          <FixedInput label={t('booking.quantityUnits', language)} type="number" min="1" value={values.quantity} onChange={(value) => updateValue('quantity', value)} required />
        </div>
      </section>

      <div className="mb-6">
        <CustomerLocationPicker value={values.customerLocationDetails} onChange={updateCustomerLocation} />
      </div>

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
      <div className="mb-6 flex gap-3">
        <button type="button" onClick={goToPreviousStep} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">Back</button>
        <button type="button" onClick={goToNextStep} className="flex-1 rounded-xl bg-primary py-3.5 font-bold text-white">Continue to payment</button>
      </div>
        </>
      )}

      {step === 3 && (
        <>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-400">{t('booking.paymentMethod', language)}</h3>
        <p className="mt-1 text-sm text-slate-600">Choose how you will pay after this request. You are not charged until you confirm payment.</p>
        <select value={values.paymentMethod} onChange={(event) => updateValue('paymentMethod', event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
          <option value="mobile-money">{t('booking.mobileMoney', language)}</option>
          <option value="bank">{t('bank', language)}</option>
        </select>
      </section>

      <label className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
        <input type="checkbox" className="mt-0.5" checked={values.agreeToTerms} onChange={(event) => updateValue('agreeToTerms', event.target.checked)} required />
        <AgreeTermsText />
      </label>

      <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {effectiveMode === 'automatic' ? t('booking.automaticHint', language) : t('booking.manualHint', language)}
      </div>

      {isUnavailable && <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{t('booking.currentlyUnavailable', language)}</div>}

      <div className="mb-3 flex gap-3">
        <button type="button" onClick={goToPreviousStep} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">Back</button>
        <button
          type="submit"
          disabled={loading || isUnavailable || Boolean(quoteResult)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
        </>
      )}

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
  const id = business._id || business.id;
  if (!id) return null;
  return {
    ...business,
    _id: id,
    title: business.title || business.name || 'Service',
    name: business.name || business.title || 'Service',
  };
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
          {(item.options || []).map((option) => {
            const value = option && typeof option === 'object' ? (option.value ?? option.id ?? '') : option;
            const label = option && typeof option === 'object' ? (option.label ?? option.value ?? option.id ?? '') : option;
            if (value === undefined || value === null || value === '') return null;
            const text = String(value);
            return (
            <option key={text} value={text.toLowerCase() === 'yes' ? 'yes' : text.toLowerCase() === 'no' ? 'no' : text}>
              {String(label)}
            </option>
            );
          })}
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
