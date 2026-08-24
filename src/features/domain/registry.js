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

export const INVENTORY_LABELS = {
  accommodation: { singular: 'Room', plural: 'Rooms' },
  transport: { singular: 'Vehicle', plural: 'Vehicles' },
  experiences: { singular: 'Package', plural: 'Packages' },
  dining: { singular: 'Offer', plural: 'Offers' },
  venues: { singular: 'Package', plural: 'Packages' },
};

export function resolveDomain(categoryOrSlug) {
  if (!categoryOrSlug) return 'experiences';
  if (typeof categoryOrSlug === 'string') {
    return SLUG_TO_DOMAIN[categoryOrSlug] || 'experiences';
  }
  return (
    categoryOrSlug.domain ||
    SLUG_TO_DOMAIN[categoryOrSlug.slug] ||
    SLUG_TO_DOMAIN[categoryOrSlug.categorySlug] ||
    SLUG_TO_DOMAIN[categoryOrSlug.type] ||
    'experiences'
  );
}

export function resolveSubtype(categoryOrSlug) {
  if (!categoryOrSlug) return '';
  if (typeof categoryOrSlug === 'string') return categoryOrSlug;
  return categoryOrSlug.subtype || categoryOrSlug.slug || categoryOrSlug.categorySlug || categoryOrSlug.type || '';
}

export function isStayCategory(categoryOrSlug) {
  return resolveDomain(categoryOrSlug) === 'accommodation';
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
      fuelPolicy: 'Full-to-full',
      insuranceIncluded: false,
      minimumDriverAge: 21,
      depositNote: '',
    };
  }
  if (domain === 'transport' && subtype === 'taxi') return { vehicleType: '' };
  if (domain === 'transport' && subtype === 'motorbike') return { helmetIncluded: true, minimumDriverAge: 18 };
  if (domain === 'experiences') {
    return { duration: '', difficulty: 'Easy', meetingPoint: '', included: '', excluded: '' };
  }
  if (domain === 'dining') {
    return { cuisine: '', dressCode: '', atmosphere: '', averagePrice: '', seatingCapacity: '', openingHours: '' };
  }
  if (domain === 'venues') return { maxCapacity: '', amenities: '', cateringAvailable: false };
  return {};
}

export function emptyInventoryValues(domain) {
  if (domain === 'accommodation') return { maxGuests: 2, bedType: '', numberOfBeds: 1, bedrooms: 1, quantity: 1, unitType: 'double' };
  if (domain === 'transport') return { make: '', model: '', seats: 4, luggage: '', ac: true };
  if (domain === 'experiences') return { packageType: 'Adult' };
  if (domain === 'venues') return { packageName: '' };
  return {};
}

export function emptyBookingValues(domain) {
  if (domain === 'accommodation') return { checkIn: '', checkOut: '', guests: 1, ratePlan: 'standard', specialRequests: '' };
  if (domain === 'transport') {
    return {
      pickupLocation: '',
      returnLocation: '',
      dropoffLocation: '',
      pickupDateTime: '',
      returnDateTime: '',
      driverAge: '',
      driverLicenseNumber: '',
      numberOfDrivers: 1,
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

export function validateListingClient(domain, subtype, values = {}) {
  const errors = {};
  if (domain === 'accommodation') {
    if (!values.checkInTime) errors.checkInTime = 'Check-in time is required.';
    if (!values.checkOutTime) errors.checkOutTime = 'Check-out time is required.';
  }
  if (domain === 'transport' && subtype === 'car-rental') {
    if (!values.vehicleClass) errors.vehicleClass = 'Vehicle class is required.';
    if (!values.transmission) errors.transmission = 'Transmission is required.';
    if (Number(values.minimumDriverAge) < 18) errors.minimumDriverAge = 'Minimum age must be at least 18.';
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

export function validateInventoryClient(domain, values = {}) {
  const errors = {};
  if (domain === 'accommodation' && !(Number(values.maxGuests) > 0)) {
    errors.maxGuests = 'Max guests is required.';
  }
  if (domain === 'transport' && values.seats !== '' && values.seats != null && !(Number(values.seats) > 0)) {
    errors.seats = 'Seats must be at least 1.';
  }
  return errors;
}

export function validateBookingClient(domain, values = {}, { listing = {}, inventory = {} } = {}) {
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
    if (!values.pickupLocation) errors.pickupLocation = 'Pickup location is required.';
    if (!values.pickupDateTime) errors.pickupDateTime = 'Pickup date/time is required.';
    if (listing.subtype === 'taxi' || listing.categorySlug === 'taxi') {
      if (!values.dropoffLocation) errors.dropoffLocation = 'Drop-off location is required.';
    } else {
      if (!values.returnLocation) errors.returnLocation = 'Return location is required.';
      if (!values.returnDateTime) errors.returnDateTime = 'Return date/time is required.';
      if (values.pickupDateTime && values.returnDateTime && values.returnDateTime <= values.pickupDateTime) {
        errors.returnDateTime = 'Return must be after pickup.';
      }
    }
    if ((listing.subtype === 'car-rental' || listing.categorySlug === 'car-rental')) {
      if (!(Number(values.driverAge) >= 18)) errors.driverAge = 'Driver age must be at least 18.';
      if (Number(listingDetails.minimumDriverAge) && Number(values.driverAge) < Number(listingDetails.minimumDriverAge)) {
        errors.driverAge = `Minimum age is ${listingDetails.minimumDriverAge}.`;
      }
      if (!listingDetails.withDriver && !values.driverLicenseNumber) {
        errors.driverLicenseNumber = 'Driver license number is required.';
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
