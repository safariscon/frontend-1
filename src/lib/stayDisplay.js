import {
  BATHROOM_AMENITIES,
  BED_TYPES,
  PROPERTY_AMENITIES,
  ROOM_AMENITY_GROUPS,
  UNIT_TYPES,
} from '../features/accommodation/contract';
import { addDaysIso, todayIsoDate } from './staySearch';
import { formatRwf } from './currency';

const ROOM_AMENITIES = ROOM_AMENITY_GROUPS.flatMap((group) => group.items);
const POLICY = {
  yes: 'Yes',
  no: 'No',
  upon_request: 'Upon request',
  PAY_AT_ARRIVAL: 'Pay remaining at arrival',
  PAY_AT_CHECKOUT: 'Pay remaining at checkout',
};

export function listingOptions(hotel) {
  if (Array.isArray(hotel?.options) && hotel.options.length) {
    return hotel.options.map(optionToBookingRow).filter(Boolean);
  }
  const rows = hotel?.availabilityTable?.rows || [];
  return rows.map((row) => ({
    id: row.optionId || row.id,
    optionId: row.optionId || row.id,
    name: row.cells?.service || row.cells?.name || row.name || 'Option',
    price: Number(row.cells?.price || row.price || 0),
    details: row.cells?.details || '',
    quantity: Number(row.cells?.quantity || row.attributes?.quantity || row.cells?.availability || 1),
    remaining: Number(row.remaining ?? row.cells?.remaining ?? row.cells?.availability ?? row.attributes?.quantity ?? 1),
    attributes: row.attributes || row.cells?.attributes || {},
    availability: row.availability || null,
    cells: {
      ...(row.cells || {}),
      service: row.cells?.service || row.cells?.name || row.name || 'Option',
      price: Number(row.cells?.price || row.price || 0),
      details: row.cells?.details || '',
      remaining: Number(row.remaining ?? row.cells?.remaining ?? row.cells?.availability ?? 1),
    },
  }));
}

export function optionToBookingRow(option) {
  if (!option) return null;
  const availability = option.availability || {};
  return {
    ...option,
    id: option.id || option.optionId,
    optionId: option.optionId || option.id,
    cells: option.cells || {
      service: option.name,
      price: option.price,
      details: option.details || '',
      availability: option.remaining,
      quantity: option.quantity,
      remaining: option.remaining,
      availableFrom: availability.windowStartDate || option.availableFrom || '',
      availableTo: availability.windowEndDate || option.availableTo || '',
      availableDays: availability.daysOfWeek || option.availableDays || [],
      availableStartTime: availability.dayStartTime || '',
      availableEndTime: availability.dayEndTime || '',
      attributes: option.attributes || {},
    },
  };
}

export function optionLeft(option) {
  const remaining = Number(option?.remaining ?? option?.quantity ?? option?.capacity ?? 0);
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
}

export function leftLabel(option) {
  const left = optionLeft(option);
  if (option?.availableForDates === false || left <= 0) {
    return option?.availableForDates === false ? 'Not free for these dates' : 'Sold out';
  }
  return left === 1 ? '1 left' : `${left} left`;
}

export function amenityLabel(id) {
  return lookupLabel(PROPERTY_AMENITIES, id)
    || lookupLabel(ROOM_AMENITIES, id)
    || lookupLabel(BATHROOM_AMENITIES, id)
    || humanize(id);
}

export function lookupLabel(list, id) {
  if (!id) return '';
  const match = (list || []).find((item) => item.id === id);
  return match?.label || humanize(id);
}

export function unitTypeLabel(id) {
  return lookupLabel(UNIT_TYPES, id);
}

export function bedLabel(type) {
  return lookupLabel(BED_TYPES, type);
}

export function optionPricingMode(option) {
  const mode = option?.attributes?.pricingMode || option?.pricingMode;
  return mode === 'per_guest' ? 'per_guest' : 'unit';
}

