import { t } from '../../lib/translations';
import { resolveRentalLocations } from '../../lib/rentalLocations';

export { resolveRentalLocations };

const SLUG_TO_DOMAIN = {
  hotel: 'accommodation',
  apartment: 'accommodation',
  homestay: 'accommodation',
  'guest-house': 'accommodation',
  'bed-and-breakfast': 'accommodation',
  hostel: 'accommodation',
  'car-rental': 'transport',
  taxi: 'transport',
  motorbike: 'transport',
  tour: 'experiences',
  'activity-operator': 'experiences',
  restaurant: 'dining',
  cafe: 'dining',
  bar: 'dining',
  conference: 'venues',
  'event-hall': 'venues',
};

const SLUG_ALIASES = {
  'car-rentals': 'car-rental',
  cars: 'car-rental',
  'motorbike-and-scooter-rentals': 'motorbike',
  'taxi-and-ride-services': 'taxi',
  'bus-and-minivan-charters': 'taxi',
};

export const INVENTORY_LABELS = {
  accommodation: { singular: 'Room', plural: 'Rooms' },
  transport: { singular: 'Vehicle', plural: 'Vehicles' },
  experiences: { singular: 'Package', plural: 'Packages' },
  dining: { singular: 'Offer', plural: 'Offers' },
  venues: { singular: 'Package', plural: 'Packages' },
};

export function normalizeCategorySlug(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[ /]+/g, '-');
  return SLUG_ALIASES[raw] || raw;
}

function slugCandidates(categoryOrSlug) {
  if (categoryOrSlug == null) return [];
  if (typeof categoryOrSlug === 'string') return [normalizeCategorySlug(categoryOrSlug)].filter(Boolean);
  const nested = categoryOrSlug.category && typeof categoryOrSlug.category === 'object'
    ? categoryOrSlug.category
    : null;
  return [
    categoryOrSlug.categorySlug,
    nested?.slug,
    nested?.categorySlug,
    typeof categoryOrSlug.category === 'string' ? categoryOrSlug.category : '',
    categoryOrSlug.slug,
    categoryOrSlug.subtype,
    nested?.subtype,
    categoryOrSlug.type,
    nested?.type,
    categoryOrSlug.serviceType,
    categoryOrSlug.serviceCategory,
  ].map(normalizeCategorySlug).filter(Boolean);
}

function inferTransportSubtype(categoryOrSlug) {
  const attrs = categoryOrSlug?.listingAttributes || categoryOrSlug || {};
  // Bikes share the rental window fields with cars, so check bike-only
  // markers first or every motorbike would read as a car rental.
  if (attrs.helmetIncluded != null) return 'motorbike';
  if (attrs.vehicleClass || attrs.transmission || attrs.fuelPolicy) return 'car-rental';
  if (attrs.vehicleType) return 'taxi';
  if (attrs.pickupTime || attrs.returnTime || attrs.minRentalDays || attrs.maxRentalDays) return 'car-rental';
  return '';
}

function readSlug(categoryOrSlug) {
  if (categoryOrSlug == null) return '';
  const candidates = slugCandidates(categoryOrSlug);
  const domainHint = categoryOrSlug.domain || '';
  const known = candidates.find((slug) => {
    const mapped = SLUG_TO_DOMAIN[slug];
    if (!mapped) return false;
    if (domainHint === 'transport' && mapped === 'accommodation') return false;
    if (domainHint === 'accommodation' && mapped === 'transport') return false;
    return true;
  });
  if (known) return known;
  if (domainHint === 'transport') return inferTransportSubtype(categoryOrSlug) || candidates[0] || '';
  return candidates[0] || '';
}

export function resolveDomain(categoryOrSlug) {
  if (categoryOrSlug == null) return 'experiences';
  const slug = readSlug(categoryOrSlug);
  if (SLUG_TO_DOMAIN[slug]) return SLUG_TO_DOMAIN[slug];
  if (categoryOrSlug.domain) return categoryOrSlug.domain;
  return 'experiences';
}

