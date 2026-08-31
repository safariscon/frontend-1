import { emptyServiceLocation, resolveServiceLocation } from "../../lib/serviceSchema";

export const STAY_FAMILIES = [
  {
    id: "apartment",
    title: "Apartment",
    description: "Furnished, self-catering places where guests book the entire unit.",
    kinds: ["apartment", "serviced-apartment"],
  },
  {
    id: "home",
    title: "Home",
    description: "Holiday homes, villas, and hosted stays.",
    kinds: ["holiday-home", "villa", "homestay"],
  },
  {
    id: "hotel",
    title: "Hotel, B&B, and more",
    description: "Hotels, guest houses, B&Bs, hostels, and aparthotels.",
    kinds: ["hotel", "guest-house", "bed-and-breakfast", "hostel", "aparthotel"],
  },
  {
    id: "alternative",
    title: "Alternative stays",
    description: "Farm stays, country houses, and similar countryside lodging.",
    kinds: ["farm-stay", "country-house"],
  },
];

export const PROPERTY_KINDS = [
  { id: "apartment", label: "Apartment", family: "apartment", categorySlug: "apartment" },
  { id: "serviced-apartment", label: "Serviced apartment", family: "apartment", categorySlug: "apartment" },
  { id: "holiday-home", label: "Holiday home", family: "home", categorySlug: "homestay" },
  { id: "villa", label: "Villa", family: "home", categorySlug: "homestay" },
  { id: "homestay", label: "Homestay", family: "home", categorySlug: "homestay" },
  { id: "hotel", label: "Hotel", family: "hotel", categorySlug: "hotel" },
  { id: "guest-house", label: "Guest house", family: "hotel", categorySlug: "guest-house" },
  { id: "bed-and-breakfast", label: "Bed and breakfast", family: "hotel", categorySlug: "bed-and-breakfast" },
  { id: "hostel", label: "Hostel", family: "hotel", categorySlug: "hostel" },
  { id: "aparthotel", label: "Aparthotel", family: "hotel", categorySlug: "hotel" },
  { id: "farm-stay", label: "Farm stay", family: "alternative", categorySlug: "homestay" },
  { id: "country-house", label: "Country house", family: "alternative", categorySlug: "homestay" },
];

export const STAR_RATINGS = [
  { id: "unrated", label: "N/A" },
  { id: "1-star", label: "1 star" },
  { id: "2-star", label: "2 stars" },
  { id: "3-star", label: "3 stars" },
  { id: "4-star", label: "4 stars" },
  { id: "5-star", label: "5 stars" },
];

export const PROPERTY_AMENITIES = [
  { id: "wifi", label: "Free WiFi" },
  { id: "air_conditioning", label: "Air conditioning" },
  { id: "non_smoking_rooms", label: "Non-smoking rooms" },
  { id: "family_rooms", label: "Family rooms" },
  { id: "front_desk_24h", label: "24-hour front desk" },
  { id: "room_service", label: "Room service" },
  { id: "bar", label: "Bar" },
  { id: "restaurant", label: "Restaurant" },
  { id: "fitness_centre", label: "Fitness centre" },
  { id: "sauna", label: "Sauna" },
  { id: "spa", label: "Spa & wellness" },
  { id: "hot_tub", label: "Hot tub / Jacuzzi" },
  { id: "swimming_pool", label: "Swimming pool" },
  { id: "garden", label: "Garden" },
  { id: "terrace", label: "Terrace" },
  { id: "beach", label: "Beach" },
  { id: "airport_shuttle", label: "Airport shuttle" },
  { id: "ev_charging", label: "EV charging" },
  { id: "parking", label: "Parking" },
];