export function optionUnitPrice(option) {
  const price = Number(option?.price || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function optionNightlyForGuests(option, guests) {
  const base = optionUnitPrice(option);
  const count = Math.max(1, Number(guests) || 1);
  return optionPricingMode(option) === 'per_guest' ? base * count : base;
}

export function optionPricingCopy(option, guests) {
  const maxGuests = Number(option?.attributes?.maxGuests || 0);
  const base = optionUnitPrice(option);
  const perGuest = optionPricingMode(option) === 'per_guest';
  const count = Math.max(1, Number(guests) || Math.min(2, maxGuests || 2) || 2);
  if (!base) {
    return {
      perGuest,
      headline: perGuest ? 'Per guest, per night' : 'Whole unit, per night',
      detail: 'Price is set by the provider for this option.',
      priceCaption: perGuest ? 'Per guest / night' : 'Per night',
      exampleNightly: 0,
    };
  }
  if (perGuest) {
    return {
      perGuest,
      headline: 'Per guest, per night',
      detail: `${formatRwf(base)} × ${count} guest${count === 1 ? '' : 's'} = ${formatRwf(base * count)} per night. Max ${maxGuests || count} guests.`,
      priceCaption: 'Per guest / night',
      exampleNightly: base * count,
    };
  }
  return {
    perGuest,
    headline: 'Whole unit, per night',
    detail: maxGuests
      ? `Same price for 1 to ${maxGuests} guests. Guest count is capacity, not a second price.`
      : 'This price is for the room or unit, not a separate price per guest.',
    priceCaption: 'Per night',
    exampleNightly: base,
  };
}

export function bedSummary(beds = []) {
  return (Array.isArray(beds) ? beds : [])
    .filter((bed) => bed?.type && Number(bed.count) > 0)
    .map((bed) => `${bed.count} × ${bedLabel(bed.type)}`);
}

export function priceLabel(option) {
  const price = Number(option?.price || 0);
  return price > 0 ? formatRwf(price) : 'Quote on request';
}

export function policyLabel(value) {
  if (!value) return '';
  return POLICY[value] || humanize(value);
}

export function humanize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function hasValue(value) {
  if (value === undefined || value === null || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  const text = String(value || '')
    .trim()
    .toLowerCase();
  return text !== '' && text !== '-' && text !== 'none' && text !== 'not set';
}

const timeRange = (start, end) => {
  if (start && end && start !== end) return `${start} – ${end}`;
  return start || end || '';
};

export function stayNights(checkIn, checkOut) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
  return Math.round((new Date(`${checkOut}T12:00:00Z`) - new Date(`${checkIn}T12:00:00Z`)) / 86400000);
}

export function stayBookingFacts({
  listing = {},
  option = {},
  availability = {},
  dateMin = '',
  dateMax = '',
  remaining,
  quantity,
} = {}) {
  const attrs = listing.listingAttributes || listing || {};
  const optionAttrs = option.attributes || {};
  const maxGuests = Number(optionAttrs.maxGuests || option.maxGuests || 0) || 0;
  const maxStayNights = Number(attrs.maxStayNights) || (attrs.allowLongStays ? 90 : 30);
  const firstCheckInDate = attrs.firstCheckInMode === 'date' && attrs.firstCheckInDate
    ? attrs.firstCheckInDate
    : todayIsoDate();
  const horizonDays = Number(attrs.availabilityHorizonDays) || 0;
  const horizonEnd = horizonDays > 0 ? addDaysIso(firstCheckInDate, horizonDays) : '';
  const checkInFrom = dateMin || availability.windowStartDate || option.availableFrom || firstCheckInDate || '';
  const lastCheckOut = dateMax || availability.windowEndDate || option.availableTo || horizonEnd || '';
  const units = Number(quantity ?? option.quantity ?? option.capacity ?? 0);
  const leftover = option.remaining == null ? units : option.remaining;
  const left = remaining == null ? Number(leftover) : Number(remaining);
  return {
    checkInFrom,
    lastCheckOut,
    firstCheckIn: attrs.firstCheckInMode === 'date' && attrs.firstCheckInDate
      ? attrs.firstCheckInDate
      : '',
    horizonDays,
    anytime: Boolean(availability.isAnytime) && !checkInFrom && !lastCheckOut,
    maxGuests,
    maxStayNights,
    longStays: Boolean(attrs.allowLongStays) || maxStayNights > 30,
    checkInHours: timeRange(attrs.checkInFrom || attrs.checkInTime, attrs.checkInUntil),
    checkOutHours: timeRange(attrs.checkOutFrom, attrs.checkOutUntil || attrs.checkOutTime),
    allowsChildren: policyLabel(attrs.allowsChildren),
    allowsPets: policyLabel(attrs.allowsPets),
    units,
    remaining: Number.isFinite(left) ? Math.max(0, left) : null,
  };
}
