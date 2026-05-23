export const marketplaceTypeConfig = {
  'hotels-and-resorts': ['accommodation', 'hotel', 'per_night', 'night', 'services', 'service'],
  hotel: ['accommodation', 'hotel', 'per_night', 'night', 'services', 'service'],
  'homestays-and-guesthouses': ['accommodation', 'hotel', 'per_night', 'night', 'services', 'service'],
  'tent-rentals-and-camping-sites': ['accommodation', 'rental', 'per_night', 'night', 'services', 'service'],
  'vacation-rentals-and-apartments': ['accommodation', 'rental', 'per_night', 'night', 'services', 'service'],
  'car-rentals': ['transport', 'transport', 'per_day', 'day', 'vehicles', 'vehicle'],
  'motorbike-and-scooter-rentals': ['transport', 'transport', 'per_day', 'day', 'vehicles', 'vehicle'],
  'taxi-and-ride-services': ['transport', 'transport', 'per_trip', 'trip', 'vehicles', 'vehicle'],
  'bus-and-minivan-charters': ['transport', 'transport', 'per_trip', 'trip', 'vehicles', 'vehicle'],
  restaurants: ['food-beverage', 'restaurant', 'per_person', 'person', 'tables', 'table'],
  'bars-and-pubs': ['food-beverage', 'restaurant', 'per_person', 'person', 'tables', 'table'],
  'coffee-shops-and-cafes': ['food-beverage', 'restaurant', 'per_person', 'person', 'tables', 'table'],
  'food-trucks-and-street-food-stalls': ['food-beverage', 'restaurant', 'fixed', 'order', 'orders', 'service'],
  'conference-event-halls-mice': ['events', 'event', 'fixed', 'event', 'venue-slots', 'venue'],
  'wedding-venues': ['events', 'event', 'fixed', 'event', 'venue-slots', 'venue'],
  'tour-and-activity-operators': ['experiences', 'activity', 'per_person', 'person', 'activity-slots', 'guide'],
  'entertainment-venues': ['experiences', 'event', 'per_person', 'person', 'tickets', 'service'],
  'souvenir-shops-and-craft-markets': ['shopping', 'shopping', 'fixed', 'item', 'items', 'service'],
  'gear-rentals': ['experiences', 'rental', 'per_day', 'day', 'gear', 'gear'],
  'spas-and-wellness-centers': ['wellness', 'appointment', 'per_hour', 'hour', 'appointment-slots', 'therapist'],
  'childcare-services': ['personal-services', 'childcare', 'per_hour', 'hour', 'care-slots', 'caregiver'],
};

export function getMarketplaceTypeConfig(type = 'hotel') {
  const normalizedType = String(type || 'hotel').trim().toLowerCase();
  const [serviceCategory, bookingModel, pricingModel, pricingUnit, inventoryType, assignmentType] =
    marketplaceTypeConfig[normalizedType] || ['general', 'service', 'fixed', 'service', 'services', 'service'];

  return {
    businessType: normalizedType,
    serviceCategory,
    bookingModel,
    pricingModel,
    pricingUnit,
    inventoryType,
    assignmentType,
    supportsServiceInventory: assignmentType === 'service',
  };
}

export function decorateBusiness(business) {
  const config = getMarketplaceTypeConfig(business?.businessType || business?.type);
  return {
    ...business,
    businessType: business?.businessType || business?.type || config.businessType,
    serviceCategory: business?.serviceCategory || config.serviceCategory,
    bookingModel: business?.bookingModel || config.bookingModel,
    pricingModel: business?.pricingModel || config.pricingModel,
    pricingUnit: business?.pricingUnit || config.pricingUnit,
    inventoryType: business?.inventoryType || config.inventoryType,
    assignmentType: business?.assignmentType || config.assignmentType,
    supportsServiceInventory: Boolean(business?.supportsServiceInventory ?? config.supportsServiceInventory),
  };
}