export const ROOM_AMENITY_GROUPS = [
  {
    title: "General",
    items: [
      { id: "clothes_rack", label: "Clothes rack" },
      { id: "flat_screen_tv", label: "Flat-screen TV" },
      { id: "air_conditioning", label: "Air conditioning" },
      { id: "linen", label: "Linen" },
      { id: "desk", label: "Desk" },
      { id: "wake_up_service", label: "Wake-up service" },
      { id: "towels", label: "Towels" },
      { id: "wardrobe", label: "Wardrobe or closet" },
      { id: "heating", label: "Heating" },
      { id: "fan", label: "Fan" },
      { id: "safe", label: "Safety deposit box" },
      { id: "ground_floor", label: "Ground floor" },
    ],
  },
  {
    title: "Outdoors and views",
    items: [
      { id: "balcony", label: "Balcony" },
      { id: "terrace", label: "Terrace" },
      { id: "view", label: "View" },
    ],
  },
  {
    title: "Food and drink",
    items: [
      { id: "electric_kettle", label: "Electric kettle" },
      { id: "tea_coffee_maker", label: "Tea / coffee maker" },
      { id: "dining_area", label: "Dining area" },
      { id: "dining_table", label: "Dining table" },
      { id: "microwave", label: "Microwave" },
    ],
  },
];

export const BATHROOM_AMENITIES = [
  { id: "toilet_paper", label: "Toilet paper" },
  { id: "shower", label: "Shower" },
  { id: "toilet", label: "Toilet" },
  { id: "hairdryer", label: "Hairdryer" },
  { id: "bath", label: "Bath" },
  { id: "toiletries", label: "Free toiletries" },
  { id: "bidet", label: "Bidet" },
  { id: "slippers", label: "Slippers" },
  { id: "bathrobe", label: "Bathrobe" },
  { id: "spa_bath", label: "Spa bath" },
];

export const BED_TYPES = [
  { id: "single", label: "Single bed", hint: "90–130 cm" },
  { id: "double", label: "Double bed", hint: "131–150 cm" },
  { id: "king", label: "Large bed (King)", hint: "151–180 cm" },
  { id: "super_king", label: "Super-king", hint: "181–210 cm" },
  { id: "sofa_bed", label: "Sofa bed", hint: "Extra sleeping" },
  { id: "bunk", label: "Bunk bed", hint: "Shared rooms" },
];

export const STANDARD_UNIT_NAMES = [
  "Studio",
  "Entire apartment",
  "One-bedroom apartment",
  "Two-bedroom apartment",
  "Three-bedroom apartment",
  "Single Room",
  "Double Room",
  "Twin Room",
  "Deluxe Double Room",
  "Family Room",
  "Suite",
  "Dormitory Room",
];

export const UNIT_TYPES = [
  { id: "studio", label: "Studio" },
  { id: "single", label: "Single" },
  { id: "double", label: "Double" },
  { id: "twin", label: "Twin" },
  { id: "triple", label: "Triple" },
  { id: "suite", label: "Suite" },
  { id: "family", label: "Family" },
  { id: "dorm", label: "Dorm" },
];

export const ID_TYPES = [
  { id: "national_id", label: "National ID" },
  { id: "passport", label: "Passport" },
  { id: "company_registration", label: "Company registration" },
];

export const WIZARD_STEPS = [
  { id: "type", title: "Stay type", hint: "Choose how guests should classify this place.", scope: "stay" },
  { id: "basics", title: "Property basics", hint: "Name and description guests will search.", scope: "global" },
  { id: "location", title: "Location & contact", hint: "Map pin, address, and booking contact.", scope: "global" },
  { id: "rules", title: "House rules", hint: "Check-in windows, children, and pets.", scope: "stay" },
  { id: "amenities", title: "Facilities", hint: "What guests can use at the property.", scope: "stay" },
  { id: "units", title: "Rooms & units", hint: "Beds, max guests, one nightly price, and bathrooms.", scope: "stay" },
  { id: "photos", title: "Photos", hint: "Show the property clearly before booking.", scope: "global" },
  { id: "pricing", title: "Rates & policies", hint: "Discounts and cancellation. Nightly prices are set on each unit.", scope: "stay" },
  { id: "availability", title: "Availability", hint: "When the calendar opens for bookings.", scope: "stay" },
  { id: "identity", title: "Host & invoicing", hint: "Legal name, ID, and billing address.", scope: "global" },
  { id: "review", title: "Review & open", hint: "Confirm details, then submit for booking.", scope: "global" },
];