export function resolveSubtype(categoryOrSlug) {
  if (categoryOrSlug == null) return '';
  return readSlug(categoryOrSlug);
}

export function isStayCategory(categoryOrSlug) {
  return resolveDomain(categoryOrSlug) === 'accommodation';
}

/** Same stored codes; labels change by domain (cars use pickup / return). */
export function remainingPaymentOptions(categoryOrSlug) {
  const copy = domainCopy(categoryOrSlug);
  if (copy.kind === 'rental') {
    return [
      { value: 'PAY_AT_ARRIVAL', label: 'Pay at pickup' },
      { value: 'PAY_AT_CHECKOUT', label: 'Pay at return' },
      { value: 'PAY_AT_BOOKING', label: 'Pay full amount at booking' },
    ];
  }
  return [
    { value: 'PAY_AT_ARRIVAL', label: 'Pay at arrival' },
    { value: 'PAY_AT_CHECKOUT', label: 'Pay at checkout' },
    { value: 'PAY_AT_BOOKING', label: 'Pay full amount at booking' },
  ];
}

export function remainingPaymentLabel(method, categoryOrSlug) {
  const code = String(method || '').trim().toUpperCase();
  if (!code) return '';
  const match = remainingPaymentOptions(categoryOrSlug).find((option) => option.value === code);
  if (match) return match.label;
  if (code === 'PAY_AT_ARRIVAL') return 'Pay at arrival';
  if (code === 'PAY_AT_CHECKOUT') return 'Pay at checkout';
  if (code === 'PAY_AT_BOOKING') return 'Pay full amount at booking';
  return code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export const CAR_FUEL_TYPES = [
  { value: 'Petrol', label: 'Petrol (regular unleaded)' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Hybrid / Electric', label: 'Hybrid / Electric' },
];

/** Motorbike fleet categories a rider can choose between. */
export const MOTORBIKE_CATEGORIES = ['scooter', 'taxi-moto', 'safari-adventure'];

/** Rwandan permit classes, per vehicle kind. A1 = automatic scooters under 125cc. */
export const MOTORBIKE_LICENCE_CLASSES = ['A1', 'A'];
export const CAR_LICENCE_CLASSES = ['B', 'C', 'D', 'E'];

export function licenceClassesFor(subtype) {
  return subtype === 'motorbike' ? MOTORBIKE_LICENCE_CLASSES : CAR_LICENCE_CLASSES;
}

/** Engine size decides which permit class a rider legally needs. */
export function requiredLicenceClassForEngine(engineCc) {
  return Number(engineCc) > 0 && Number(engineCc) <= 125 ? 'A1' : 'A';
}

export function motorbikeCategoryOptions(language) {
  return MOTORBIKE_CATEGORIES.map((value) => ({
    value,
    label: t(`domain.transport.moto.categories.${value}`, language),
  }));
}

export function licenceClassOptions(subtype, language) {
  return licenceClassesFor(subtype).map((value) => ({
    value,
    label: t(`domain.transport.licence.classes.${value}`, language),
  }));
}

export function districtOptions(allowed = []) {
  return allowed.map((value) => ({ value, label: value }));
}

export function splitDateTimeValue(value) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return { date: text.slice(0, 10), time: text.slice(11, 16) };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { date: text, time: '' };
  return { date: '', time: '' };
}

export function joinDateTimeValue(date, time) {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

export function rangeDays(startDate, endDate) {
  const start = String(startDate || '').slice(0, 10);
  const end = String(endDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end <= start) return 0;
  return Math.round((new Date(`${end}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / 86400000);
}

export function isRangeOccupancyCategory(categoryOrSlug) {
  const domain = resolveDomain(categoryOrSlug);
  const subtype = resolveSubtype(categoryOrSlug);
  if (domain === 'accommodation') return true;
  return domain === 'transport' && (subtype === 'car-rental' || subtype === 'motorbike');
}

export function domainCopy(categoryOrSlug) {
  if (categoryOrSlug == null) {
    return {
      kind: 'option',
      domain: 'experiences',
      subtype: '',
      rangeMode: false,
      optionNoun: 'option',
      optionNounPlural: 'options',
      unitNoun: 'unit',
      unitNounPlural: 'units',
      startLabel: 'Start',
      endLabel: 'End',
      startFromLabel: 'Available from',
      lastEndLabel: 'Available until',
      hoursStartLabel: 'Open time',
      hoursEndLabel: 'Close time',
      capacityLabel: 'Capacity',
    };
  }
  const domain = resolveDomain(categoryOrSlug);
  const subtype = resolveSubtype(categoryOrSlug);
  const rangeMode = isRangeOccupancyCategory(categoryOrSlug);

  if (domain === 'accommodation') {
    return {
      kind: 'stay',
      domain,
      subtype,
      rangeMode: true,
      optionNoun: 'room type',
      optionNounPlural: 'room types',
      unitNoun: 'room',
      unitNounPlural: 'rooms',
      startLabel: 'Check-in',
      endLabel: 'Check-out',
      startFromLabel: 'Guests can check in from',
      lastEndLabel: 'Last check-out date',
      hoursStartLabel: 'Check-in from',
      hoursEndLabel: 'Check-out until',
      capacityLabel: 'Rooms of this type',
      occupancyTitle: 'Occupied / closed dates',
      occupancyHint: 'Close dates when a room is occupied offline or under maintenance. Checkout morning is free: the next guest can check in on the “available again” date.',
      occupancyStartLabel: 'Occupied from',
      occupancyEndLabel: 'Available again on',
      occupancyUnitsLabel: 'Rooms to close',
      occupancyNotePlaceholder: 'Owner stay, maintenance…',
      availabilityTitle: 'Open calendar for this room type',
      availabilityHint: 'The calendar window guests may book. Occupied nights are blocked separately below.',
      pageSubtitle: 'room types customers can book',
      addPlaceholder: 'Example: Deluxe double',
      banner: 'Update each room type here. You do not need to open the full listing editor or walk through every tab.',
    };
  }

  if (domain === 'transport' && subtype === 'car-rental') {
    return {
      kind: 'rental',
      domain,
      subtype,
      rangeMode: true,
      optionNoun: 'vehicle type',
      optionNounPlural: 'vehicle types',
      unitNoun: 'car',
      unitNounPlural: 'cars',
      startLabel: 'Pickup',
      endLabel: 'Return',
      startFromLabel: 'Customers can pick up from',
      lastEndLabel: 'Last return date',
      hoursStartLabel: 'Pickup from',
      hoursEndLabel: 'Return by',
      capacityLabel: 'Number of cars of this type',
      occupancyTitle: 'Cars out / closed dates',
      occupancyHint: 'A car is unavailable from pickup until return. The next customer can pick up on the return date. Close dates for maintenance or cars already rented offline.',
      occupancyStartLabel: 'Unavailable from',
      occupancyEndLabel: 'Available again on',
      occupancyUnitsLabel: 'Cars to close',
      occupancyNotePlaceholder: 'Maintenance, already rented offline…',
      availabilityTitle: 'When this vehicle can be rented',
      availabilityHint: 'Set the pickup window and how many cars you have of this type. Pickup and return hours, plus min/max rental days, are on the service details.',
      pageSubtitle: 'vehicles customers can rent',
      addPlaceholder: 'Example: Premium SUV',
      banner: 'Update each vehicle type here. Pickup and return dates are set on availability — not check-in or check-out.',
    };
  }

  if (domain === 'transport' && subtype === 'motorbike') {
    return {
      kind: 'rental',
      domain,
      subtype,
      rangeMode: true,
      optionNoun: 'bike type',
      optionNounPlural: 'bike types',
      unitNoun: 'bike',
      unitNounPlural: 'bikes',
      startLabel: 'Pickup',
      endLabel: 'Return',
      startFromLabel: 'Customers can pick up from',
      lastEndLabel: 'Last return date',
      hoursStartLabel: 'Pickup from',
      hoursEndLabel: 'Return by',
      capacityLabel: 'Number of bikes of this type',
      occupancyTitle: 'Bikes out / closed dates',
      occupancyHint: 'A bike is unavailable from pickup until return. Close dates for maintenance or bikes already rented offline.',
      occupancyStartLabel: 'Unavailable from',
      occupancyEndLabel: 'Available again on',
      occupancyUnitsLabel: 'Bikes to close',
      occupancyNotePlaceholder: 'Maintenance, already rented offline…',
      availabilityTitle: 'When this bike can be rented',
      availabilityHint: 'Set the pickup window and how many bikes you have of this type.',
      pageSubtitle: 'bikes customers can rent',
      addPlaceholder: 'Example: 125cc scooter',
      banner: 'Update each bike type here. Pickup and return dates are set on availability.',
    };
  }

  return {
    kind: 'option',
    domain,
    subtype,
    rangeMode,
    optionNoun: 'option',
    optionNounPlural: 'options',
    unitNoun: 'unit',
    unitNounPlural: 'units',
    startLabel: 'Start',
    endLabel: 'End',
    startFromLabel: 'Available from',
    lastEndLabel: 'Available until',
    hoursStartLabel: 'Open time',
    hoursEndLabel: 'Close time',
    capacityLabel: 'Capacity',
    occupancyTitle: 'Closed dates',
    occupancyHint: 'Close dates when this option cannot be booked.',
    occupancyStartLabel: 'Closed from',
    occupancyEndLabel: 'Available again on',
    occupancyUnitsLabel: 'Units to close',
    occupancyNotePlaceholder: 'Owner stay, maintenance…',
    availabilityTitle: 'When this option can be booked',
    availabilityHint: 'When customers can use this option. Empty date, day, or time means unrestricted for that part.',
    pageSubtitle: 'options customers can book',
    addPlaceholder: 'Example: Standard package',
    banner: 'Update each option here. You do not need to open the full listing editor or walk through every tab.',
  };
}

export function emptyListingValues(domain, subtype) {
  if (domain === 'accommodation') {
    return {
      checkInTime: '14:00',
      checkOutTime: '11:00',
      checkInFrom: '14:00',
      checkInUntil: '22:00',
      checkOutFrom: '07:00',
      checkOutUntil: '11:00',
      starRating: 'unrated',
      amenities: '',
      allowsChildren: 'yes',
      allowsPets: 'no',
    };
  }
  if (domain === 'transport' && subtype === 'car-rental') {
    return {
      vehicleClass: '',
      transmission: '',
      withDriver: false,
      fuelType: 'Petrol',
      fuelPolicy: 'Full-to-full',
      insuranceIncluded: false,
      minimumDriverAge: 21,
      depositNote: '',
      pickupTime: '08:00',
      returnTime: '18:00',
      minRentalDays: 1,
      maxRentalDays: 30,
      allowedLicenceClasses: ['B'],
      requireLicenceUpload: true,
      pickupLocation: '',
      returnLocation: '',
    };
  }
  if (domain === 'transport' && subtype === 'taxi') return { vehicleType: '' };
  if (domain === 'transport' && subtype === 'motorbike') {
    return {
      helmetIncluded: true,
      minimumDriverAge: 18,
      allowedLicenceClasses: ['A1', 'A'],
      requireLicenceUpload: true,
      pickupTime: '08:00',
      returnTime: '18:00',
      minRentalDays: 1,
      maxRentalDays: 30,
      depositNote: '',
      pickupLocation: '',
      returnLocation: '',
    };
  }
  if (domain === 'experiences') {
    return { duration: '', difficulty: 'Easy', meetingPoint: '', included: '', excluded: '' };
  }
  if (domain === 'dining') {
    return { cuisine: '', dressCode: '', atmosphere: '', averagePrice: '', seatingCapacity: '', openingHours: '' };
  }
  if (domain === 'venues') return { maxCapacity: '', amenities: '', cateringAvailable: false };
  return {};
}

export function emptyInventoryValues(domain, subtype) {
  if (domain === 'accommodation') return { maxGuests: 2, bedType: '', numberOfBeds: 1, bedrooms: 1, quantity: 1, unitType: 'double' };
  if (domain === 'transport' && subtype === 'motorbike') {
    return {
      make: '',
      model: '',
      plateNumber: '',
      chassisNumber: '',
      motoCategory: 'scooter',
      engineCc: 125,
      insuranceExpiry: '',
      helmetsProvided: 1,
      quantity: 1,
    };
  }
  if (domain === 'transport') return { make: '', model: '', seats: 4, luggage: '', ac: true, quantity: 1 };
  if (domain === 'experiences') return { packageType: 'Adult' };
  if (domain === 'venues') return { packageName: '' };
  return {};
}

export function emptyBookingValues(domain) {
  if (domain === 'accommodation') return { checkIn: '', checkOut: '', guests: 1, ratePlan: 'standard', specialRequests: '' };
  if (domain === 'transport') {
    return {
      pickupLocation: '',
      pickupDateTime: '',
      returnDateTime: '',
      dropoffLocation: '',
      driverAge: '',
      driverLicenseNumber: '',
      numberOfDrivers: 1,
      licenceClass: '',
      licenceImageFront: '',
      licenceImageBack: '',
      selectedCategory: '',
    };
  }
  if (domain === 'experiences') {
    return {
      preferredDate: '',
      participants: 1,
      adults: 1,
      children: 0,
      language: '',
      pickupRequired: false,
      specialRequirements: '',
    };
  }
  if (domain === 'dining') return { reservationDateTime: '', partySize: 2, allergies: '', specialRequests: '' };
  if (domain === 'venues') {
    return { eventDate: '', startTime: '', endTime: '', attendees: 10, setupStyle: '', avNeeds: '', catering: '' };
  }
  return {};
}

function validateRentalWindow(values, errors, language) {
  if (values.minRentalDays != null && values.minRentalDays !== '' && !(Number(values.minRentalDays) >= 1)) {
    errors.minRentalDays = t('domain.transport.errors.minRentalDays', language);
  }
  if (values.maxRentalDays != null && values.maxRentalDays !== '' && !(Number(values.maxRentalDays) >= 1)) {
    errors.maxRentalDays = t('domain.transport.errors.maxRentalDays', language);
  }
  if (Number(values.minRentalDays) > 0 && Number(values.maxRentalDays) > 0 && Number(values.maxRentalDays) < Number(values.minRentalDays)) {
    errors.maxRentalDays = t('domain.transport.errors.maxBelowMin', language);
  }
  if (!Array.isArray(values.allowedLicenceClasses) || !values.allowedLicenceClasses.length) {
    errors.allowedLicenceClasses = t('domain.transport.errors.licenceClassesRequired', language);
  }
}

export function validateListingClient(domain, subtype, values = {}, language) {
  const errors = {};
  if (domain === 'accommodation') {
    if (!values.checkInTime) errors.checkInTime = 'Check-in time is required.';
    if (!values.checkOutTime) errors.checkOutTime = 'Check-out time is required.';
  }
  if (domain === 'transport' && subtype === 'car-rental') {
    if (!values.vehicleClass) errors.vehicleClass = t('domain.transport.errors.vehicleClassRequired', language);
    if (!values.transmission) errors.transmission = t('domain.transport.errors.transmissionRequired', language);
    if (Number(values.minimumDriverAge) < 18) errors.minimumDriverAge = t('domain.transport.errors.minAge', language);
    validateRentalWindow(values, errors, language);
    if (!String(values.pickupLocation || '').trim()) errors.pickupLocation = t('domain.transport.errors.pickupLocationRequired', language);
    if (!String(values.returnLocation || '').trim()) errors.returnLocation = t('domain.transport.errors.returnLocationRequired', language);
  }
  if (domain === 'transport' && subtype === 'motorbike') {
    if (Number(values.minimumDriverAge) < 16) errors.minimumDriverAge = t('domain.transport.errors.minRiderAge', language);
    validateRentalWindow(values, errors, language);
    if (!String(values.pickupLocation || '').trim()) errors.pickupLocation = t('domain.transport.errors.pickupLocationRequired', language);
    if (!String(values.returnLocation || '').trim()) errors.returnLocation = t('domain.transport.errors.returnLocationRequired', language);
  }
  if (domain === 'transport' && subtype === 'taxi' && !values.vehicleType) {
    errors.vehicleType = 'Vehicle type is required.';
  }
  if (domain === 'experiences' && !values.duration) errors.duration = 'Duration is required.';
  if (domain === 'dining') {
    if ((subtype === 'restaurant' || subtype === 'cafe') && !values.cuisine) errors.cuisine = 'Cuisine is required.';
    if (!(Number(values.seatingCapacity) > 0)) errors.seatingCapacity = 'Seating capacity is required.';
  }
  if (domain === 'venues' && !(Number(values.maxCapacity) > 0)) {
    errors.maxCapacity = 'Max capacity is required.';
  }
  return errors;
}

export function validateInventoryClient(domain, values = {}, { subtype, language } = {}) {
  const errors = {};
  if (domain === 'accommodation' && !(Number(values.maxGuests) > 0)) {
    errors.maxGuests = 'Max guests is required.';
  }
  if (domain === 'transport' && subtype === 'motorbike') {
    if (!String(values.plateNumber || '').trim()) {
      errors.plateNumber = t('domain.transport.errors.plateRequired', language);
    }
    if (!(Number(values.engineCc) > 0)) {
      errors.engineCc = t('domain.transport.errors.engineCcRequired', language);
    }
    if (!values.insuranceExpiry) {
      errors.insuranceExpiry = t('domain.transport.errors.insuranceExpiryRequired', language);
    } else if (values.insuranceExpiry <= new Date().toISOString().slice(0, 10)) {
      errors.insuranceExpiry = t('domain.transport.errors.insuranceExpired', language);
    }
  } else if (domain === 'transport' && values.seats !== '' && values.seats != null && !(Number(values.seats) > 0)) {
    errors.seats = 'Seats must be at least 1.';
  }
  if (domain === 'transport' && values.quantity !== '' && values.quantity != null && !(Number(values.quantity) > 0)) {
    errors.quantity = t('domain.transport.errors.quantityRequired', language);
  }
  return errors;
}

export function validateBookingClient(domain, values = {}, { listing = {}, inventory = {}, language } = {}) {
  const errors = {};
  const listingDetails = listing.listingAttributes || {};
  const inventoryDetails = inventory.attributes || inventory;

  if (domain === 'accommodation') {
    if (!values.checkIn) errors.checkIn = 'Check-in is required.';
    if (!values.checkOut) errors.checkOut = 'Check-out is required.';
    if (values.checkIn && values.checkOut && values.checkOut <= values.checkIn) {
      errors.checkOut = 'Check-out must be after check-in.';
    }
    if (!(Number(values.guests) > 0)) errors.guests = 'Guests must be at least 1.';
    if (Number(inventoryDetails.maxGuests) > 0 && Number(values.guests) > Number(inventoryDetails.maxGuests)) {
      errors.guests = `Maximum ${inventoryDetails.maxGuests} guests for this room.`;
    }
    const maxStay = Number(listingDetails.maxStayNights) || (listingDetails.allowLongStays ? 90 : 30);
    if (values.checkIn && values.checkOut) {
      const nights = Math.round((new Date(`${values.checkOut}T12:00:00Z`) - new Date(`${values.checkIn}T12:00:00Z`)) / 86400000);
      if (nights > maxStay) errors.checkOut = `Maximum stay is ${maxStay} nights.`;
    }
    if (listingDetails.allowsChildren === 'no' && Number(values.children) > 0) {
      errors.guests = 'This property does not allow children.';
    }
  }
  if (domain === 'transport') {
    const transportSubtype = listing.subtype || listing.categorySlug || resolveSubtype(listing);
    if (!values.pickupDateTime) errors.pickupDateTime = 'Pickup date/time is required.';
    if (transportSubtype === 'taxi') {
      if (!values.pickupLocation) errors.pickupLocation = 'Pickup location is required.';
      if (!values.dropoffLocation) errors.dropoffLocation = 'Drop-off location is required.';
    } else {
      const locations = resolveRentalLocations(listing);
      if (!locations.pickupLocation) errors.pickupLocation = t('domain.transport.errors.providerPickupMissing', language);
      if (!locations.returnLocation) errors.returnLocation = t('domain.transport.errors.providerReturnMissing', language);
      if (!values.returnDateTime) errors.returnDateTime = 'Return date is required.';
      const pickup = splitDateTimeValue(values.pickupDateTime);
      const ret = splitDateTimeValue(values.returnDateTime);
      if (pickup.date && ret.date && ret.date <= pickup.date) {
        errors.returnDateTime = 'Return date must be after pickup date.';
      }
      const minDays = Number(listingDetails.minRentalDays) || 1;
      const maxDays = Number(listingDetails.maxRentalDays) || 0;
      const days = rangeDays(pickup.date, ret.date);
      if (days > 0) {
        if (days < minDays) errors.returnDateTime = `Minimum rental is ${minDays} day${minDays === 1 ? '' : 's'}.`;
        if (maxDays > 0 && days > maxDays) errors.returnDateTime = `Maximum rental is ${maxDays} day${maxDays === 1 ? '' : 's'}.`;
      }
      const openFrom = String(listingDetails.pickupTime || '').slice(0, 5);
      const closeBy = String(listingDetails.returnTime || '').slice(0, 5);
      if (openFrom && pickup.time && pickup.time < openFrom) {
        errors.pickupDateTime = `Pickup starts from ${openFrom}.`;
      }
      if (closeBy && ret.time && ret.time > closeBy) {
        errors.returnDateTime = `Return by ${closeBy}.`;
      }
    }
    if (transportSubtype === 'car-rental') {
      if (!(Number(values.driverAge) >= 18)) errors.driverAge = 'Driver age must be at least 18.';
      if (Number(listingDetails.minimumDriverAge) && Number(values.driverAge) < Number(listingDetails.minimumDriverAge)) {
        errors.driverAge = `Minimum age is ${listingDetails.minimumDriverAge}.`;
      }
      if (!listingDetails.withDriver && !values.driverLicenseNumber) {
        errors.driverLicenseNumber = 'Driver license number is required.';
      }
    }
    if (transportSubtype === 'motorbike') {
      const minAge = Number(listingDetails.minimumDriverAge) || 16;
      if (!(Number(values.driverAge) >= minAge)) {
        errors.driverAge = t('domain.transport.errors.riderAgeMin', language, { n: minAge });
      }
      if (!String(values.driverLicenseNumber || '').trim()) {
        errors.driverLicenseNumber = t('domain.transport.errors.licenceNumberRequired', language);
      }
    }
    if (transportSubtype === 'car-rental' || transportSubtype === 'motorbike') {
      const allowed = Array.isArray(listingDetails.allowedLicenceClasses) ? listingDetails.allowedLicenceClasses : [];
      if (!values.licenceClass) {
        errors.licenceClass = t('domain.transport.errors.licenceClassRequired', language);
      } else if (allowed.length && !allowed.includes(values.licenceClass)) {
        errors.licenceClass = t('domain.transport.errors.licenceClassNotAccepted', language, { classes: allowed.join(', ') });
      }
      // A rider on a bike over 125cc needs the full class A permit, not A1.
      const engineCc = Number(inventoryDetails.engineCc) || 0;
      if (transportSubtype === 'motorbike' && engineCc > 0 && values.licenceClass) {
        const required = requiredLicenceClassForEngine(engineCc);
        if (required === 'A' && values.licenceClass === 'A1') {
          errors.licenceClass = t('domain.transport.errors.licenceClassTooSmall', language, { cc: engineCc });
        }
      }
      if (listingDetails.requireLicenceUpload !== false) {
        if (!values.licenceImageFront) errors.licenceImageFront = t('domain.transport.errors.licenceFrontRequired', language);
        if (!values.licenceImageBack) errors.licenceImageBack = t('domain.transport.errors.licenceBackRequired', language);
      }
    }
  }
  if (domain === 'experiences') {
    if (!values.preferredDate) errors.preferredDate = 'Date is required.';
    if (!(Number(values.participants) > 0)) errors.participants = 'Participants must be at least 1.';
    if (values.adults !== '' && values.children !== '' && Number(values.adults) + Number(values.children) !== Number(values.participants)) {
      errors.participants = 'Adults plus children must equal participants.';
    }
  }
  if (domain === 'dining') {
    if (!values.reservationDateTime) errors.reservationDateTime = 'Reservation date/time is required.';
    if (!(Number(values.partySize) > 0)) errors.partySize = 'Party size must be at least 1.';
  }
  if (domain === 'venues') {
    if (!values.eventDate) errors.eventDate = 'Event date is required.';
    if (!values.startTime) errors.startTime = 'Start time is required.';
    if (!values.endTime) errors.endTime = 'End time is required.';
    if (values.startTime && values.endTime && values.endTime <= values.startTime) {
      errors.endTime = 'End time must be after start time.';
    }
    if (!(Number(values.attendees) > 0)) errors.attendees = 'Attendees must be at least 1.';
  }
  return errors;
}

export function mapBookingToSchedule(domain, values = {}) {
  if (domain === 'accommodation') {
    return {
      startDate: values.checkIn,
      endDate: values.checkOut,
      startTime: '',
      endTime: '',
      numberOfPeople: Number(values.guests) || 1,
      guests: Number(values.guests) || 1,
    };
  }
  if (domain === 'transport') {
    const pickup = String(values.pickupDateTime || '');
    const ret = String(values.returnDateTime || pickup);
    return {
      startDate: pickup.slice(0, 10),
      endDate: ret.slice(0, 10) || pickup.slice(0, 10),
      startTime: pickup.includes('T') ? pickup.slice(11, 16) : '',
      endTime: ret.includes('T') ? ret.slice(11, 16) : '',
      numberOfPeople: Number(values.numberOfDrivers) || 1,
      guests: Number(values.numberOfDrivers) || 1,
    };
  }
  if (domain === 'experiences') {
    return {
      startDate: values.preferredDate,
      endDate: values.preferredDate,
      startTime: '',
      endTime: '',
      numberOfPeople: Number(values.participants) || 1,
      guests: Number(values.participants) || 1,
    };
  }
  if (domain === 'dining') {
    const when = String(values.reservationDateTime || '');
    return {
      startDate: when.slice(0, 10),
      endDate: when.slice(0, 10),
      startTime: when.includes('T') ? when.slice(11, 16) : '',
      endTime: '',
      numberOfPeople: Number(values.partySize) || 1,
      guests: Number(values.partySize) || 1,
    };
  }
  if (domain === 'venues') {
    return {
      startDate: values.eventDate,
      endDate: values.eventDate,
      startTime: values.startTime,
      endTime: values.endTime,
      numberOfPeople: Number(values.attendees) || 1,
      guests: Number(values.attendees) || 1,
    };
  }
  return {
    startDate: values.startDate || '',
    endDate: values.endDate || values.startDate || '',
    startTime: values.startTime || '',
    endTime: values.endTime || '',
    numberOfPeople: Number(values.numberOfPeople) || 1,
    guests: Number(values.guests || values.numberOfPeople) || 1,
  };
}
