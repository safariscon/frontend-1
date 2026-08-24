import {
  BATHROOM_AMENITIES,
  BED_TYPES,
  PROPERTY_AMENITIES,
  ROOM_AMENITY_GROUPS,
  UNIT_TYPES,
} from '../features/accommodation/contract';
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
    return hotel.options.map(optionToBookingRow);
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
  if (left <= 0) return 'Sold out';
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

export function occupancyRows(value) {
  if (Array.isArray(value)) {
    return value
      .map((row) => ({ guests: Number(row?.guests), price: Number(row?.price) }))
      .filter((row) => Number.isFinite(row.guests) && row.guests > 0 && Number.isFinite(row.price));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([guests, price]) => ({ guests: Number(guests), price: Number(price) }))
      .filter((row) => Number.isFinite(row.guests) && row.guests > 0 && Number.isFinite(row.price));
  }
  return [];
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
  const text = String(value).trim().toLowerCase();
  return text !== '' && text !== '-' && text !== 'none' && text !== 'not set';
}