export const emptyLocation = emptyServiceLocation();

const newId = () => `unit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function kindMeta(id) {
  return (
    PROPERTY_KINDS.find((item) => item.id === id) ||
    PROPERTY_KINDS.find((item) => item.categorySlug === id) ||
    PROPERTY_KINDS[0]
  );
}

export function familyForKind(kindId) {
  const kind = kindMeta(kindId);
  return STAY_FAMILIES.find((item) => item.id === kind.family) || STAY_FAMILIES[0];
}

export function emptyBeds() {
  return { single: 0, double: 1, king: 0, super_king: 0, sofa_bed: 0, bunk: 0 };
}

export const PRICING_MODES = [
  {
    id: "unit",
    title: "One price for the whole unit",
    description: "Guest count is only capacity. 1 guest or max guests pay the same nightly rate.",
  },
  {
    id: "per_guest",
    title: "Price per guest",
    description: "2 guests pay 2 × this nightly price. Use this for dorm beds or per-person stays.",
  },
];

export function emptyUnit(partial = {}) {
  const maxGuests = Number(partial.maxGuests || 2);
  return {
    clientId: partial.clientId || newId(),
    optionId: partial.optionId || null,
    name: partial.name || "Entire apartment",
    unitType: partial.unitType || "studio",
    quantity: Number(partial.quantity || 1),
    bedrooms: Number(partial.bedrooms ?? 1),
    maxGuests,
    excludeInfants: Boolean(partial.excludeInfants),
    beds: { ...emptyBeds(), ...(partial.beds || {}) },
    bathroomPrivate: partial.bathroomPrivate !== false,
    bathroomAmenities: partial.bathroomAmenities || ["toilet_paper", "shower", "toilet"],
    roomAmenities: partial.roomAmenities || [],
    pricingMode: partial.pricingMode === "per_guest" ? "per_guest" : "unit",
    price: partial.price || "",
  };
}

export function emptyStayDraft(overrides = {}) {
  return {
    familyId: "apartment",
    propertyKind: "apartment",
    categorySlug: "apartment",
    listingScale: "single",
    isManagementCompany: false,
    title: "",
    description: "",
    starRating: "unrated",
    location: { ...emptyLocation },
    phoneE164: "",
    whatsappE164: "",
    checkInFrom: "14:00",
    checkInUntil: "22:00",
    checkOutFrom: "07:00",
    checkOutUntil: "11:00",
    allowsChildren: "yes",
    allowsPets: "no",
    childrenStayFree: true,
    excludeInfantsFromOccupancy: false,
    amenities: ["wifi"],
    units: [emptyUnit()],
    images: { primaryImage: "", primaryImageFile: null, galleryImages: [], galleryFiles: [] },
    paymentPolicy: { depositPercentage: 50, remainingPaymentMethod: "PAY_AT_ARRIVAL" },
    cancellationPolicy: { type: "moderate", freeCancellationUntilHours: 48, depositRefundable: false },
    nonRefundableEnabled: false,
    nonRefundablePercent: 10,
    weeklyEnabled: false,
    weeklyPercent: 15,
    weeklyMinNights: 7,
    firstCheckInMode: "asap",
    firstCheckInDate: "",
    availabilityHorizonDays: 365,
    allowLongStays: false,
    calendarImportUrl: "",
    hostLegalName: "",
    hostIsCompany: false,
    hostCompanyName: "",
    hostIdType: "national_id",
    hostIdNumber: "",
    billingSameAsProperty: true,
    billingAddress: "",
    status: "available",
    ...overrides,
  };
}

export function bedsToList(beds = {}) {
  return Object.entries(beds)
    .filter(([, count]) => Number(count) > 0)
    .map(([type, count]) => ({ type, count: Number(count) }));
}

export function bedsFromList(list = []) {
  const next = emptyBeds();
  (Array.isArray(list) ? list : []).forEach((bed) => {
    if (bed?.type && next[bed.type] != null) next[bed.type] = Number(bed.count || 0);
  });
  return next;
}

export function addDays(dateOnly, days) {
  const start = dateOnly || new Date().toISOString().slice(0, 10);
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function availabilityWindow(draft) {
  const start = draft.firstCheckInMode === "date" && draft.firstCheckInDate
    ? draft.firstCheckInDate
    : new Date().toISOString().slice(0, 10);
  return {
    windowStartDate: start,
    windowEndDate: addDays(start, Number(draft.availabilityHorizonDays || 365)),
  };
}

export function buildListingAttributes(draft) {
  return {
    requireHostIdentity: true,
    propertyKind: draft.propertyKind,
    listingScale: draft.listingScale,
    isManagementCompany: Boolean(draft.isManagementCompany),
    starRating: draft.starRating || "unrated",
    checkInTime: draft.checkInFrom,
    checkOutTime: draft.checkOutUntil,
    checkInFrom: draft.checkInFrom,
    checkInUntil: draft.checkInUntil,
    checkOutFrom: draft.checkOutFrom,
    checkOutUntil: draft.checkOutUntil,
    allowsChildren: draft.allowsChildren,
    allowsPets: draft.allowsPets,
    childrenStayFree: Boolean(draft.childrenStayFree),
    excludeInfantsFromOccupancy: Boolean(draft.excludeInfantsFromOccupancy),
    amenities: draft.amenities || [],
    firstCheckInMode: draft.firstCheckInMode,
    firstCheckInDate: draft.firstCheckInDate,
    availabilityHorizonDays: Number(draft.availabilityHorizonDays || 365),
    allowLongStays: Boolean(draft.allowLongStays),
    maxStayNights: draft.allowLongStays ? 90 : 30,
    calendarImportUrl: draft.calendarImportUrl || "",
    ratePlans: {
      nonRefundable: { enabled: Boolean(draft.nonRefundableEnabled), discountPercent: Number(draft.nonRefundablePercent || 10) },
      weekly: {
        enabled: Boolean(draft.weeklyEnabled),
        discountPercent: Number(draft.weeklyPercent || 15),
        minNights: Number(draft.weeklyMinNights || 7),
      },
    },
    hostIdentity: {
      legalName: draft.hostLegalName,
      isCompany: Boolean(draft.hostIsCompany),
      companyName: draft.hostCompanyName,
      idType: draft.hostIdType,
      idNumber: draft.hostIdNumber,
      billingSameAsProperty: draft.billingSameAsProperty !== false,
      billingAddress: draft.billingAddress,
    },
  };
}

export function buildUnitPayload(unit) {
  const beds = bedsToList(unit.beds);
  const maxGuests = Math.max(1, Number(unit.maxGuests) || 1);
  const fallbackPrice = Number(unit.price) || 0;
  const pricingMode = unit.pricingMode === "per_guest" ? "per_guest" : "unit";
  return {
    name: unit.name,
    price: fallbackPrice,
    currency: "RWF",
    attributes: {
      unitName: unit.name,
      unitType: unit.unitType,
      maxGuests,
      bedrooms: Number(unit.bedrooms || 0),
      beds,
      quantity: Number(unit.quantity || 1),
      excludeInfants: Boolean(unit.excludeInfants),
      bathroomPrivate: unit.bathroomPrivate !== false,
      bathroomAmenities: unit.bathroomAmenities || [],
      roomAmenities: unit.roomAmenities || [],
      pricingMode,
      occupancyPrices: [{ guests: maxGuests, price: fallbackPrice }],
    },
  };
}

function resolveLoadedPrice(option = {}, attrs = {}, maxGuests = 2) {
  if (Number(option.price) > 0) return String(option.price);
  const rows = Array.isArray(attrs.occupancyPrices) ? attrs.occupancyPrices : [];
  const byMax = rows.find((row) => Number(row.guests) === Number(maxGuests) && Number(row.price) > 0);
  const any = rows.find((row) => Number(row.price) > 0);
  return String(byMax?.price || any?.price || "");
}

export function unitFromOption(option) {
  const attrs = option?.attributes || {};
  const maxGuests = Number(attrs.maxGuests || 2);
  return emptyUnit({
    optionId: option._id || option.id || null,
    name: option.name || attrs.unitName || "Room",
    unitType: attrs.unitType || "double",
    quantity: Number(attrs.quantity || option.capacity || 1),
    bedrooms: Number(attrs.bedrooms ?? 1),
    maxGuests,
    excludeInfants: Boolean(attrs.excludeInfants),
    beds: bedsFromList(attrs.beds),
    bathroomPrivate: attrs.bathroomPrivate !== false,
    bathroomAmenities: attrs.bathroomAmenities || [],
    roomAmenities: attrs.roomAmenities || [],
    pricingMode: attrs.pricingMode === "per_guest" ? "per_guest" : "unit",
    price: resolveLoadedPrice(option, attrs, maxGuests),
  });
}

export function draftFromService(service, options = []) {
  const attrs = service?.listingAttributes || {};
  const identity = attrs.hostIdentity || {};
  const plans = attrs.ratePlans || {};
  const kind = kindMeta(attrs.propertyKind || service.subtype || service.categorySlug || "apartment");
  const cover = service.primaryImage || (Array.isArray(service.images) ? service.images[0] : "") || "";
  return emptyStayDraft({
    familyId: kind.family,
    propertyKind: kind.id,
    categorySlug: kind.categorySlug,
    listingScale: attrs.listingScale || "single",
    isManagementCompany: Boolean(attrs.isManagementCompany),
    title: service.title || service.name || "",
    description: service.description || "",
    starRating: attrs.starRating || "unrated",
    location: resolveServiceLocation(service),
    phoneE164: service.contactDetails?.phoneE164 || service.contactDetails?.phone || "",
    whatsappE164: service.contactDetails?.whatsappE164 || service.contactDetails?.whatsapp || "",
    checkInFrom: attrs.checkInFrom || attrs.checkInTime || "14:00",
    checkInUntil: attrs.checkInUntil || attrs.checkInFrom || attrs.checkInTime || "22:00",
    checkOutFrom: attrs.checkOutFrom || "07:00",
    checkOutUntil: attrs.checkOutUntil || attrs.checkOutTime || "11:00",
    allowsChildren: attrs.allowsChildren || "yes",
    allowsPets: attrs.allowsPets || "no",
    childrenStayFree: attrs.childrenStayFree !== false,
    excludeInfantsFromOccupancy: Boolean(attrs.excludeInfantsFromOccupancy),
    amenities: Array.isArray(attrs.amenities) ? attrs.amenities : String(attrs.amenities || "").split(",").map((item) => item.trim()).filter(Boolean),
    units: options.length ? options.map(unitFromOption) : [emptyUnit()],
    images: {
      primaryImage: cover,
      primaryImageFile: null,
      galleryImages: Array.isArray(service.images) ? service.images.filter(Boolean) : [],
      galleryFiles: [],
    },
    paymentPolicy: {
      depositPercentage: service.paymentPolicy?.depositPercentage ?? 50,
      remainingPaymentMethod: service.paymentPolicy?.remainingPaymentMethod || "PAY_AT_ARRIVAL",
    },
    cancellationPolicy: {
      type: service.cancellationPolicy?.type || "moderate",
      freeCancellationUntilHours: service.cancellationPolicy?.freeCancellationUntilHours ?? 48,
      depositRefundable: Boolean(service.cancellationPolicy?.depositRefundable),
    },
    nonRefundableEnabled: Boolean(plans.nonRefundable?.enabled),
    nonRefundablePercent: Number(plans.nonRefundable?.discountPercent || 10),
    weeklyEnabled: Boolean(plans.weekly?.enabled),
    weeklyPercent: Number(plans.weekly?.discountPercent || 15),
    weeklyMinNights: Number(plans.weekly?.minNights || 7),
    firstCheckInMode: attrs.firstCheckInMode || "asap",
    firstCheckInDate: attrs.firstCheckInDate || "",
    availabilityHorizonDays: Number(attrs.availabilityHorizonDays || 365),
    allowLongStays: Boolean(attrs.allowLongStays),
    calendarImportUrl: attrs.calendarImportUrl || "",
    hostLegalName: identity.legalName || "",
    hostIsCompany: Boolean(identity.isCompany),
    hostCompanyName: identity.companyName || "",
    hostIdType: identity.idType || "national_id",
    hostIdNumber: identity.idNumber || "",
    billingSameAsProperty: identity.billingSameAsProperty !== false,
    billingAddress: identity.billingAddress || "",
    status: service.status === "unavailable" ? "unavailable" : "available",
  });
}

const firstError = (errors) => Object.values(errors)[0] || "";

export function validateStayStep(stepId, draft) {
  const errors = {};
  if (stepId === "type") {
    if (!draft.propertyKind) errors.propertyKind = "Choose the stay type that matches this property.";
  }
  if (stepId === "basics") {
    if (!String(draft.title || "").trim()) errors.title = "Property name is required.";
    if (String(draft.description || "").trim().length < 20) errors.description = "Add a short description guests can understand.";
  }
  if (stepId === "location") {
    if (!draft.location?.latitude || !draft.location?.longitude) errors.location = "Pin the exact map location.";
    if (!draft.phoneE164) errors.phoneE164 = "A primary phone number is required.";
  }
  if (stepId === "rules") {
    if (!draft.checkInFrom) errors.checkInFrom = "Check-in from is required.";
    if (!draft.checkOutUntil) errors.checkOutUntil = "Check-out until is required.";
  }
  if (stepId === "units") {
    if (!draft.units?.length) errors.units = "Add at least one bookable unit.";
    (draft.units || []).forEach((unit, index) => {
      if (!unit.name) errors[`unitName${index}`] = "Choose a room name.";
      if (!(Number(unit.maxGuests) > 0)) errors[`maxGuests${index}`] = "Max guests is required.";
      if (!bedsToList(unit.beds).length) errors[`beds${index}`] = "Add at least one bed.";
      if (!(Number(unit.price) > 0)) errors[`price${index}`] = "Set one nightly price for this option.";
    });
  }
  if (stepId === "photos") {
    const hasPhoto = draft.images?.primaryImage || draft.images?.primaryImageFile || draft.images?.galleryImages?.length || draft.images?.galleryFiles?.length;
    if (!hasPhoto) errors.photos = "Add at least one photo before opening for booking.";
  }
  if (stepId === "availability") {
    if (draft.firstCheckInMode === "date" && !draft.firstCheckInDate) {
      errors.firstCheckInDate = "Choose the first check-in date.";
    }
  }
  if (stepId === "identity") {
    if (!String(draft.hostLegalName || "").trim()) errors.hostLegalName = "The name on the invoice is required.";
    if (!draft.hostIdType || !String(draft.hostIdNumber || "").trim()) errors.hostIdNumber = "ID type and number are required for verification.";
    if (draft.hostIsCompany && !String(draft.hostCompanyName || "").trim()) errors.hostCompanyName = "Legal company name is required.";
    if (draft.billingSameAsProperty === false && !String(draft.billingAddress || "").trim()) {
      errors.billingAddress = "Enter a billing address.";
    }
  }
  if (stepId === "review") {
    WIZARD_STEPS.filter((step) => step.id !== "review").forEach((step) => {
      const nested = validateStayStep(step.id, draft);
      Object.assign(errors, nested.errors);
    });
  }
  return { ok: !Object.keys(errors).length, errors, message: firstError(errors) };
}

export function amenityLabel(id) {
  return PROPERTY_AMENITIES.find((item) => item.id === id)?.label || id;
}

export function stayNeedsStarRating(kindId) {
  return ["hotel", "guest-house", "bed-and-breakfast", "aparthotel", "hostel"].includes(kindId);
}
